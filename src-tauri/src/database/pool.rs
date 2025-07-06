use sqlx::{Pool, Sqlite, SqlitePool};
use crate::error::Result;

pub struct DatabasePool {
    pool: Pool<Sqlite>,
}

impl DatabasePool {
    pub async fn new(database_url: &str) -> Result<Self> {
        let pool = SqlitePool::connect_with(
            sqlx::sqlite::SqliteConnectOptions::new()
                .filename(database_url)
                .create_if_missing(true)
                .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal)
                .synchronous(sqlx::sqlite::SqliteSynchronous::Normal)
                .foreign_keys(true)
                .pragma("cache_size", "-64000")
                .pragma("temp_store", "memory")
                .pragma("mmap_size", "268435456")
        )
        .await?;

        let database_pool = Self { pool };
        database_pool.initialize_schema().await?;
        Ok(database_pool)
    }

    pub fn pool(&self) -> &Pool<Sqlite> {
        &self.pool
    }

    pub async fn close(&self) {
        self.pool.close().await;
    }

    async fn initialize_schema(&self) -> Result<()> {
        // For now, manually create tables instead of using migrations
        // to avoid the complexity of setting up sqlx-cli
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                start_time TEXT NOT NULL,
                end_time TEXT,
                duration INTEGER,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            "#
        ).execute(&self.pool).await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS window_activities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER NOT NULL,
                app_id TEXT NOT NULL,
                window_title TEXT NOT NULL,
                event_type TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                duration INTEGER,
                metadata TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
            );
            "#
        ).execute(&self.pool).await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS screenshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER NOT NULL,
                path TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                app_id TEXT,
                window_title TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
            );
            "#
        ).execute(&self.pool).await?;

        // Create indexes
        let indexes = [
            "CREATE INDEX IF NOT EXISTS idx_window_activities_timestamp ON window_activities(timestamp);",
            "CREATE INDEX IF NOT EXISTS idx_window_activities_session_id ON window_activities(session_id);",
            "CREATE INDEX IF NOT EXISTS idx_window_activities_app_id ON window_activities(app_id);",
            "CREATE INDEX IF NOT EXISTS idx_window_activities_event_type ON window_activities(event_type);",
            "CREATE INDEX IF NOT EXISTS idx_screenshots_timestamp ON screenshots(timestamp);",
            "CREATE INDEX IF NOT EXISTS idx_screenshots_session_id ON screenshots(session_id);",
            "CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time);",
        ];

        for index_sql in &indexes {
            sqlx::query(index_sql).execute(&self.pool).await?;
        }

        Ok(())
    }
}

impl Clone for DatabasePool {
    fn clone(&self) -> Self {
        Self {
            pool: self.pool.clone(),
        }
    }
}