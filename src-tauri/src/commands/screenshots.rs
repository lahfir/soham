use chrono::DateTime;
use tauri::State;
use base64::Engine;
use image::GenericImageView;

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
    
    log::debug!("Converting {} screenshots to base64", screenshot_count);
    
    for mut screenshot in screenshots {
        match process_screenshot_image(&screenshot.path).await {
            Ok(base64_data) => {
                screenshot.path = base64_data;
                base64_screenshots.push(screenshot);
            }
            Err(e) => {
                log::warn!("Failed to process screenshot {}: {}", screenshot.path, e);
                // Create a placeholder screenshot entry for failed processing
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
    
    log::debug!("Successfully processed {} screenshots", base64_screenshots.len());
    Ok(base64_screenshots)
}

async fn process_screenshot_image(file_path: &str) -> Result<String, crate::error::AppError> {
    // Read the file
    let bytes = tokio::fs::read(file_path).await
        .map_err(|e| crate::error::AppError::FileIO(format!("Failed to read {}: {}", file_path, e)))?;
    
    if bytes.is_empty() {
        return Err(crate::error::AppError::FileIO("Screenshot file is empty".to_string()));
    }
    
    // Check file size and compress if needed (limit to 2MB base64 = ~1.5MB file)
    const MAX_FILE_SIZE: usize = 1_500_000; // 1.5 MB
    let original_size = bytes.len();
    
    let processed_bytes = if bytes.len() > MAX_FILE_SIZE {
        log::debug!("Screenshot {} is {}KB, compressing...", file_path, bytes.len() / 1024);
        compress_image(bytes).await?
    } else {
        bytes
    };
    
    // Verify the processed image is still reasonable size
    let base64_size = (processed_bytes.len() * 4) / 3; // estimate base64 size
    if base64_size > 2_000_000 { // 2MB base64 limit
        log::warn!("Screenshot {} still too large after compression ({}KB), using placeholder", 
                  file_path, base64_size / 1024);
        return Ok(create_placeholder_image());
    }
    
    let base64_data = base64::engine::general_purpose::STANDARD.encode(&processed_bytes);
    log::debug!("Screenshot {} processed: {}KB -> {}KB base64", 
              file_path, original_size / 1024, base64_data.len() / 1024);
    
    Ok(format!("data:image/png;base64,{}", base64_data))
}

async fn compress_image(image_bytes: Vec<u8>) -> Result<Vec<u8>, crate::error::AppError> {
    tokio::task::spawn_blocking(move || {
        use image::{ImageFormat, ImageReader};
        use std::io::Cursor;
        
        // Load the image
        let img = ImageReader::new(Cursor::new(&image_bytes))
            .with_guessed_format()
            .map_err(|e| crate::error::AppError::ImageProcessing(format!("Failed to read image: {}", e)))?
            .decode()
            .map_err(|e| crate::error::AppError::ImageProcessing(format!("Failed to decode image: {}", e)))?;
        
        // Calculate new dimensions (max 800px width/height while maintaining aspect ratio)
        let (width, height) = img.dimensions();
        let max_dimension = 800;
        let (new_width, new_height) = if width > height {
            if width > max_dimension {
                let ratio = max_dimension as f32 / width as f32;
                (max_dimension, (height as f32 * ratio) as u32)
            } else {
                (width, height)
            }
        } else {
            if height > max_dimension {
                let ratio = max_dimension as f32 / height as f32;
                ((width as f32 * ratio) as u32, max_dimension)
            } else {
                (width, height)
            }
        };
        
        // Resize if necessary
        let resized_img = if new_width != width || new_height != height {
            log::debug!("Resizing image from {}x{} to {}x{}", width, height, new_width, new_height);
            img.resize(new_width, new_height, image::imageops::FilterType::Lanczos3)
        } else {
            img
        };
        
        // Encode as PNG with compression
        let mut output = Vec::new();
        resized_img.write_to(&mut Cursor::new(&mut output), ImageFormat::Png)
            .map_err(|e| crate::error::AppError::ImageProcessing(format!("Failed to encode PNG: {}", e)))?;
        
        log::debug!("Compressed image: {} bytes -> {} bytes", image_bytes.len(), output.len());
        Ok(output)
    })
    .await
    .map_err(|e| crate::error::AppError::ImageProcessing(format!("Compression task failed: {}", e)))?
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