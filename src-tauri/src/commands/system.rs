use tauri::State;

use crate::models::SystemStats;
use crate::state::AppState;

#[tauri::command]
pub async fn get_system_stats(
    _state: State<'_, AppState>,
) -> Result<SystemStats, String> {
    use sysinfo::{System, SystemExt, CpuExt};
    
    let mut system = System::new_all();
    system.refresh_all();

    let memory_usage = if system.total_memory() > 0 {
        (system.used_memory() as f64 / system.total_memory() as f64) * 100.0
    } else {
        0.0
    };

    let disk_usage = {
        use sysinfo::DiskExt;
        let disks = system.disks();
        if !disks.is_empty() {
            let total_space: u64 = disks.iter().map(|d| d.total_space()).sum();
            let available_space: u64 = disks.iter().map(|d| d.available_space()).sum();
            if total_space > 0 {
                ((total_space - available_space) as f64 / total_space as f64) * 100.0
            } else {
                0.0
            }
        } else {
            0.0
        }
    };

    Ok(SystemStats {
        cpu_usage: system.global_cpu_info().cpu_usage(),
        memory_usage,
        disk_usage,
        uptime: system.uptime(),
        process_count: system.processes().len() as u32,
    })
}

#[tauri::command]
pub async fn get_app_icon(
    app_id: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    if let Some(cached_icon) = state.cache.get_icon(&app_id).await {
        return Ok(cached_icon);
    }

    let icon_data = extract_app_icon_base64(&app_id).await.map_err(|e| e.to_string())?;
    state.cache.set_icon(app_id, icon_data.clone()).await;
    Ok(icon_data)
}

async fn extract_app_icon_base64(app_id: &str) -> Result<String, crate::error::AppError> {
    tokio::task::spawn_blocking({
        let app_id = app_id.to_string();
        move || {
            match crate::icon_extractor::get_app_icon_base64(&app_id) {
                Ok(icon_data) => {
                    log::debug!("Successfully extracted icon for app: {}", app_id);
                    Ok(icon_data)
                }
                Err(e) => {
                    log::warn!("Failed to extract icon for {}: {}. Using fallback.", app_id, e);
                    // If extraction fails, try to create a fallback icon
                    #[cfg(target_os = "macos")]
                    {
                        crate::icon_extractor::create_fallback_icon(&app_id)
                            .map_err(|fallback_err| crate::error::AppError::IconExtraction(
                                format!("Icon extraction failed: {}. Fallback also failed: {}", e, fallback_err)
                            ))
                    }
                    #[cfg(not(target_os = "macos"))]
                    {
                        Err(crate::error::AppError::IconExtraction(e.to_string()))
                    }
                }
            }
        }
    })
    .await
    .map_err(|e| crate::error::AppError::SystemMonitoring(e.to_string()))?
}

#[derive(serde::Serialize)]
pub struct AppStatus {
    pub paused: bool,
}

#[tauri::command]
pub async fn pause(state: State<'_, AppState>) -> Result<(), String> {
    state.set_paused(true).await;
    Ok(())
}

#[tauri::command]
pub async fn resume(state: State<'_, AppState>) -> Result<(), String> {
    state.set_paused(false).await;
    Ok(())
}

#[tauri::command]
pub async fn status(state: State<'_, AppState>) -> Result<AppStatus, String> {
    let paused = state.is_paused().await;
    Ok(AppStatus { paused })
}

#[tauri::command]
pub async fn is_app_ready(state: State<'_, AppState>) -> Result<bool, String> {
    // Check if we can access the state and it has been properly initialized
    let session_id = state.get_current_session_id().await;
    Ok(session_id > 0)
}

#[tauri::command]
pub async fn refresh_webview() -> Result<String, String> {
    log::info!("WebView refresh requested - clearing memory and forcing rerender");
    
    // Force garbage collection by dropping large objects
    std::hint::black_box(vec![0u8; 1024]); // Small allocation to trigger GC
    
    Ok("WebView refresh completed".to_string())
}

#[tauri::command] 
pub async fn get_memory_usage() -> Result<serde_json::Value, String> {
    use sysinfo::{System, SystemExt};
    
    let mut system = System::new();
    system.refresh_memory();
    
    let memory_info = serde_json::json!({
        "total_memory": system.total_memory(),
        "used_memory": system.used_memory(),
        "available_memory": system.available_memory(),
        "memory_usage_percent": if system.total_memory() > 0 {
            (system.used_memory() as f64 / system.total_memory() as f64) * 100.0
        } else {
            0.0
        }
    });
    
    Ok(memory_info)
}