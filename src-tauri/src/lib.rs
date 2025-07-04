    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::sync::Arc;
use tauri::{Builder, State, Emitter};
use chrono::{Utc, Duration};

mod config;
mod db;
mod events;
mod screenshot;
mod state;
mod icon_extractor;
mod system_stats;

// Platform-specific module for real-time event listening
#[cfg(target_os = "macos")]
mod event_listener;

// Fallback poller for non-macOS platforms
#[cfg(not(target_os = "macos"))]
mod activity_poller;

use config::Config;
use db::Db;
use screenshot::ScreenshotService;
use state::AppState;

#[derive(serde::Serialize, Clone)]
pub struct AppLifecycleEvent {
    ts: i64,
    app_id: String,
    event_type: String,
}

#[derive(serde::Serialize, Clone)]
#[serde(tag = "type", content = "payload")]
pub enum TimelineEvent {
    AppTransition { from_app: String, to_app: String, ts: i64, transition_type: String },
    WindowEvent { event_type: String, window_title: String, app_id: String, ts: i64 },
    Screenshot { path: String, ts: i64 },
}

#[derive(serde::Serialize, Clone)]
pub struct HistoricalEvent {
    ts: i64,
    event_type: String, // e.g., 'activity', 'screenshot', 'app_open', 'app_close'
    details: serde_json::Value,
}

#[derive(serde::Serialize, Clone)]
pub struct AppStat {
    // Define the structure of AppStat
}

#[derive(serde::Serialize, Clone)]
pub struct DashboardData {
    app_stats: Vec<db::AppStats>,
    heatmap_data: Vec<db::ActivityHeatmapData>,
}

#[derive(serde::Serialize, Clone)]
pub struct HeatmapResponse {
    week_data: Vec<db::ActivityHeatmapData>,
    month_data: Vec<db::ActivityHeatmapMonthData>,
    year_data: Vec<db::ActivityHeatmapYearData>,
}

#[tauri::command]
fn pause(app_state: State<AppState>) {
    if let Ok(mut p) = app_state.paused.lock() {
        *p = true;
    }
}

#[tauri::command]
fn resume(app_state: State<AppState>) {
    if let Ok(mut p) = app_state.paused.lock() {
        *p = false;
    }
}

#[derive(serde::Serialize)]
struct Status {
    paused: bool,
}

#[tauri::command]
fn status(app_state: State<AppState>) -> Status {
    let paused = *app_state.paused.lock().unwrap();
    Status { paused }
}

#[tauri::command]
fn get_dashboard_data(from: i64, to: i64, app_state: State<AppState>) -> Result<DashboardData, String> {
    let db = &app_state.db;
    let app_stats = db.get_app_stats(from, to).map_err(|e| e.to_string())?;
    let heatmap_data = db.get_activity_heatmap(from, to).map_err(|e| e.to_string())?;
    Ok(DashboardData {
        app_stats,
        heatmap_data,
    })
}

#[tauri::command]
fn get_heatmap_data(from: i64, to: i64, range_type: String, app_state: State<AppState>) -> Result<serde_json::Value, String> {
    let db = &app_state.db;
    
    match range_type.as_str() {
        "week" => {
            let data = db.get_activity_heatmap_week(from, to).map_err(|e| e.to_string())?;
            Ok(serde_json::to_value(data).map_err(|e| e.to_string())?)
        }
        "month" => {
            let data = db.get_activity_heatmap_month(from, to).map_err(|e| e.to_string())?;
            Ok(serde_json::to_value(data).map_err(|e| e.to_string())?)
        }
        "year" => {
            let data = db.get_activity_heatmap_year(from, to).map_err(|e| e.to_string())?;
            Ok(serde_json::to_value(data).map_err(|e| e.to_string())?)
        }
        _ => Err("Invalid range type".to_string())
    }
}

#[tauri::command]
async fn get_app_icon(app_id: String) -> Result<String, String> {
    match tauri::async_runtime::spawn_blocking(move || {
        icon_extractor::get_app_icon_base64(&app_id)
            .map_err(|e| e.to_string())
    }).await {
        Ok(result) => result,
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn get_app_stats(from: i64, to: i64, app_state: State<AppState>) -> Result<Vec<db::AppStats>, String> {
    app_state.db.get_app_stats(from, to).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_app_lifecycle_events(app_id: String, app_state: State<AppState>) -> Result<Vec<db::AppLifecycleFlow>, String> {
    app_state.db.get_app_lifecycle_flow(&app_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_app_lifecycle_flow(date: String, app_state: State<AppState>) -> Result<Vec<db::AppLifecycleFlow>, String> {
    app_state.db.get_app_lifecycle_flow(&date).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_historical_events(start_ts: i64, end_ts: i64, app_state: State<AppState>) -> Result<Vec<HistoricalEvent>, String> {
    app_state.db.get_historical_events(start_ts, end_ts).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_recent_screenshots(app_state: State<AppState>) -> Result<Vec<db::Screenshot>, String> {
    app_state.db.recent_screenshots(10).map_err(|e| e.to_string())
}

#[tauri::command]
fn current_session_id(app_state: State<AppState>) -> i64 {
    *app_state.current_session.lock().unwrap()
}

#[tauri::command]
fn get_session_flow(app_state: State<AppState>) -> Result<Vec<db::AppLifecycleFlow>, String> {
    let session_id = *app_state.current_session.lock().unwrap();
    app_state.db.get_session_flow(session_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_unified_timeline_events(from: i64, to: i64, app_state: State<AppState>) -> Result<Vec<TimelineEvent>, String> {
    app_state.db.get_unified_timeline_events(from, to).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_sessions_for_date(date: String, app_state: State<AppState>) -> Result<Vec<db::Session>, String> {
    app_state.db.get_sessions_for_date(&date).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_unified_timeline_events_for_session(session_id: i64, app_state: State<AppState>) -> Result<Vec<TimelineEvent>, String> {
    app_state.db.get_unified_timeline_events_for_session(session_id).map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_screenshots_in_range(from: i64, to: i64, app_state: State<'_, AppState>) -> Result<Vec<db::Screenshot>, String> {
    let screenshots = app_state.db.get_screenshots_in_range(from, to).map_err(|e| e.to_string())?;

    let base64_screenshots = tauri::async_runtime::spawn(async move {
        use base64::engine::Engine;
        let mut results = Vec::new();
        for mut shot in screenshots {
            if let Ok(bytes) = tokio::fs::read(&shot.path).await {
                shot.path = base64::engine::general_purpose::STANDARD.encode(bytes);
                results.push(shot);
            }
        }
        results
    }).await.map_err(|e| e.to_string())?;

    Ok(base64_screenshots)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db = Arc::new(Db::new().expect("db init failed"));
    let config = Config::load().expect("config load");
    let app_state = AppState::new(Arc::clone(&db));

    // create session
    let session_id = db.insert_session(Utc::now().timestamp()).expect("session create");
    {
        let mut s = app_state.current_session.lock().unwrap();
        *s = session_id;
    }

    Builder::default()
        .manage(app_state.clone())
        .invoke_handler(tauri::generate_handler![
            pause, 
            resume, 
            status,
            get_dashboard_data,
            get_heatmap_data,
            get_app_icon,
            get_app_stats,
            get_app_lifecycle_events,
            get_app_lifecycle_flow,
            get_historical_events,
            get_recent_screenshots,
            system_stats::get_system_stats,
            current_session_id,
            get_session_flow,
            get_unified_timeline_events,
            get_sessions_for_date,
            get_unified_timeline_events_for_session,
            get_screenshots_in_range,
        ])
        .setup(move |app| {
            let app_handle = app.handle().clone();
            let app_state_clone = app_state.clone();

            // Spawn the screenshot daemon with session awareness
            let db_clone = app_state_clone.db.clone();
            let session_clone = app_state_clone.current_session.clone();
            ScreenshotService::spawn(db_clone, session_clone, app_handle.clone(), config.screenshot_interval_secs);

            // Spawn the appropriate activity tracker based on the OS
            #[cfg(target_os = "macos")]
            event_listener::spawn(app_state.clone(), app_handle.clone());

            #[cfg(not(target_os = "macos"))]
            {
                println!("⚠️ Using polling mechanism for activity tracking on non-macOS platform.");
                activity_poller::ActivityPoller::spawn(app_state.clone(), app_handle.clone());
            }

            let handle = app_handle.clone();
            tauri::async_runtime::spawn(async move {
                let mut interval = tokio::time::interval(std::time::Duration::from_secs(5));
                loop {
                    interval.tick().await;
                    let now = Utc::now();
                    let yesterday = now - Duration::days(1);
                    let to = now.timestamp();
                    let from = yesterday.timestamp();
                    
                    let db = &app_state_clone.db;
                    if let (Ok(app_stats), Ok(heatmap_data)) = (db.get_app_stats(from, to), db.get_activity_heatmap(from, to)) {
                        let data = DashboardData { app_stats, heatmap_data };
                        if let Err(e) = handle.emit("dashboard-update", data) {
                            log::error!("Failed to emit dashboard-update: {}", e);
                        }
                    }
                }
            });
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
