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
            CREATE TABLE IF NOT EXISTS time_logs (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                app_id      TEXT,
                window_title TEXT,
                focus_start INTEGER,
                focus_end   INTEGER,
                duration    INTEGER
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

    pub fn insert_time_log(
        &self,
        app_id: &str,
        window_title: &str,
        focus_start: i64,
        focus_end: i64,
        duration: i64,
    ) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO time_logs(app_id, window_title, focus_start, focus_end, duration) VALUES(?1, ?2, ?3, ?4, ?5)",
            params![app_id, window_title, focus_start, focus_end, duration],
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

    pub fn recent_time_logs(&self, limit: i64) -> Result<Vec<TimeLog>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, app_id, window_title, focus_start, focus_end, duration FROM time_logs ORDER BY focus_start DESC LIMIT ?1",
        )?;
        let rows = stmt.query_map(params![limit], |row| {
            Ok(TimeLog {
                id: row.get(0)?,
                app_id: row.get(1)?,
                window_title: row.get(2)?,
                focus_start: row.get(3)?,
                focus_end: row.get(4)?,
                duration: row.get(5)?,
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
            "SELECT app_id, SUM(duration) as total_duration, COUNT(*) as session_count, AVG(duration) as avg_session_duration FROM time_logs GROUP BY app_id ORDER BY total_duration DESC",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(AppStats {
                app_id: row.get(0)?,
                total_duration: row.get(1)?,
                session_count: row.get(2)?,
                avg_session_duration: row.get(3)?,
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
                date(focus_start, 'unixepoch') as date,
                SUM(duration) as total_duration,
                COUNT(DISTINCT app_id) as unique_apps,
                (SELECT COUNT(*) FROM screenshots WHERE date(ts, 'unixepoch') = date(focus_start, 'unixepoch')) as screenshot_count
            FROM time_logs 
            WHERE focus_start >= strftime('%s', 'now', '-' || ?1 || ' days')
            GROUP BY date(focus_start, 'unixepoch') 
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

    pub fn get_stats_by_date(&self, date: &str) -> Result<serde_json::Value> {
        let conn = self.conn.lock().unwrap();
        
        let mut app_stats_stmt = conn.prepare(
            "SELECT app_id, SUM(duration) as total_duration, COUNT(*) as session_count, AVG(duration) as avg_session_duration 
             FROM time_logs 
             WHERE date(focus_start, 'unixepoch') = ?1 
             GROUP BY app_id 
             ORDER BY total_duration DESC"
        )?;
        
        let app_stats_rows = app_stats_stmt.query_map(params![date], |row| {
            Ok(serde_json::json!({
                "app_id": row.get::<_, String>(0)?,
                "total_duration": row.get::<_, i64>(1)?,
                "session_count": row.get::<_, i64>(2)?,
                "avg_session_duration": row.get::<_, i64>(3)?
            }))
        })?;
        
        let mut app_stats = Vec::new();
        for row in app_stats_rows {
            app_stats.push(row?);
        }
        
        let mut activities_stmt = conn.prepare(
            "SELECT ts, event_type, window_title, app_id, pid 
             FROM window_activities 
             WHERE date(ts, 'unixepoch') = ?1 
             ORDER BY ts DESC"
        )?;
        
        let activities_rows = activities_stmt.query_map(params![date], |row| {
            Ok(serde_json::json!({
                "ts": row.get::<_, i64>(0)?,
                "event_type": row.get::<_, String>(1)?,
                "window_title": row.get::<_, String>(2)?,
                "app_id": row.get::<_, String>(3)?,
                "pid": row.get::<_, i32>(4)?
            }))
        })?;
        
        let mut activities = Vec::new();
        for row in activities_rows {
            activities.push(row?);
        }
        
        let mut screenshots_stmt = conn.prepare(
            "SELECT id, ts, file_path, screen_id 
             FROM screenshots 
             WHERE date(ts, 'unixepoch') = ?1 
             ORDER BY ts DESC"
        )?;
        
        let screenshots_rows = screenshots_stmt.query_map(params![date], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, i64>(0)?,
                "ts": row.get::<_, i64>(1)?,
                "file_path": row.get::<_, String>(2)?,
                "screen_id": row.get::<_, i32>(3)?
            }))
        })?;
        
        let mut screenshots = Vec::new();
        for row in screenshots_rows {
            screenshots.push(row?);
        }
        
        Ok(serde_json::json!({
            "app_stats": app_stats,
            "activities": activities,
            "screenshots": screenshots,
            "date": date
        }))
    }

    pub fn get_app_metadata(&self, app_id: &str) -> Result<serde_json::Value> {
        Ok(serde_json::json!({
            "app_id": app_id,
            "icon": format!("/icons/{}.png", app_id.to_lowercase()),
            "display_name": app_id,
            "category": "productivity"
        }))
    }
}

#[derive(serde::Serialize)]
pub struct WindowActivity {
    pub ts: i64,
    pub event_type: String,
    pub window_title: String,
    pub app_id: String,
    pub pid: i32,
}

#[derive(serde::Serialize)]
pub struct Screenshot {
    pub id: i64,
    pub ts: i64,
    pub file_path: String,
    pub screen_id: i32,
}

#[derive(serde::Serialize)]
pub struct TimeLog {
    pub id: i64,
    pub app_id: String,
    pub window_title: String,
    pub focus_start: i64,
    pub focus_end: i64,
    pub duration: i64,
}

#[derive(serde::Serialize)]
pub struct AuditEvent {
    pub id: i64,
    pub ts: i64,
    pub level: String,
    pub message: String,
}

#[derive(serde::Serialize)]
pub struct AppStats {
    pub app_id: String,
    pub total_duration: i64,
    pub session_count: i64,
    pub avg_session_duration: i64,
}

#[derive(serde::Serialize)]
pub struct DailyStats {
    pub date: String,
    pub total_duration: i64,
    pub unique_apps: i64,
    pub screenshot_count: i64,
} 