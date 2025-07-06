use chrono::DateTime;
use tauri::State;
use base64::Engine;

use crate::models::Screenshot;
use crate::state::AppState;

#[tauri::command]
pub async fn get_screenshots_in_range(
    from: i64,
    to: i64,
    state: State<'_, AppState>,
) -> Result<Vec<Screenshot>, String> {
    let from_dt = DateTime::from_timestamp(from, 0)
        .ok_or_else(|| "Invalid from timestamp".to_string())?;
    let to_dt = DateTime::from_timestamp(to, 0)
        .ok_or_else(|| "Invalid to timestamp".to_string())?;

    let cache_key = format!("screenshots_{}_{}", from, to);
    
    if let Some(cached_screenshots) = state.cache.get_screenshots(&cache_key).await {
        return Ok(cached_screenshots);
    }

    let screenshots = state.repository.get_screenshots_in_range(from_dt, to_dt).await.map_err(|e| e.to_string())?;
    let base64_screenshots = convert_screenshots_to_base64(screenshots).await.map_err(|e| e.to_string())?;
    
    state.cache.set_screenshots(cache_key, base64_screenshots.clone()).await;
    Ok(base64_screenshots)
}

#[tauri::command]
pub async fn get_recent_screenshots(
    state: State<'_, AppState>,
) -> Result<Vec<Screenshot>, String> {
    let screenshots = state.repository.get_recent_screenshots(10).await.map_err(|e| e.to_string())?;
    convert_screenshots_to_base64(screenshots).await.map_err(|e| e.to_string())
}

async fn convert_screenshots_to_base64(screenshots: Vec<Screenshot>) -> Result<Vec<Screenshot>, crate::error::AppError> {
    let mut base64_screenshots = Vec::new();
    let screenshot_count = screenshots.len();
    
    for mut screenshot in screenshots {
        match tokio::fs::read(&screenshot.path).await {
            Ok(bytes) => {
                if !bytes.is_empty() {
                    screenshot.path = format!("data:image/png;base64,{}", 
                        base64::engine::general_purpose::STANDARD.encode(bytes));
                    base64_screenshots.push(screenshot);
                } else {
                    log::warn!("Screenshot file is empty: {}", screenshot.path);
                    // Create a placeholder screenshot entry
                    screenshot.path = create_placeholder_image();
                    base64_screenshots.push(screenshot);
                }
            }
            Err(e) => {
                log::warn!("Failed to read screenshot file {}: {}", screenshot.path, e);
                // Create a placeholder screenshot entry for missing files
                screenshot.path = create_placeholder_image();
                base64_screenshots.push(screenshot);
            }
        }
    }
    
    // If no screenshots were successfully loaded, create a placeholder
    if base64_screenshots.is_empty() && screenshot_count > 0 {
        use chrono::Utc;
        let placeholder_screenshot = Screenshot {
            id: 0,
            session_id: 0,
            path: create_placeholder_image(),
            timestamp: Utc::now(),
            file_size: 0,
            app_id: Some("placeholder".to_string()),
            window_title: Some("No Screenshots Available".to_string()),
        };
        base64_screenshots.push(placeholder_screenshot);
    }
    
    Ok(base64_screenshots)
}

fn create_placeholder_image() -> String {
    // Create a simple 100x100 gray placeholder image as base64
    let placeholder_svg = format!(
        "<svg width=\"100\" height=\"100\" xmlns=\"http://www.w3.org/2000/svg\">\
         <rect width=\"100\" height=\"100\" fill=\"{}\"/>\
         <text x=\"50\" y=\"45\" font-family=\"Arial\" font-size=\"10\" fill=\"white\" text-anchor=\"middle\">Screenshot</text>\
         <text x=\"50\" y=\"60\" font-family=\"Arial\" font-size=\"10\" fill=\"white\" text-anchor=\"middle\">Not Available</text>\
         </svg>", 
        "#374151"
    );
    
    format!("data:image/svg+xml;base64,{}", 
        base64::engine::general_purpose::STANDARD.encode(placeholder_svg.as_bytes()))
}