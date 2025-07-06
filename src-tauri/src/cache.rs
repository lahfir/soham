use moka::future::Cache;
use std::time::Duration;
use std::path::PathBuf;
use sha2::{Sha256, Digest};

use crate::models::*;

pub struct CacheManager {
    icon_cache: Cache<String, String>,
    dashboard_cache: Cache<String, DashboardData>,
    screenshot_cache: Cache<String, Vec<Screenshot>>,
    icon_cache_dir: PathBuf,
}

impl CacheManager {
    pub fn new() -> Self {
        let icon_cache_dir = Self::get_icon_cache_dir().unwrap_or_else(|e| {
            log::warn!("Failed to create icon cache directory: {}", e);
            std::env::temp_dir().join("soham_icons")
        });
        
        // Ensure cache directory exists
        if let Err(e) = std::fs::create_dir_all(&icon_cache_dir) {
            log::warn!("Failed to create icon cache directory: {}", e);
        }
        
        Self {
            icon_cache: Cache::builder()
                .max_capacity(1000)
                .time_to_live(Duration::from_secs(3600))
                .build(),
            dashboard_cache: Cache::builder()
                .max_capacity(100)
                .time_to_live(Duration::from_secs(30))
                .build(),
            screenshot_cache: Cache::builder()
                .max_capacity(50)
                .time_to_live(Duration::from_secs(60))
                .build(),
            icon_cache_dir,
        }
    }
    
    fn get_icon_cache_dir() -> Result<PathBuf, Box<dyn std::error::Error + Send + Sync>> {
        let data_dir = dirs::data_dir()
            .or_else(|| dirs::home_dir().map(|h| h.join(".local/share")))
            .ok_or("Could not determine data directory")?;
        
        Ok(data_dir.join("soham").join("icon_cache"))
    }

    pub async fn get_icon(&self, app_id: &str) -> Option<String> {
        // First check memory cache
        if let Some(icon_data) = self.icon_cache.get(app_id).await {
            return Some(icon_data);
        }
        
        // Then check filesystem cache
        self.load_icon_from_disk(app_id).await
    }

    pub async fn set_icon(&self, app_id: String, icon_data: String) {
        // Store in memory cache
        self.icon_cache.insert(app_id.clone(), icon_data.clone()).await;
        
        // Store in filesystem cache
        let _ = self.save_icon_to_disk(&app_id, &icon_data).await;
    }
    
    async fn load_icon_from_disk(&self, app_id: &str) -> Option<String> {
        let file_path = self.get_icon_file_path(app_id);
        
        match tokio::fs::read_to_string(&file_path).await {
            Ok(icon_data) => {
                log::debug!("Loaded icon for {} from disk cache", app_id);
                // Also cache in memory for faster access
                self.icon_cache.insert(app_id.to_string(), icon_data.clone()).await;
                Some(icon_data)
            }
            Err(_) => {
                log::debug!("No disk cache found for icon: {}", app_id);
                None
            }
        }
    }
    
    async fn save_icon_to_disk(&self, app_id: &str, icon_data: &str) -> Result<(), std::io::Error> {
        let file_path = self.get_icon_file_path(app_id);
        
        // Create parent directory if it doesn't exist
        if let Some(parent) = file_path.parent() {
            tokio::fs::create_dir_all(parent).await?;
        }
        
        tokio::fs::write(&file_path, icon_data).await?;
        log::debug!("Saved icon for {} to disk cache", app_id);
        Ok(())
    }
    
    fn get_icon_file_path(&self, app_id: &str) -> PathBuf {
        // Create a hash of the app_id to avoid filesystem issues with special characters
        let mut hasher = Sha256::new();
        hasher.update(app_id.as_bytes());
        let hash = format!("{:x}", hasher.finalize());
        
        self.icon_cache_dir.join(format!("{}.txt", hash))
    }

    pub async fn get_dashboard_data(&self, cache_key: &str) -> Option<DashboardData> {
        self.dashboard_cache.get(cache_key).await
    }

    pub async fn set_dashboard_data(&self, cache_key: String, data: DashboardData) {
        self.dashboard_cache.insert(cache_key, data).await;
    }

    pub async fn get_screenshots(&self, cache_key: &str) -> Option<Vec<Screenshot>> {
        self.screenshot_cache.get(cache_key).await
    }

    pub async fn set_screenshots(&self, cache_key: String, screenshots: Vec<Screenshot>) {
        self.screenshot_cache.insert(cache_key, screenshots).await;
    }

    pub async fn invalidate_dashboard_cache(&self) {
        self.dashboard_cache.invalidate_all();
    }

    pub async fn invalidate_screenshot_cache(&self) {
        self.screenshot_cache.invalidate_all();
    }
}

impl Default for CacheManager {
    fn default() -> Self {
        Self::new()
    }
}