use anyhow::Result;
use chrono::Utc;
use sysinfo::{Pid, System, SystemExt, ProcessExt};
use tauri::{AppHandle, Emitter};
use crate::state::AppState;

#[derive(serde::Serialize, Clone, Debug)]
pub struct ActivityPayload {
    pub ts: i64,
    pub app: String,
    pub window_title: String,
    pub pid: i32,
    pub path: String,
}

const TRANSITION_TYPE_SWITCH: &str = "switch";
const POLL_INTERVAL_S: i64 = 2; // Assume a 2s pulse duration for DB logging

/// Handles a new application activity event, updating state and emitting events.
/// This function is designed to be called from any activity source (poller or real-time listener).
pub fn handle_new_activity(
    app_state: &AppState,
    app_handle: &AppHandle,
    app_name: String,
    pid: i32,
    last_active_app: &mut Option<String>,
    last_switch_time: &mut Option<chrono::DateTime<chrono::Utc>>,
) -> Result<()> {
    // If the app is paused, do nothing.
    if *app_state.paused.lock().unwrap() {
        return Ok(());
    }

    let ts = Utc::now().timestamp();
    let current_time = Utc::now();
    let mut sys = System::new();
    sys.refresh_process(Pid::from(pid as usize));
    
    // Attempt to get the process details.
    let proc = match sys.process(Pid::from(pid as usize)) {
        Some(p) => p,
        None => return Ok(()), // Process might have closed, ignore.
    };

    let path = proc.exe().to_string_lossy().into_owned();
    let window_title = get_window_title(pid).unwrap_or_default();
    
    // Track app transitions and time spent.
    if let Some(ref last_app) = last_active_app.clone() {
        if last_app != &app_name {
            if let Some(last_time) = last_switch_time {
                let time_spent = current_time.signed_duration_since(*last_time);
                println!("⏱️  Time spent in {}: {}s", last_app, time_spent.num_seconds());
            }

            // For event-driven systems, we assume it's always a "switch".
            let transition_type = TRANSITION_TYPE_SWITCH;
            
            println!("🔄 App TRANSITION: {} → {} ({})", last_app, app_name, transition_type.to_uppercase());
            
            let session_id = *app_state.current_session.lock().unwrap();
            if let Err(e) = app_state.db.insert_app_transition(session_id, last_app, &app_name, transition_type) {
                eprintln!("❌ Failed to save app transition: {}", e);
            }

            // Emit the transition event for real-time UI updates.
            if let Err(e) = app_handle.emit("app-transition", serde_json::json!({
                "from_app": last_app,
                "to_app": &app_name,
                "transition_type": transition_type,
                "timestamp": ts,
                "session_id": session_id
            })) {
                eprintln!("❌ Failed to emit app transition event: {}", e);
            }
        }
    } else {
        println!("🎯 Initial app focus: {}", app_name);
    }
    
    // Update the state for the next event.
    *last_active_app = Some(app_name.clone());
    *last_switch_time = Some(current_time);

    // Log the activity pulse to the database.
    let session_id = *app_state.current_session.lock().unwrap();
    app_state.db.insert_activity_pulse(session_id, ts, &app_name, &window_title, POLL_INTERVAL_S)?;

    // Emit the new activity payload for other potential listeners.
    let payload = ActivityPayload {
        ts,
        app: app_name,
        window_title,
        pid,
        path,
    };
    app_handle.emit("new-activity", serde_json::json!({
        "session_id": session_id,
        "payload": payload
    }))?;

    Ok(())
}

// Platform-specific function to get window title from PID.
#[cfg(target_os = "macos")]
fn get_window_title(pid: i32) -> Result<String> {
    use active_win_pos_rs::get_active_window;
    // On macOS, get_active_window is the most reliable way even if we have the PID,
    // as it provides the title of the *focused* window.
    match get_active_window() {
        Ok(win) if win.process_id as i32 == pid => Ok(win.title),
        _ => Ok(String::new()),
    }
}

#[cfg(not(target_os = "macos"))]
fn get_window_title(_pid: i32) -> Result<String> {
    // Fallback for other platforms.
    use active_win_pos_rs::get_active_window;
    match get_active_window() {
        Ok(win) => Ok(win.title),
        Err(_) => Ok(String::new()),
    }
} 