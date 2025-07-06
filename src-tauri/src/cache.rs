use moka::future::Cache;
use std::time::Duration;

use crate::models::*;

pub struct CacheManager {
    icon_cache: Cache<String, String>,
    dashboard_cache: Cache<String, DashboardData>,
    screenshot_cache: Cache<String, Vec<Screenshot>>,
}

impl CacheManager {
    pub fn new() -> Self {
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
        }
    }

    pub async fn get_icon(&self, app_id: &str) -> Option<String> {
        self.icon_cache.get(app_id).await
    }

    pub async fn set_icon(&self, app_id: String, icon_data: String) {
        self.icon_cache.insert(app_id, icon_data).await;
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