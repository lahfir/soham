use std::sync::Arc;
use std::time::Duration;
use tauri::async_runtime::spawn;
use tokio::time::interval;
use tauri::{AppHandle, Emitter};
use serde_json::json;
use crate::db::Db;

pub struct RealtimeService;

impl RealtimeService {
    pub fn spawn(db: Arc<Db>, app_handle: AppHandle) {
        spawn(async move {
            let mut interval = interval(Duration::from_secs(2));
            
            loop {
                interval.tick().await;
                
                if let Ok(dashboard_data) = Self::get_dashboard_snapshot(&db).await {
                    let _ = app_handle.emit("dashboard-update", dashboard_data);
                }
            }
        });
    }
    
    async fn get_dashboard_snapshot(db: &Arc<Db>) -> Result<serde_json::Value, Box<dyn std::error::Error>> {
        let app_stats = db.get_app_usage_stats().unwrap_or_default();
        let daily_stats = db.get_daily_usage_stats(1).unwrap_or_default();
        let recent_activities = db.recent_window_activities(10).unwrap_or_default();
        let recent_screenshots = db.recent_screenshots(5).unwrap_or_default();
        
        Ok(json!({
            "app_stats": app_stats,
            "daily_stats": daily_stats,
            "recent_activities": recent_activities,
            "recent_screenshots": recent_screenshots,
            "timestamp": chrono::Utc::now().timestamp()
        }))
    }
} 