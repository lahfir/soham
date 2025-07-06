use tauri::State;

use crate::models::*;
use crate::state::AppState;

#[tauri::command]
pub async fn current_session_id(state: State<'_, AppState>) -> Result<i64, String> {
    Ok(state.get_current_session_id().await)
}

#[tauri::command]
pub async fn get_session_flow(state: State<'_, AppState>) -> Result<Vec<AppLifecycleFlow>, String> {
    let session_id = state.get_current_session_id().await;
    state.repository.get_session_flow(session_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_sessions_for_date(
    date: String,
    state: State<'_, AppState>,
) -> Result<Vec<Session>, String> {
    state.repository.get_sessions_for_date(&date).await.map_err(|e| e.to_string())
}