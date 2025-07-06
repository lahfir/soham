use chrono::Utc;
use tauri::{Builder, Manager};

mod cache;
mod commands;
mod config;
mod database;
mod error;
mod icon_extractor;
mod models;
mod services;
mod state;

use config::Config;
use database::DatabasePool;
use services::{EventMonitor, ScreenshotService, SystemMonitor};
use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();
    log::info!("🚀 Starting Soham Tracker...");

    Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::pause,
            commands::resume,
            commands::status,
            commands::is_app_ready,
            commands::refresh_webview,
            commands::get_memory_usage,
            commands::get_dashboard_data,
            commands::get_heatmap_data,
            commands::get_app_icon,
            commands::get_app_stats,
            commands::get_app_lifecycle_events,
            commands::get_app_lifecycle_flow,
            commands::get_recent_screenshots,
            commands::get_system_stats,
            commands::current_session_id,
            commands::get_session_flow,
            commands::get_unified_timeline_events,
            commands::get_sessions_for_date,
            commands::get_unified_timeline_events_for_session,
            commands::get_screenshots_in_range,
        ])
        .setup(|app| {
            log::info!("🔧 Setting up Tauri application...");
            
            let app_handle = app.handle().clone();
            
            // Initialize state synchronously
            let runtime = tokio::runtime::Runtime::new().expect("Failed to create Tokio runtime");
            
            let app_state = runtime.block_on(async {
                match initialize_app_state().await {
                    Ok(state) => {
                        log::info!("✅ Application state initialized successfully");
                        state
                    }
                    Err(e) => {
                        log::error!("❌ Failed to initialize application state: {}", e);
                        panic!("Cannot start without application state: {}", e);
                    }
                }
            });
            
            // Clone state for background services
            let state_for_services = app_state.clone();
            
            // Manage the state before spawning services
            app.manage(app_state);
            log::info!("✅ Application state managed");
            
            // Now spawn background services asynchronously
            tauri::async_runtime::spawn(async move {
                if let Err(e) = start_background_services(app_handle, state_for_services).await {
                    log::error!("❌ Failed to start background services: {}", e);
                }
            });
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

async fn initialize_app_state() -> Result<AppState, Box<dyn std::error::Error + Send + Sync>> {
    log::info!("📋 Loading configuration...");
    let config = Config::load()?;
    log::info!("✅ Configuration loaded");

    // Request macOS permissions early
    #[cfg(target_os = "macos")]
    request_macos_permissions();

    log::info!("🗄️ Initializing database...");
    let db_path = get_database_path()?;
    log::info!("📍 Database path: {}", db_path);
    
    let db_pool = DatabasePool::new(&db_path).await?;
    log::info!("✅ Database initialized");

    log::info!("🏗️ Setting up application state...");
    let app_state = AppState::new(db_pool);

    log::info!("🆔 Creating session...");
    let session_id = app_state.repository.create_session(Utc::now()).await?;
    app_state.set_current_session_id(session_id).await;
    log::info!("✅ Session created with ID: {}", session_id);

    Ok(app_state)
}

async fn start_background_services(
    app_handle: tauri::AppHandle,
    app_state: AppState,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    log::info!("📋 Loading configuration for services...");
    let config = Config::load()?;
    
    log::info!("🔄 Starting background services...");
    
    // Start screenshot service
    ScreenshotService::spawn(
        app_state.repository.clone(),
        app_handle.clone(),
        app_state.clone(),
        config.screenshot_interval_secs,
    );
    log::info!("✅ Screenshot service started");

    // Start event monitor
    EventMonitor::spawn(
        app_state.repository.clone(),
        app_handle.clone(),
        app_state.clone(),
    );
    log::info!("✅ Event monitor started");

    // Start system monitor
    SystemMonitor::spawn(
        app_state.repository.clone(),
        app_handle.clone(),
        app_state.clone(),
    );
    log::info!("✅ System monitor started");

    log::info!("🎉 All services started successfully");
    Ok(())
}

fn get_database_path() -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
    let data_dir = dirs::data_dir()
        .or_else(|| dirs::home_dir().map(|h| h.join(".local/share")))
        .ok_or("Could not determine data directory")?;

    let app_data_dir = data_dir.join("soham");
    std::fs::create_dir_all(&app_data_dir)?;

    Ok(app_data_dir.join("soham.db").to_string_lossy().to_string())
}

#[cfg(target_os = "macos")]
fn request_macos_permissions() {
    use std::process::Command;
    
    log::info!("🔐 Checking macOS permissions...");
    
    // Check if accessibility permissions are already granted
    let check_script = r#"
    tell application "System Events"
        try
            get processes
            return true
        on error
            return false
        end try
    end tell
    "#;
    
    let check_result = Command::new("osascript")
        .arg("-e")
        .arg(check_script)
        .output();
    
    let has_permissions = check_result
        .map(|output| String::from_utf8_lossy(&output.stdout).trim() == "true")
        .unwrap_or(false);
    
    if has_permissions {
        log::info!("✅ Accessibility permissions already granted");
        return;
    }
    
    log::warn!("⚠️ Accessibility permissions not granted, requesting...");
    
    // Request accessibility permissions and open system preferences
    let request_script = r#"
    tell application "System Events"
        try
            -- This will trigger the permission dialog
            get processes
        on error
            -- Open System Preferences to the correct page
            tell application "System Preferences"
                activate
                set current pane to pane "com.apple.preference.security"
                delay 1
                tell application "System Events"
                    tell process "System Preferences"
                        try
                            click button "Privacy" of tab group 1 of window 1
                            delay 0.5
                            click row 2 of table 1 of scroll area 1 of group 1 of tab group 1 of window 1
                        end try
                    end tell
                end tell
            end tell
            
            display dialog "Soham Tracker needs Accessibility permissions to monitor applications and extract icons.

1. In the opened System Preferences window, click on 'Accessibility' in the left panel
2. Click the lock icon and enter your password if needed  
3. Check the box next to 'soham' to grant permissions
4. Restart the application after granting permissions

The app will not function properly without these permissions." buttons {"OK"} default button "OK" with title "Accessibility Permissions Required"
        end try
    end tell
    "#;
    
    let _ = Command::new("osascript")
        .arg("-e")
        .arg(request_script)
        .output();
    
    log::info!("✅ Permission request dialog completed");
}