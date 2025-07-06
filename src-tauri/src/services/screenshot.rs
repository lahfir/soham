use chrono::Utc;
use std::path::Path;
use tauri::{AppHandle, Emitter};
use tokio::time::{interval, Duration};

use crate::database::Repository;
use crate::error::Result;
use crate::models::Screenshot;
use crate::state::AppState;

pub struct ScreenshotService;

impl ScreenshotService {
    pub fn spawn(
        repository: Repository,
        app_handle: AppHandle,
        state: AppState,
        interval_secs: u64,
    ) {
        tokio::spawn(async move {
            let mut ticker = interval(Duration::from_secs(interval_secs));
            let screenshot_dir = Self::ensure_screenshot_directory().await;

            loop {
                ticker.tick().await;

                if state.is_paused().await {
                    continue;
                }

                if let Err(e) = Self::capture_screenshot(&repository, &app_handle, &state, &screenshot_dir).await {
                    log::error!("Screenshot capture failed: {}", e);
                }
            }
        });
    }

    async fn capture_screenshot(
        repository: &Repository,
        app_handle: &AppHandle,
        state: &AppState,
        screenshot_dir: &Path,
    ) -> Result<()> {
        let timestamp = Utc::now();
        let filename = format!("screenshot_{}.png", timestamp.format("%Y%m%d_%H%M%S"));
        let file_path = screenshot_dir.join(&filename);

        let screenshot_result = tokio::task::spawn_blocking({
            let file_path = file_path.clone();
            move || {
                use screenshots::Screen;
                let screens = Screen::all().map_err(|e| {
                    crate::error::AppError::Screenshot(format!("Failed to get screens: {}", e))
                })?;
                
                let screen = screens.first().ok_or_else(|| {
                    crate::error::AppError::Screenshot("No screens found".to_string())
                })?;
                
                let image = screen.capture().map_err(|e| {
                    crate::error::AppError::Screenshot(format!("Failed to capture screen: {}", e))
                })?;
                
                image.save(&file_path).map_err(|e| {
                    crate::error::AppError::Screenshot(format!("Failed to save screenshot: {}", e))
                })?;
                
                Ok::<(), crate::error::AppError>(())
            }
        })
        .await
        .map_err(|e| crate::error::AppError::Screenshot(e.to_string()))?;

        screenshot_result?;

        let file_size = tokio::fs::metadata(&file_path)
            .await
            .map_err(|e| crate::error::AppError::Screenshot(format!("Failed to get file size: {}", e)))?
            .len() as i64;

        let screenshot = Screenshot {
            id: 0,
            session_id: state.get_current_session_id().await,
            path: file_path.to_string_lossy().to_string(),
            timestamp,
            file_size,
            app_id: None,
            window_title: None,
        };

        let screenshot_id = repository.insert_screenshot(&screenshot).await?;

        let mut final_screenshot = screenshot;
        final_screenshot.id = screenshot_id;

        if let Err(e) = app_handle.emit("screenshot-captured", &final_screenshot) {
            log::error!("Failed to emit screenshot event: {}", e);
        }

        state.cache.invalidate_screenshot_cache().await;

        Ok(())
    }

    async fn ensure_screenshot_directory() -> std::path::PathBuf {
        let screenshots_dir = dirs::document_dir()
            .unwrap_or_else(|| std::env::current_dir().unwrap())
            .join("Soham")
            .join("screenshots");

        if let Err(e) = tokio::fs::create_dir_all(&screenshots_dir).await {
            log::error!("Failed to create screenshot directory: {}", e);
        }

        screenshots_dir
    }
}