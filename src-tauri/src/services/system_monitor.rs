use tauri::{AppHandle, Emitter};
use tokio::time::{interval, Duration};

use crate::database::Repository;
use crate::error::Result;
use crate::models::{DashboardData, SystemStats};
use crate::state::AppState;

pub struct SystemMonitor;

impl SystemMonitor {
    pub fn spawn(repository: Repository, app_handle: AppHandle, state: AppState) {
        tokio::spawn(async move {
            if let Err(e) = Self::start_system_monitoring(repository, app_handle, state).await {
                log::error!("System monitoring failed: {}", e);
            }
        });
    }

    async fn start_system_monitoring(
        repository: Repository,
        app_handle: AppHandle,
        state: AppState,
    ) -> Result<()> {
        let mut ticker = interval(Duration::from_secs(5));

        loop {
            ticker.tick().await;

            if state.is_paused().await {
                continue;
            }

            if let Err(e) = Self::emit_dashboard_update(&repository, &app_handle, &state).await {
                log::error!("Failed to emit dashboard update: {}", e);
            }
        }
    }

    async fn emit_dashboard_update(
        repository: &Repository,
        app_handle: &AppHandle,
        _state: &AppState,
    ) -> Result<()> {
        use chrono::{Duration as ChronoDuration, Utc};

        let now = Utc::now();
        let yesterday = now - ChronoDuration::days(1);

        log::debug!("Starting dashboard update...");

        let app_stats = match repository.get_app_stats(yesterday, now).await {
            Ok(stats) => {
                log::debug!("✅ get_app_stats succeeded with {} entries", stats.len());
                stats
            }
            Err(e) => {
                log::error!("❌ get_app_stats failed: {}", e);
                return Err(e);
            }
        };

        let heatmap_data = match repository.get_activity_heatmap(yesterday, now).await {
            Ok(data) => {
                log::debug!("✅ get_activity_heatmap succeeded with {} entries", data.len());
                data
            }
            Err(e) => {
                log::error!("❌ get_activity_heatmap failed: {}", e);
                return Err(e);
            }
        };

        let active_sessions = match repository.get_sessions_for_date(&now.format("%Y-%m-%d").to_string()).await {
            Ok(sessions) => {
                log::debug!("✅ get_sessions_for_date succeeded with {} entries", sessions.len());
                sessions
            }
            Err(e) => {
                log::error!("❌ get_sessions_for_date failed: {}", e);
                return Err(e);
            }
        };

        let recent_screenshots = match repository.get_recent_screenshots(5).await {
            Ok(screenshots) => {
                log::debug!("✅ get_recent_screenshots succeeded with {} entries", screenshots.len());
                screenshots
            }
            Err(e) => {
                log::error!("❌ get_recent_screenshots failed: {}", e);
                return Err(e);
            }
        };

        let system_stats = match Self::get_system_stats().await {
            Ok(stats) => {
                log::debug!("✅ get_system_stats succeeded");
                stats
            }
            Err(e) => {
                log::error!("❌ get_system_stats failed: {}", e);
                return Err(e);
            }
        };

        let dashboard_data = DashboardData {
            app_stats,
            heatmap_data,
            active_sessions,
            recent_screenshots,
            system_stats,
        };

        if let Err(e) = app_handle.emit("dashboard-update", &dashboard_data) {
            log::error!("Failed to emit dashboard update: {}", e);
        } else {
            log::debug!("✅ Dashboard update emitted successfully");
        }

        Ok(())
    }

    async fn get_system_stats() -> Result<SystemStats> {
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
}