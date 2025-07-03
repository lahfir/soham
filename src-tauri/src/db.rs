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
}

#[derive(serde::Serialize)]
pub struct WindowActivity {
    pub ts: i64,
    pub event_type: String,
    pub window_title: String,
    pub app_id: String,
    pub pid: i32,
} 