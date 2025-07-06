use chrono::{DateTime, Utc};
use sqlx::{Pool, Sqlite, Row};

use crate::error::{AppError, Result};
use crate::models::*;

pub struct Repository {
    pool: Pool<Sqlite>,
}

impl Repository {
    pub fn new(pool: Pool<Sqlite>) -> Self {
        Self { pool }
    }

    pub fn pool(&self) -> &Pool<Sqlite> {
        &self.pool
    }
}

impl Clone for Repository {
    fn clone(&self) -> Self {
        Self {
            pool: self.pool.clone(),
        }
    }
}

impl Repository {
    pub async fn create_session(&self, start_time: DateTime<Utc>) -> Result<i64> {
        let result = sqlx::query("INSERT INTO sessions (start_time) VALUES (?)")
            .bind(start_time.to_rfc3339())
            .execute(&self.pool)
            .await?;

        Ok(result.last_insert_rowid())
    }

    pub async fn end_session(&self, session_id: i64, end_time: DateTime<Utc>) -> Result<()> {
        sqlx::query("UPDATE sessions SET end_time = ?, duration = ? WHERE id = ?")
            .bind(end_time.to_rfc3339())
            .bind((end_time - Utc::now()).num_seconds())
            .bind(session_id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    pub async fn insert_window_activity(&self, activity: &WindowActivity) -> Result<i64> {
        let result = sqlx::query(
            r#"
            INSERT INTO window_activities (session_id, app_id, window_title, event_type, timestamp, duration, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            "#
        )
        .bind(activity.session_id)
        .bind(&activity.app_id)
        .bind(&activity.window_title)
        .bind(&activity.event_type)
        .bind(activity.timestamp.to_rfc3339())
        .bind(activity.duration)
        .bind(&activity.metadata)
        .execute(&self.pool)
        .await?;

        Ok(result.last_insert_rowid())
    }

    pub async fn get_app_stats(&self, from: DateTime<Utc>, to: DateTime<Utc>) -> Result<Vec<AppStats>> {
        let rows = sqlx::query(
            r#"
            SELECT 
                app_id,
                SUM(COALESCE(duration, 0)) as total_duration,
                COUNT(DISTINCT session_id) as session_count,
                MAX(timestamp) as last_used,
                CASE 
                    WHEN (SELECT SUM(COALESCE(duration, 0)) FROM window_activities WHERE timestamp BETWEEN ? AND ?) > 0 
                    THEN (SUM(COALESCE(duration, 0)) * 100.0 / 
                         (SELECT SUM(COALESCE(duration, 0)) FROM window_activities WHERE timestamp BETWEEN ? AND ?))
                    ELSE 0.0
                END as percentage,
                COUNT(*) as window_count
            FROM window_activities 
            WHERE timestamp BETWEEN ? AND ?
            GROUP BY app_id
            ORDER BY total_duration DESC
            "#
        )
        .bind(from.to_rfc3339())
        .bind(to.to_rfc3339())
        .bind(from.to_rfc3339())
        .bind(to.to_rfc3339())
        .bind(from.to_rfc3339())
        .bind(to.to_rfc3339())
        .fetch_all(&self.pool)
        .await?;

        let mut stats = Vec::new();
        for row in rows {
            let last_used = if let Ok(last_used_str) = row.try_get::<String, _>("last_used") {
                DateTime::parse_from_rfc3339(&last_used_str)
                    .map_err(|e| AppError::Database(sqlx::Error::Decode(Box::new(e))))?
                    .with_timezone(&Utc)
            } else {
                Utc::now()
            };

            stats.push(AppStats {
                app_id: row.get("app_id"),
                total_duration: row.get::<i64, _>("total_duration"),
                session_count: row.get::<i64, _>("session_count"),
                last_used,
                percentage: row.get::<f64, _>("percentage"),
                window_count: row.get::<i64, _>("window_count"),
            });
        }

        Ok(stats)
    }

    pub async fn get_activity_heatmap(&self, from: DateTime<Utc>, to: DateTime<Utc>) -> Result<Vec<ActivityHeatmapData>> {
        let rows = sqlx::query(
            r#"
            SELECT 
                DATE(timestamp) as date,
                CAST(strftime('%H', timestamp) as INTEGER) as hour,
                COUNT(*) as activity_count,
                SUM(COALESCE(duration, 0)) as duration
            FROM window_activities 
            WHERE timestamp BETWEEN ? AND ?
            GROUP BY DATE(timestamp), strftime('%H', timestamp)
            ORDER BY date, hour
            "#
        )
        .bind(from.to_rfc3339())
        .bind(to.to_rfc3339())
        .fetch_all(&self.pool)
        .await?;

        let mut heatmap = Vec::new();
        for row in rows {
            heatmap.push(ActivityHeatmapData {
                date: row.get("date"),
                hour: row.get("hour"),
                activity_count: row.get("activity_count"),
                duration: row.get("duration"),
            });
        }

        Ok(heatmap)
    }

    pub async fn get_activity_heatmap_month(&self, from: DateTime<Utc>, to: DateTime<Utc>) -> Result<Vec<ActivityHeatmapMonthData>> {
        let rows = sqlx::query(
            r#"
            SELECT 
                CAST(strftime('%Y', timestamp) as INTEGER) as year,
                CAST(strftime('%m', timestamp) as INTEGER) as month,
                CAST(strftime('%d', timestamp) as INTEGER) as day,
                COUNT(*) as activity_count,
                SUM(COALESCE(duration, 0)) as duration
            FROM window_activities 
            WHERE timestamp BETWEEN ? AND ?
            GROUP BY strftime('%Y', timestamp), strftime('%m', timestamp), strftime('%d', timestamp)
            ORDER BY year, month, day
            "#
        )
        .bind(from.to_rfc3339())
        .bind(to.to_rfc3339())
        .fetch_all(&self.pool)
        .await?;

        let mut heatmap = Vec::new();
        for row in rows {
            heatmap.push(ActivityHeatmapMonthData {
                year: row.get("year"),
                month: row.get("month"),
                day: row.get("day"),
                activity_count: row.get("activity_count"),
                duration: row.get("duration"),
            });
        }

        Ok(heatmap)
    }

    pub async fn get_activity_heatmap_year(&self, from: DateTime<Utc>, to: DateTime<Utc>) -> Result<Vec<ActivityHeatmapYearData>> {
        let rows = sqlx::query(
            r#"
            SELECT 
                CAST(strftime('%Y', timestamp) as INTEGER) as year,
                CAST(strftime('%m', timestamp) as INTEGER) as month,
                COUNT(*) as activity_count,
                SUM(COALESCE(duration, 0)) as duration
            FROM window_activities 
            WHERE timestamp BETWEEN ? AND ?
            GROUP BY strftime('%Y', timestamp), strftime('%m', timestamp)
            ORDER BY year, month
            "#
        )
        .bind(from.to_rfc3339())
        .bind(to.to_rfc3339())
        .fetch_all(&self.pool)
        .await?;

        let mut heatmap = Vec::new();
        for row in rows {
            heatmap.push(ActivityHeatmapYearData {
                year: row.get("year"),
                month: row.get("month"),
                activity_count: row.get("activity_count"),
                duration: row.get("duration"),
            });
        }

        Ok(heatmap)
    }

    pub async fn insert_screenshot(&self, screenshot: &Screenshot) -> Result<i64> {
        let result = sqlx::query(
            r#"
            INSERT INTO screenshots (session_id, path, timestamp, file_size, app_id, window_title)
            VALUES (?, ?, ?, ?, ?, ?)
            "#
        )
        .bind(screenshot.session_id)
        .bind(&screenshot.path)
        .bind(screenshot.timestamp.to_rfc3339())
        .bind(screenshot.file_size)
        .bind(&screenshot.app_id)
        .bind(&screenshot.window_title)
        .execute(&self.pool)
        .await?;

        Ok(result.last_insert_rowid())
    }

    pub async fn get_screenshots_in_range(&self, from: DateTime<Utc>, to: DateTime<Utc>) -> Result<Vec<Screenshot>> {
        let rows = sqlx::query("SELECT * FROM screenshots WHERE timestamp BETWEEN ? AND ? ORDER BY timestamp DESC")
            .bind(from.to_rfc3339())
            .bind(to.to_rfc3339())
            .fetch_all(&self.pool)
            .await?;

        let mut screenshots = Vec::new();
        for row in rows {
            let timestamp_str: String = row.get("timestamp");
            let timestamp = DateTime::parse_from_rfc3339(&timestamp_str)
                .map_err(|e| AppError::Database(sqlx::Error::Decode(Box::new(e))))?
                .with_timezone(&Utc);

            screenshots.push(Screenshot {
                id: row.get("id"),
                session_id: row.get("session_id"),
                path: row.get("path"),
                timestamp,
                file_size: row.get("file_size"),
                app_id: row.try_get("app_id").ok(),
                window_title: row.try_get("window_title").ok(),
            });
        }

        Ok(screenshots)
    }

    pub async fn get_recent_screenshots(&self, limit: i64) -> Result<Vec<Screenshot>> {
        let rows = sqlx::query("SELECT * FROM screenshots ORDER BY timestamp DESC LIMIT ?")
            .bind(limit)
            .fetch_all(&self.pool)
            .await?;

        let mut screenshots = Vec::new();
        for row in rows {
            let timestamp_str: String = row.get("timestamp");
            let timestamp = DateTime::parse_from_rfc3339(&timestamp_str)
                .map_err(|e| AppError::Database(sqlx::Error::Decode(Box::new(e))))?
                .with_timezone(&Utc);

            screenshots.push(Screenshot {
                id: row.get("id"),
                session_id: row.get("session_id"),
                path: row.get("path"),
                timestamp,
                file_size: row.get("file_size"),
                app_id: row.try_get("app_id").ok(),
                window_title: row.try_get("window_title").ok(),
            });
        }

        Ok(screenshots)
    }

    pub async fn get_sessions_for_date(&self, date: &str) -> Result<Vec<Session>> {
        let rows = sqlx::query(
            r#"
            SELECT 
                s.id,
                s.start_time,
                s.end_time,
                s.duration,
                COUNT(DISTINCT wa.id) as activity_count,
                COUNT(DISTINCT sc.id) as screenshot_count
            FROM sessions s
            LEFT JOIN window_activities wa ON s.id = wa.session_id
            LEFT JOIN screenshots sc ON s.id = sc.session_id
            WHERE DATE(s.start_time) = ?
            GROUP BY s.id, s.start_time, s.end_time, s.duration
            ORDER BY s.start_time DESC
            "#
        )
        .bind(date)
        .fetch_all(&self.pool)
        .await?;

        let mut sessions = Vec::new();
        for row in rows {
            let start_time_str = match row.try_get::<String, _>("start_time") {
                Ok(s) if !s.is_empty() => s,
                _ => {
                    log::warn!("Invalid or empty start_time for session id: {:?}", row.try_get::<i64, _>("id"));
                    continue;
                }
            };

            let start_time = match DateTime::parse_from_rfc3339(&start_time_str) {
                Ok(dt) => dt.with_timezone(&Utc),
                Err(e) => {
                    log::warn!("Failed to parse start_time '{}': {}", start_time_str, e);
                    continue;
                }
            };

            let end_time = match row.try_get::<String, _>("end_time") {
                Ok(end_time_str) if !end_time_str.is_empty() => {
                    match DateTime::parse_from_rfc3339(&end_time_str) {
                        Ok(dt) => Some(dt.with_timezone(&Utc)),
                        Err(e) => {
                            log::warn!("Failed to parse end_time '{}': {}", end_time_str, e);
                            None
                        }
                    }
                }
                _ => None,
            };

            sessions.push(Session {
                id: row.try_get("id").unwrap_or(-1),
                start_time,
                end_time,
                duration: row.try_get::<i64, _>("duration").ok(),
                activity_count: row.try_get("activity_count").unwrap_or(0),
                screenshot_count: row.try_get("screenshot_count").unwrap_or(0),
            });
        }

        Ok(sessions)
    }

    pub async fn get_app_lifecycle_flow(&self, date: &str) -> Result<Vec<AppLifecycleFlow>> {
        let rows = sqlx::query(
            r#"
            SELECT 
                id,
                app_id,
                window_title,
                event_type,
                timestamp,
                duration,
                ROW_NUMBER() OVER (ORDER BY timestamp) as position
            FROM window_activities
            WHERE DATE(timestamp) = ?
            ORDER BY timestamp
            "#
        )
        .bind(date)
        .fetch_all(&self.pool)
        .await?;

        let mut flows = Vec::new();
        for row in rows {
            let timestamp_str: String = row.get("timestamp");
            let timestamp = DateTime::parse_from_rfc3339(&timestamp_str)
                .map_err(|e| AppError::Database(sqlx::Error::Decode(Box::new(e))))?
                .with_timezone(&Utc);

            flows.push(AppLifecycleFlow {
                id: row.get("id"),
                app_id: row.get("app_id"),
                window_title: row.get("window_title"),
                event_type: row.get("event_type"),
                timestamp,
                duration: row.get("duration"),
                position: row.get("position"),
            });
        }

        Ok(flows)
    }

    pub async fn get_session_flow(&self, session_id: i64) -> Result<Vec<AppLifecycleFlow>> {
        let rows = sqlx::query(
            r#"
            SELECT 
                id,
                app_id,
                window_title,
                event_type,
                timestamp,
                duration,
                ROW_NUMBER() OVER (ORDER BY timestamp) as position
            FROM window_activities
            WHERE session_id = ?
            ORDER BY timestamp
            "#
        )
        .bind(session_id)
        .fetch_all(&self.pool)
        .await?;

        let mut flows = Vec::new();
        for row in rows {
            let timestamp_str: String = row.get("timestamp");
            let timestamp = DateTime::parse_from_rfc3339(&timestamp_str)
                .map_err(|e| AppError::Database(sqlx::Error::Decode(Box::new(e))))?
                .with_timezone(&Utc);

            flows.push(AppLifecycleFlow {
                id: row.get("id"),
                app_id: row.get("app_id"),
                window_title: row.get("window_title"),
                event_type: row.get("event_type"),
                timestamp,
                duration: row.get("duration"),
                position: row.get("position"),
            });
        }

        Ok(flows)
    }

    pub async fn get_unified_timeline_events(&self, from: DateTime<Utc>, to: DateTime<Utc>) -> Result<Vec<TimelineEvent>> {
        let rows = sqlx::query(
            r#"
            SELECT 
                timestamp,
                event_type,
                app_id,
                window_title,
                metadata
            FROM window_activities
            WHERE timestamp BETWEEN ? AND ?
            ORDER BY timestamp DESC
            "#
        )
        .bind(from.to_rfc3339())
        .bind(to.to_rfc3339())
        .fetch_all(&self.pool)
        .await?;

        let mut events = Vec::new();
        for row in rows {
            let timestamp_str: String = row.get("timestamp");
            let timestamp = DateTime::parse_from_rfc3339(&timestamp_str)
                .map_err(|e| AppError::Database(sqlx::Error::Decode(Box::new(e))))?
                .with_timezone(&Utc);

            let event_type_str: String = row.get("event_type");
            if let Ok(event_type) = event_type_str.parse::<EventType>() {
                let metadata_str: Option<String> = row.get("metadata");
                let metadata = metadata_str.and_then(|m| serde_json::from_str(&m).ok());

                events.push(TimelineEvent {
                    timestamp,
                    event_type,
                    app_id: row.get("app_id"),
                    window_title: row.get("window_title"),
                    metadata,
                });
            }
        }

        Ok(events)
    }

    pub async fn get_unified_timeline_events_for_session(&self, session_id: i64) -> Result<Vec<TimelineEvent>> {
        let rows = sqlx::query(
            r#"
            SELECT 
                timestamp,
                event_type,
                app_id,
                window_title,
                metadata
            FROM window_activities
            WHERE session_id = ?
            ORDER BY timestamp DESC
            "#
        )
        .bind(session_id)
        .fetch_all(&self.pool)
        .await?;

        let mut events = Vec::new();
        for row in rows {
            let timestamp_str: String = row.get("timestamp");
            let timestamp = DateTime::parse_from_rfc3339(&timestamp_str)
                .map_err(|e| AppError::Database(sqlx::Error::Decode(Box::new(e))))?
                .with_timezone(&Utc);

            let event_type_str: String = row.get("event_type");
            if let Ok(event_type) = event_type_str.parse::<EventType>() {
                let metadata_str: Option<String> = row.get("metadata");
                let metadata = metadata_str.and_then(|m| serde_json::from_str(&m).ok());

                events.push(TimelineEvent {
                    timestamp,
                    event_type,
                    app_id: row.get("app_id"),
                    window_title: row.get("window_title"),
                    metadata,
                });
            }
        }

        Ok(events)
    }
}