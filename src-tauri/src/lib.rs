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

async fn initialize_app(app_handle: tauri::AppHandle) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
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

    // Manage the app state
    app_handle.manage(app_state.clone());
    log::info!("✅ Application state managed");

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
    
    log::info!("🔐 Requesting macOS permissions...");
    
    // Request accessibility permissions through AppleScript
    let script = r#"
    tell application "System Events"
        try
            get processes
            display dialog "Soham Tracker needs accessibility permissions to monitor applications and extract icons. Please grant access in System Preferences > Security & Privacy > Privacy > Accessibility." buttons {"OK"} default button "OK"
        on error
            display dialog "Please grant Soham Tracker accessibility permissions in System Preferences > Security & Privacy > Privacy > Accessibility, then restart the app." buttons {"OK"} default button "OK"
        end try
    end tell
    "#;
    
    let _ = Command::new("osascript")
        .arg("-e")
        .arg(script)
        .output();
    
    log::info!("✅ Permission request completed");
}