use chrono::DateTime;
use tauri::State;

use crate::models::*;
use crate::state::AppState;

#[tauri::command]
pub async fn get_app_stats(
    from: i64,
    to: i64,
    state: State<'_, AppState>,
) -> Result<Vec<AppStats>, String> {
    let from_dt = DateTime::from_timestamp(from, 0)
        .ok_or_else(|| "Invalid from timestamp".to_string())?;
    let to_dt = DateTime::from_timestamp(to, 0)
        .ok_or_else(|| "Invalid to timestamp".to_string())?;

    state.repository.get_app_stats(from_dt, to_dt).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_heatmap_data(
    from: i64,
    to: i64,
    range_type: String,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let from_dt = DateTime::from_timestamp(from, 0)
        .ok_or_else(|| "Invalid from timestamp".to_string())?;
    let to_dt = DateTime::from_timestamp(to, 0)
        .ok_or_else(|| "Invalid to timestamp".to_string())?;

    let result = match range_type.as_str() {
        "week" => {
            let data = state.repository.get_activity_heatmap(from_dt, to_dt).await.map_err(|e| e.to_string())?;
            serde_json::to_value(data).map_err(|e| e.to_string())?
        }
        "month" => {
            let data = state.repository.get_activity_heatmap_month(from_dt, to_dt).await.map_err(|e| e.to_string())?;
            serde_json::to_value(data).map_err(|e| e.to_string())?
        }
        "year" => {
            let data = state.repository.get_activity_heatmap_year(from_dt, to_dt).await.map_err(|e| e.to_string())?;
            serde_json::to_value(data).map_err(|e| e.to_string())?
        }
        _ => return Err("Invalid range type".to_string()),
    };

    Ok(result)
}

#[tauri::command]
pub async fn get_app_lifecycle_events(
    app_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<AppLifecycleFlow>, String> {
    state.repository.get_app_lifecycle_flow(&app_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_app_lifecycle_flow(
    date: String,
    state: State<'_, AppState>,
) -> Result<Vec<AppLifecycleFlow>, String> {
    state.repository.get_app_lifecycle_flow(&date).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_unified_timeline_events(
    from: i64,
    to: i64,
    state: State<'_, AppState>,
) -> Result<Vec<TimelineEvent>, String> {
    let from_dt = DateTime::from_timestamp(from, 0)
        .ok_or_else(|| "Invalid from timestamp".to_string())?;
    let to_dt = DateTime::from_timestamp(to, 0)
        .ok_or_else(|| "Invalid to timestamp".to_string())?;

    state.repository.get_unified_timeline_events(from_dt, to_dt).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_unified_timeline_events_for_session(
    session_id: i64,
    state: State<'_, AppState>,
) -> Result<Vec<TimelineEvent>, String> {
    state.repository.get_unified_timeline_events_for_session(session_id).await.map_err(|e| e.to_string())
}