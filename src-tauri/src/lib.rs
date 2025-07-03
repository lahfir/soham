// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::sync::Arc;

use tauri::{Builder, State};

mod config;
mod db;
mod events;
mod focus;
mod screenshot;
mod state;
mod watchdog;

use config::Config;
use db::Db;
use events::EventPoller;
use focus::FocusTracker;
use screenshot::ScreenshotService;
use state::AppState;
use watchdog::Watchdog;
use db::WindowActivity;

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
        .invoke_handler(tauri::generate_handler![pause, resume, status, get_logs])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
