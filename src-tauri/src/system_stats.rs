use crate::state::AppState;
use sysinfo::{CpuExt, DiskExt, SystemExt};
use tauri::State;

#[derive(serde::Serialize, Clone)]
pub struct SystemStats {
    cpu_usage: f32,
    total_memory: u64,
    used_memory: u64,
    total_disk_space: u64,
    available_disk_space: u64,
    process_count: usize,
}

#[tauri::command]
pub fn get_system_stats(state: State<AppState>) -> SystemStats {
    let mut sys = state.sys.lock().unwrap();
    sys.refresh_all();

    let total_disk_space: u64 = sys.disks().iter().map(|d| d.total_space()).sum();
    let available_disk_space: u64 = sys.disks().iter().map(|d| d.available_space()).sum();

    SystemStats {
        cpu_usage: sys.global_cpu_info().cpu_usage(),
        total_memory: sys.total_memory(),
        used_memory: sys.used_memory(),
        total_disk_space,
        available_disk_space,
        process_count: sys.processes().len(),
    }
} 