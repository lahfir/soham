use active_win_pos_rs::get_active_window;
use anyhow::Result;
use chrono::Utc;
use std::{thread, time::Duration, collections::{HashSet, HashMap}, sync::{Mutex, Arc}};
use sysinfo::{Pid, ProcessExt, System, SystemExt};
use tauri::{AppHandle, Manager};

use crate::{state::AppState, events::handle_new_activity};

#[cfg(target_os = "macos")]
fn is_application(proc: &sysinfo::Process) -> bool {
    proc.exe().to_string_lossy().contains(".app/")
}

#[cfg(not(target_os = "macos"))]
fn is_application(_proc: &sysinfo::Process) -> bool {
    // On non-macOS, we might need a more sophisticated check,
    // but for now, we assume most processes with a window are apps.
    true
}

pub struct ActivityPoller {
    last_active_app: Arc<Mutex<Option<String>>>,
    last_switch_time: Arc<Mutex<Option<chrono::DateTime<chrono::Utc>>>>,
    known_pids: HashSet<Pid>,
}

const POLL_INTERVAL_S: u64 = 2;
const PROCESS_REFRESH_INTERVAL_S: u64 = 10;

impl ActivityPoller {
    pub fn spawn(app_state: AppState, app_handle: AppHandle) {
        thread::spawn(move || {
            let mut sys = System::new_all();
            sys.refresh_processes();
            
            let mut poller = Self {
                last_active_app: Arc::new(Mutex::new(None)),
                last_switch_time: Arc::new(Mutex::new(None)),
                known_pids: sys.processes().keys().cloned().collect(),
            };

            let mut loop_counter = 0;
            loop {
                thread::sleep(Duration::from_secs(POLL_INTERVAL_S));

                if loop_counter % (PROCESS_REFRESH_INTERVAL_S / POLL_INTERVAL_S) == 0 {
                    poller.check_for_new_or_closed_apps(&mut sys, &app_handle, &app_state);
                }

                if let Err(e) = poller.poll_active_window(&app_state, &sys) {
                    eprintln!("❌ Error polling for active window: {}", e);
                }
                
                loop_counter += 1;
            }
        });
    }

    fn poll_active_window(&mut self, app_state: &AppState, sys: &System) -> Result<()> {
        if *app_state.paused.lock().unwrap() {
            return Ok(());
        }

        let active_window = match get_active_window() {
            Ok(win) => win,
            Err(_) => return Ok(()),
        };
        
        let pid = active_window.process_id as i32;
        let proc = match sys.process(Pid::from(pid as usize)) {
            Some(p) => p,
            None => return Ok(()),
        };
        
        if !is_application(proc) {
            return Ok(());
        }

        let app_name = proc.name().to_string();

        handle_new_activity(
            app_state,
            app_state.get_app_handle().unwrap(), // Simplified access to app_handle
            app_name,
            pid,
            &mut self.last_active_app.lock().unwrap(),
            &mut self.last_switch_time.lock().unwrap(),
        )?;

        Ok(())
    }

    fn check_for_new_or_closed_apps(&mut self, sys: &mut System, app_handle: &AppHandle, app_state: &AppState) {
        sys.refresh_processes();
        let current_pids: HashSet<Pid> = sys.processes().keys().cloned().collect();

        // Detect and handle closed apps
        for pid in self.known_pids.difference(&current_pids) {
            if let Some(proc) = sys.process(*pid) {
                if is_application(proc) {
                    println!("❌ App CLOSED: {} (PID: {})", proc.name(), pid);
                    // Optionally emit a specific app-close event
                }
            }
        }

        // Detect and handle new apps
        for pid in current_pids.difference(&self.known_pids) {
            if let Some(proc) = sys.process(*pid) {
                if is_application(proc) {
                    println!("✅ App OPENED: {} (PID: {})", proc.name(), pid);
                    // Optionally emit a specific app-open event
                }
            }
        }

        self.known_pids = current_pids;
    }
} 