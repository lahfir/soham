// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::sync::Arc;
use tauri::{Builder, State, AppHandle, Emitter};
use serde_json::json;

mod config;
mod db;
mod events;
mod focus;
mod screenshot;
mod state;
mod watchdog;
mod realtime;

use config::Config;
use db::Db;
use events::EventPoller;
use focus::FocusTracker;
use screenshot::ScreenshotService;
use state::AppState;
use watchdog::Watchdog;
use realtime::RealtimeService;
use db::{WindowActivity, Screenshot, TimeLog, AuditEvent, AppStats, DailyStats};

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
fn get_logs(app_state: State<AppState>, limit: usize) -> Vec<WindowActivity> {
    app_state
        .db
        .recent_window_activities(limit as i64)
        .unwrap_or_default()
}

#[tauri::command]
fn get_screenshots(app_state: State<AppState>, limit: usize) -> Vec<Screenshot> {
    app_state
        .db
        .recent_screenshots(limit as i64)
        .unwrap_or_default()
}

#[tauri::command]
fn get_time_logs(app_state: State<AppState>, limit: usize) -> Vec<TimeLog> {
    app_state
        .db
        .recent_time_logs(limit as i64)
        .unwrap_or_default()
}

#[tauri::command]
fn get_audit_events(app_state: State<AppState>, limit: usize) -> Vec<AuditEvent> {
    app_state
        .db
        .recent_audit_events(limit as i64)
        .unwrap_or_default()
}

#[tauri::command]
fn get_app_stats(app_state: State<AppState>) -> Vec<AppStats> {
    app_state
        .db
        .get_app_usage_stats()
        .unwrap_or_default()
}

#[tauri::command]
fn get_daily_stats(app_state: State<AppState>, days: usize) -> Vec<DailyStats> {
    app_state
        .db
        .get_daily_usage_stats(days as i64)
        .unwrap_or_default()
}

#[tauri::command]
fn get_stats_by_date(app_state: State<AppState>, date: String) -> serde_json::Value {
    let daily_stats = app_state
        .db
        .get_stats_by_date(&date)
        .unwrap_or_default();
    
    json!({
        "date": date,
        "stats": daily_stats
    })
}

#[tauri::command]
fn get_realtime_dashboard_data(app_state: State<AppState>) -> serde_json::Value {
    let status = *app_state.paused.lock().unwrap();
    let app_stats = app_state.db.get_app_usage_stats().unwrap_or_default();
    let daily_stats = app_state.db.get_daily_usage_stats(1).unwrap_or_default();
    let recent_activities = app_state.db.recent_window_activities(10).unwrap_or_default();
    let recent_screenshots = app_state.db.recent_screenshots(5).unwrap_or_default();
    
    json!({
        "status": { "paused": status },
        "app_stats": app_stats,
        "daily_stats": daily_stats,
        "recent_activities": recent_activities,
        "recent_screenshots": recent_screenshots,
        "timestamp": chrono::Utc::now().timestamp()
    })
}

#[tauri::command]
fn start_realtime_updates(app_handle: AppHandle) {
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(1));
        loop {
            interval.tick().await;
            let _ = app_handle.emit("realtime-update", json!({
                "timestamp": chrono::Utc::now().timestamp()
            }));
        }
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db = Arc::new(Db::new().expect("db init failed"));
    let config = Config::load().expect("config load");
    let app_state = AppState::new(Arc::clone(&db), config.clone());

    ScreenshotService::spawn(Arc::clone(&db), config.clone());
    EventPoller::spawn(Arc::clone(&db));
    FocusTracker::spawn(Arc::clone(&db));
    Watchdog::spawn(Arc::clone(&db));

    Builder::default()
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            pause, 
            resume, 
            status, 
            get_logs,
            get_screenshots,
            get_time_logs,
            get_audit_events,
            get_app_stats,
            get_daily_stats,
            get_stats_by_date,
            get_realtime_dashboard_data,
            start_realtime_updates
        ])
        .setup(move |app| {
            let app_handle = app.handle().clone();
            RealtimeService::spawn(Arc::clone(&db), app_handle.clone());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
