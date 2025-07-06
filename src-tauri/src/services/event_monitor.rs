use chrono::Utc;
use tauri::{AppHandle, Emitter};

use crate::database::Repository;
use crate::error::Result;
use crate::models::{EventType, WindowActivity};
use crate::state::AppState;

pub struct EventMonitor;

impl EventMonitor {
    #[cfg(target_os = "macos")]
    pub fn spawn(repository: Repository, app_handle: AppHandle, state: AppState) {
        tokio::spawn(async move {
            if let Err(e) = Self::start_macos_event_monitoring(repository, app_handle, state).await {
                log::error!("macOS event monitoring failed: {}", e);
            }
        });
    }

    #[cfg(not(target_os = "macos"))]
    pub fn spawn(repository: Repository, app_handle: AppHandle, state: AppState) {
        tokio::spawn(async move {
            if let Err(e) = Self::start_polling_event_monitoring(repository, app_handle, state).await {
                log::error!("Polling event monitoring failed: {}", e);
            }
        });
    }

    #[cfg(target_os = "macos")]
    async fn start_macos_event_monitoring(
        repository: Repository,
        app_handle: AppHandle,
        state: AppState,
    ) -> Result<()> {
        use active_win_pos_rs::get_active_window;
        use tokio::time::{interval, Duration};

        let mut ticker = interval(Duration::from_millis(500));
        let mut last_window: Option<(String, String)> = None;

        loop {
            ticker.tick().await;

            if state.is_paused().await {
                continue;
            }

            if let Ok(window) = get_active_window() {
                let current_window = (window.app_name.clone(), window.title.clone());
                
                if last_window.as_ref() != Some(&current_window) {
                    if let Some((last_app, last_title)) = last_window {
                        let _ = Self::record_event(
                            &repository,
                            &app_handle,
                            &state,
                            &last_app,
                            &last_title,
                            EventType::Blur,
                        ).await;
                    }

                    let _ = Self::record_event(
                        &repository,
                        &app_handle,
                        &state,
                        &window.app_name,
                        &window.title,
                        EventType::Focus,
                    ).await;

                    last_window = Some(current_window);
                }
            }

            tokio::time::sleep(Duration::from_millis(100)).await;
        }
    }

    #[cfg(not(target_os = "macos"))]
    async fn start_polling_event_monitoring(
        repository: Repository,
        app_handle: AppHandle,
        state: AppState,
    ) -> Result<()> {
        use active_win_pos_rs::get_active_window;
        use tokio::time::{interval, Duration};

        let mut ticker = interval(Duration::from_secs(2));
        let mut last_window: Option<(String, String)> = None;

        loop {
            ticker.tick().await;

            if state.is_paused().await {
                continue;
            }

            if let Ok(window) = get_active_window() {
                let current_window = (window.app_name.clone(), window.title.clone());
                
                if last_window.as_ref() != Some(&current_window) {
                    if let Some((last_app, last_title)) = last_window {
                        let _ = Self::record_event(
                            &repository,
                            &app_handle,
                            &state,
                            &last_app,
                            &last_title,
                            EventType::Blur,
                        ).await;
                    }

                    let _ = Self::record_event(
                        &repository,
                        &app_handle,
                        &state,
                        &window.app_name,
                        &window.title,
                        EventType::Focus,
                    ).await;

                    last_window = Some(current_window);
                }
            }
        }
    }

    async fn record_event(
        repository: &Repository,
        app_handle: &AppHandle,
        state: &AppState,
        app_id: &str,
        window_title: &str,
        event_type: EventType,
    ) -> Result<()> {
        let activity = WindowActivity {
            id: None,
            session_id: state.get_current_session_id().await,
            app_id: app_id.to_string(),
            window_title: window_title.to_string(),
            event_type: event_type.as_str().to_string(),
            timestamp: Utc::now(),
            duration: None,
            metadata: None,
        };

        let activity_id = repository.insert_window_activity(&activity).await?;

        let mut final_activity = activity;
        final_activity.id = Some(activity_id);

        if let Err(e) = app_handle.emit("window-activity", &final_activity) {
            log::error!("Failed to emit window activity event: {}", e);
        }

        state.cache.invalidate_dashboard_cache().await;

        Ok(())
    }
}