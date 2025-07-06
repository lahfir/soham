use chrono::DateTime;
use tauri::State;

use crate::models::*;
use crate::state::AppState;

#[tauri::command]
pub async fn get_dashboard_data(
    from: i64,
    to: i64,
    state: State<'_, AppState>,
) -> Result<DashboardData, String> {
    let from_dt = DateTime::from_timestamp(from, 0)
        .ok_or_else(|| "Invalid from timestamp".to_string())?;
    let to_dt = DateTime::from_timestamp(to, 0)
        .ok_or_else(|| "Invalid to timestamp".to_string())?;

    let cache_key = format!("dashboard_{}_{}", from, to);
    
    if let Some(cached_data) = state.cache.get_dashboard_data(&cache_key).await {
        return Ok(cached_data);
    }

    let app_stats = state.repository.get_app_stats(from_dt, to_dt).await.map_err(|e| e.to_string())?;
    let heatmap_data = state.repository.get_activity_heatmap(from_dt, to_dt).await.map_err(|e| e.to_string())?;
    let active_sessions = state.repository.get_sessions_for_date(&from_dt.format("%Y-%m-%d").to_string()).await.map_err(|e| e.to_string())?;
    let recent_screenshots = state.repository.get_recent_screenshots(10).await.map_err(|e| e.to_string())?;
    let system_stats = get_system_stats_internal().await.map_err(|e| e.to_string())?;

    let dashboard_data = DashboardData {
        app_stats,
        heatmap_data,
        active_sessions,
        recent_screenshots,
        system_stats,
    };

    state.cache.set_dashboard_data(cache_key, dashboard_data.clone()).await;
    Ok(dashboard_data)
}

async fn get_system_stats_internal() -> Result<SystemStats, String> {
    use sysinfo::{System, SystemExt, CpuExt, DiskExt};
    
    let mut system = System::new_all();
    system.refresh_all();

    let memory_usage = if system.total_memory() > 0 {
        (system.used_memory() as f64 / system.total_memory() as f64) * 100.0
    } else {
        0.0
    };

    let disk_usage = {
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