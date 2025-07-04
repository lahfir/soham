use anyhow::Result;
use chrono::Utc;
use directories::ProjectDirs;
use rusqlite::{params, Connection};
use std::path::PathBuf;
use std::sync::Mutex;

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
            DROP TABLE IF EXISTS time_logs;
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

    pub fn insert_window_event(
        &self,
        ts: i64,
        event_type: &str,
        window_title: &str,
        app_id: &str,
        pid: i32,
    ) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO window_activities(ts, event_type, window_title, app_id, pid) VALUES(?1, ?2, ?3, ?4, ?5)",
            params![ts, event_type, window_title, app_id, pid],
        )?;
        Ok(())
    }

    pub fn insert_activity_pulse(
        &self,
        ts: i64,
        app_id: &str,
        window_title: &str,
        duration_s: i64,
    ) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO activity_pulses(ts, app_id, window_title, duration_s) VALUES(?1, ?2, ?3, ?4)",
            params![ts, app_id, window_title, duration_s],
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

    pub fn recent_window_activities(&self, limit: i64) -> Result<Vec<WindowActivity>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT ts, event_type, window_title, app_id, pid FROM window_activities ORDER BY ts DESC LIMIT ?1",
        )?;
        let rows = stmt.query_map(params![limit], |row| {
            Ok(WindowActivity {
                ts: row.get(0)?,
                event_type: row.get(1)?,
                window_title: row.get(2)?,
                app_id: row.get(3)?,
                pid: row.get(4)?,
            })
        })?;
        let mut v = Vec::new();
        for r in rows {
            v.push(r?);
        }
        Ok(v)
    }

    pub fn recent_screenshots(&self, limit: i64) -> Result<Vec<Screenshot>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, ts, file_path, screen_id FROM screenshots ORDER BY ts DESC LIMIT ?1",
        )?;
        let rows = stmt.query_map(params![limit], |row| {
            Ok(Screenshot {
                id: row.get(0)?,
                ts: row.get(1)?,
                file_path: row.get(2)?,
                screen_id: row.get(3)?,
            })
        })?;
        let mut v = Vec::new();
        for r in rows {
            v.push(r?);
        }
        Ok(v)
    }

    pub fn recent_audit_events(&self, limit: i64) -> Result<Vec<AuditEvent>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, ts, level, message FROM audit_events ORDER BY ts DESC LIMIT ?1",
        )?;
        let rows = stmt.query_map(params![limit], |row| {
            Ok(AuditEvent {
                id: row.get(0)?,
                ts: row.get(1)?,
                level: row.get(2)?,
                message: row.get(3)?,
            })
        })?;
        let mut v = Vec::new();
        for r in rows {
            v.push(r?);
        }
        Ok(v)
    }

    pub fn get_app_usage_stats(&self) -> Result<Vec<AppStats>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT app_id, SUM(duration_s) as total_duration
            FROM activity_pulses 
            WHERE app_id IS NOT NULL AND app_id != ''
            GROUP BY app_id 
            ORDER BY total_duration DESC",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(AppStats {
                app_id: row.get(0)?,
                total_duration: row.get(1)?,
            })
        })?;
        let mut v = Vec::new();
        for r in rows {
            v.push(r?);
        }
        Ok(v)
    }

    pub fn get_daily_usage_stats(&self, days: i64) -> Result<Vec<DailyStats>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT 
                date(ts, 'unixepoch') as date,
                SUM(duration_s) as total_duration,
                COUNT(DISTINCT app_id) as unique_apps,
                (SELECT COUNT(*) FROM screenshots s WHERE date(s.ts, 'unixepoch') = date(p.ts, 'unixepoch')) as screenshot_count
            FROM activity_pulses p
            WHERE ts >= strftime('%s', 'now', '-' || ?1 || ' days')
            GROUP BY date(ts, 'unixepoch') 
            ORDER BY date DESC",
        )?;
        let rows = stmt.query_map(params![days], |row| {
            Ok(DailyStats {
                date: row.get(0)?,
                total_duration: row.get(1)?,
                unique_apps: row.get(2)?,
                screenshot_count: row.get(3)?,
            })
        })?;
        let mut v = Vec::new();
        for r in rows {
            v.push(r?);
        }
        Ok(v)
    }

    pub fn get_activity_heatmap(&self, days_ago: i64) -> Result<Vec<ActivityHeatmapData>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT
                CAST(strftime('%w', ts, 'unixepoch') AS INTEGER) as day_of_week,
                CAST(strftime('%H', ts, 'unixepoch') AS INTEGER) as hour_of_day,
                SUM(duration_s) as total_duration
            FROM activity_pulses
            WHERE ts >= strftime('%s', 'now', '-' || ?1 || ' days')
            GROUP BY day_of_week, hour_of_day",
        )?;
        let rows = stmt.query_map(params![days_ago], |row| {
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
}

#[derive(serde::Serialize, Clone)]
pub struct WindowActivity {
    pub ts: i64,
    pub event_type: String,
    pub window_title: String,
    pub app_id: String,
    pub pid: i32,
}

#[derive(serde::Serialize, Clone)]
pub struct Screenshot {
    pub id: i64,
    pub ts: i64,
    pub file_path: String,
    pub screen_id: i32,
}

#[derive(serde::Serialize, Clone)]
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
}

#[derive(serde::Serialize, Clone)]
pub struct DailyStats {
    pub date: String,
    pub total_duration: i64,
    pub unique_apps: i64,
    pub screenshot_count: i64,
}

#[derive(serde::Serialize, Clone, Debug)]
pub struct ActivityHeatmapData {
    pub day_of_week: i64,
    pub hour_of_day: i64,
    pub total_duration: i64,
} 