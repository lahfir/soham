use anyhow::Result;
use chrono::Utc;
use directories::ProjectDirs;
use rusqlite::{params, Connection};
use std::path::PathBuf;
use std::sync::Mutex;
use serde_json;

/// SQLite wrapper handling all persistence
pub struct Db {
    conn: Mutex<Connection>,
}

impl Db {
    pub fn new() -> Result<Self> {
        let path = Self::db_path();
        std::fs::create_dir_all(path.parent().unwrap())?;
        let conn = Connection::open(path)?;
        conn.pragma_update(None, "journal_mode", &"WAL")?;
        Self::init_schema(&conn)?;
        Ok(Self { conn: Mutex::new(conn) })
    }

    fn db_path() -> PathBuf {
        ProjectDirs::from("com", "ExampleCorp", "TrackerAgent")
            .expect("cannot locate project dirs")
            .data_local_dir()
            .join("db.sqlite")
    }

    fn init_schema(conn: &Connection) -> Result<()> {
        conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS screenshots (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                ts          INTEGER NOT NULL,
                file_path   TEXT NOT NULL,
                screen_id   INTEGER
            );
            CREATE TABLE IF NOT EXISTS window_activities (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                ts          INTEGER NOT NULL,
                event_type  TEXT NOT NULL,
                window_title TEXT,
                app_id      TEXT,
                pid         INTEGER
            );
            CREATE TABLE IF NOT EXISTS activity_pulses (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                ts          INTEGER NOT NULL,
                app_id      TEXT,
                window_title TEXT,
                duration_s  INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS audit_events (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                ts          INTEGER NOT NULL,
                level       TEXT NOT NULL,
                message     TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS meta (
                key   TEXT PRIMARY KEY,
                value TEXT
            );
            CREATE TABLE IF NOT EXISTS app_lifecycle_events (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                ts          INTEGER NOT NULL,
                app_id      TEXT NOT NULL,
                event_type  TEXT NOT NULL -- 'open' or 'close'
            );
            CREATE TABLE IF NOT EXISTS app_transitions (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                ts          INTEGER NOT NULL,
                from_app_id TEXT NOT NULL,
                to_app_id   TEXT NOT NULL,
                transition_type TEXT NOT NULL -- 'switch' or 'new_open'
            );
            CREATE TABLE IF NOT EXISTS sessions (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                start_ts    INTEGER NOT NULL,
                end_ts      INTEGER
            );
            DROP TABLE IF EXISTS time_logs;
            /* Attempt to add session_id columns if they don't exist */
            PRAGMA foreign_keys = OFF;
            BEGIN TRANSACTION;
            ALTER TABLE activity_pulses ADD COLUMN session_id INTEGER;
            ALTER TABLE app_transitions ADD COLUMN session_id INTEGER;
            ALTER TABLE window_activities ADD COLUMN session_id INTEGER;
            COMMIT;
            PRAGMA foreign_keys = ON;
        "#,
        )?;
        Ok(())
    }

    pub fn insert_screenshot(&self, ts: i64, path: &str, screen_id: i32) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO screenshots(ts, file_path, screen_id) VALUES(?1, ?2, ?3)",
            params![ts, path, screen_id],
        )?;
        Ok(())
    }

    pub fn insert_session(&self, start_ts: i64) -> Result<i64> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO sessions(start_ts) VALUES(?1)",
            params![start_ts],
        )?;
        Ok(conn.last_insert_rowid())
    }

    /// Updates the end timestamp of a session when it finishes.
    pub fn end_session(&self, session_id: i64, end_ts: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE sessions SET end_ts = ?1 WHERE id = ?2",
            params![end_ts, session_id],
        )?;
        Ok(())
    }

    pub fn insert_activity_pulse(
        &self,
        session_id: i64,
        ts: i64,
        app_id: &str,
        window_title: &str,
        duration_s: i64,
    ) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO activity_pulses(session_id, ts, app_id, window_title, duration_s) VALUES(?1, ?2, ?3, ?4, ?5)",
            params![session_id, ts, app_id, window_title, duration_s],
        )?;
        Ok(())
    }

    pub fn insert_audit(&self, level: &str, message: &str) -> Result<()> {
        let ts = Utc::now().timestamp();
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO audit_events(ts, level, message) VALUES(?1, ?2, ?3)",
            params![ts, level, message],
        )?;
        Ok(())
    }

    pub fn insert_app_transition(&self, session_id: i64, from_app_id: &str, to_app_id: &str, transition_type: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO app_transitions (session_id, ts, from_app_id, to_app_id, transition_type) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![session_id, Utc::now().timestamp(), from_app_id, to_app_id, transition_type],
        )?;
        Ok(())
    }

    pub fn insert_window_activity(&self, session_id: i64, ts: i64, event_type: &str, window_title: &str, app_id: &str, pid: i32) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO window_activities(session_id, ts, event_type, window_title, app_id, pid) VALUES(?1, ?2, ?3, ?4, ?5, ?6)",
            params![session_id, ts, event_type, window_title, app_id, pid],
        )?;
        Ok(())
    }

    pub fn recent_screenshots(&self, limit: u32) -> Result<Vec<Screenshot>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT path, ts FROM screenshots ORDER BY ts DESC LIMIT ?1")?;
        let rows = stmt.query_map(params![limit], |row| {
            Ok(Screenshot {
                path: row.get(0)?,
                ts: row.get(1)?,
            })
        })?;
        let mut v = Vec::new();
        for r in rows {
            v.push(r?);
        }
        Ok(v)
    }

    pub fn get_app_stats(&self, from: i64, to: i64) -> Result<Vec<AppStats>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
           "SELECT
                p.app_id,
                SUM(p.duration_s) as total_duration,
                (
                    SELECT COUNT(*) FROM app_lifecycle_events ale 
                    WHERE ale.app_id = p.app_id 
                    AND ale.event_type = 'app_open' 
                    AND ale.ts BETWEEN ?1 AND ?2
                ) as session_count,
                MAX(p.ts) as last_seen
            FROM activity_pulses p
            WHERE p.app_id IS NOT NULL AND p.app_id != '' AND p.ts BETWEEN ?1 AND ?2
            GROUP BY p.app_id
            ORDER BY total_duration DESC",
        )?;
        let rows = stmt.query_map(params![from, to], |row| {
            let session_count: i64 = row.get(2)?;
            let total_duration: i64 = row.get(1)?;
            let avg_duration = if session_count > 0 { total_duration / session_count } else { total_duration };

            Ok(AppStats {
                app_id: row.get(0)?,
                total_duration,
                session_count,
                avg_duration,
                last_seen: row.get(3)?,
            })
        })?;
        let mut v = Vec::new();
        for r in rows {
            v.push(r?);
        }
        Ok(v)
    }

    pub fn get_activity_heatmap(&self, from: i64, to: i64) -> Result<Vec<ActivityHeatmapData>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT
                CAST(strftime('%w', datetime(ts, 'unixepoch')) AS INTEGER) as day_of_week,
                CAST(strftime('%H', datetime(ts, 'unixepoch')) AS INTEGER) as hour_of_day,
                SUM(duration_s) as total_duration
            FROM activity_pulses
            WHERE ts BETWEEN ?1 AND ?2
            GROUP BY day_of_week, hour_of_day",
        )?;
        let rows = stmt.query_map(params![from, to], |row| {
            Ok(ActivityHeatmapData {
                day_of_week: row.get(0)?,
                hour_of_day: row.get(1)?,
                total_duration: row.get(2)?,
            })
        })?;
        let mut v = Vec::new();
        for r in rows {
            v.push(r?);
        }
        Ok(v)
    }
    
    pub fn get_activity_heatmap_week(&self, from: i64, to: i64) -> Result<Vec<ActivityHeatmapData>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT
                CAST(strftime('%w', datetime(ts, 'unixepoch')) AS INTEGER) as day_of_week,
                CAST(strftime('%H', datetime(ts, 'unixepoch')) AS INTEGER) as hour_of_day,
                SUM(duration_s) as total_duration
            FROM activity_pulses
            WHERE ts BETWEEN ?1 AND ?2
            GROUP BY day_of_week, hour_of_day",
        )?;
        let rows = stmt.query_map(params![from, to], |row| {
            Ok(ActivityHeatmapData {
                day_of_week: row.get(0)?,
                hour_of_day: row.get(1)?,
                total_duration: row.get(2)?,
            })
        })?;
        let mut v = Vec::new();
        for r in rows {
            v.push(r?);
        }
        Ok(v)
    }

    pub fn get_activity_heatmap_month(&self, from: i64, to: i64) -> Result<Vec<ActivityHeatmapMonthData>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT
                CAST(strftime('%d', datetime(ts, 'unixepoch')) AS INTEGER) as day_of_month,
                CAST(strftime('%H', datetime(ts, 'unixepoch')) AS INTEGER) as hour_of_day,
                SUM(duration_s) as total_duration
            FROM activity_pulses
            WHERE ts BETWEEN ?1 AND ?2
            GROUP BY day_of_month, hour_of_day",
        )?;
        let rows = stmt.query_map(params![from, to], |row| {
            Ok(ActivityHeatmapMonthData {
                day_of_month: row.get(0)?,
                hour_of_day: row.get(1)?,
                total_duration: row.get(2)?,
            })
        })?;
        let mut v = Vec::new();
        for r in rows {
            v.push(r?);
        }
        Ok(v)
    }
    
    pub fn get_activity_heatmap_year(&self, from: i64, to: i64) -> Result<Vec<ActivityHeatmapYearData>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT
                CAST(strftime('%j', datetime(ts, 'unixepoch')) AS INTEGER) as day_of_year,
                CAST(strftime('%H', datetime(ts, 'unixepoch')) AS INTEGER) as hour_of_day,
                SUM(duration_s) as total_duration
            FROM activity_pulses
            WHERE ts BETWEEN ?1 AND ?2
            GROUP BY day_of_year, hour_of_day",
        )?;
        let rows = stmt.query_map(params![from, to], |row| {
            Ok(ActivityHeatmapYearData {
                day_of_year: row.get(0)?,
                hour_of_day: row.get(1)?,
                total_duration: row.get(2)?,
            })
        })?;
        let mut v = Vec::new();
        for r in rows {
            v.push(r?);
        }
        Ok(v)
    }

    pub fn get_historical_events(&self, start_ts: i64, end_ts: i64) -> Result<Vec<crate::HistoricalEvent>> {
        let conn = self.conn.lock().unwrap();
        // Union of screenshots and app transitions
        let mut stmt = conn.prepare(
            "SELECT 'screenshot' as type, s.ts, s.file_path as content, '' as to_app, '' as transition_type
            FROM screenshots s
            WHERE s.ts BETWEEN ?1 AND ?2
            UNION ALL
            SELECT 'transition' as type, t.ts, t.from_app_id as content, t.to_app_id, t.transition_type
            FROM app_transitions t
            WHERE t.ts BETWEEN ?1 AND ?2
            ORDER BY ts"
        )?;

        let rows = stmt.query_map(params![start_ts, end_ts], |row| {
            let details_str: String = row.get(2)?;
            Ok(crate::HistoricalEvent {
                ts: row.get(0)?,
                event_type: row.get(1)?,
                details: serde_json::from_str(&details_str).unwrap_or(serde_json::Value::Null),
            })
        })?;

        let mut events = Vec::new();
        for row in rows {
            events.push(row?);
        }

        Ok(events)
    }
    
    pub fn get_app_lifecycle_flow(&self, date: &str) -> Result<Vec<AppLifecycleFlow>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT from_app_id, to_app_id, transition_type, strftime('%H:%M:%S', ts, 'unixepoch') as time, ts
            FROM app_transitions
            WHERE date(ts, 'unixepoch') = ?1
            ORDER BY ts",
        )?;
        let rows = stmt.query_map(params![date], |row| {
            Ok(AppLifecycleFlow {
                from_app: row.get(0)?,
                to_app: row.get(1)?,
                transition_type: row.get(2)?,
                time: row.get(3)?,
                created_at: row.get(4)?,
            })
        })?;
        let mut v = Vec::new();
        for r in rows {
            v.push(r?);
        }
        Ok(v)
    }

    pub fn get_session_flow(&self, session_id: i64) -> Result<Vec<AppLifecycleFlow>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT from_app_id, to_app_id, transition_type, strftime('%H:%M:%S', ts, 'unixepoch') as time, ts
            FROM app_transitions
            WHERE session_id = ?1
            ORDER BY ts",
        )?;
        let rows = stmt.query_map(params![session_id], |row| {
            Ok(AppLifecycleFlow {
                from_app: row.get(0)?,
                to_app: row.get(1)?,
                transition_type: row.get(2)?,
                time: row.get(3)?,
                created_at: row.get(4)?,
            })
        })?;
        let mut v = Vec::new();
        for r in rows {
            v.push(r?);
        }
        Ok(v)
    }
}

#[derive(serde::Serialize)]
pub struct Screenshot {
    pub path: String,
    pub ts: i64,
}

#[derive(serde::Serialize)]
pub struct AuditEvent {
    pub id: i64,
    pub ts: i64,
    pub level: String,
    pub message: String,
}

#[derive(serde::Serialize, Clone)]
pub struct AppStats {
    pub app_id: String,
    pub total_duration: i64,
    pub session_count: i64,
    pub avg_duration: i64,
    pub last_seen: i64,
}

#[derive(serde::Serialize, Clone)]
pub struct ActivityHeatmapData {
    pub day_of_week: i64,
    pub hour_of_day: i64,
    pub total_duration: i64,
}

#[derive(serde::Serialize, Clone)]
pub struct ActivityHeatmapMonthData {
    pub day_of_month: i64,
    pub hour_of_day: i64,
    pub total_duration: i64,
}

#[derive(serde::Serialize, Clone)]
pub struct ActivityHeatmapYearData {
    pub day_of_year: i64,
    pub hour_of_day: i64,
    pub total_duration: i64,
}

#[derive(serde::Serialize, Clone, Debug)]
pub struct AppLifecycleFlow {
    pub from_app: String,
    pub to_app: String,
    pub transition_type: String,
    pub time: String,
    pub created_at: i64,
}

#[derive(serde::Serialize, Clone, Debug)]
pub struct AppUsage {
    pub app_name: String,
    pub duration: i64,
} 