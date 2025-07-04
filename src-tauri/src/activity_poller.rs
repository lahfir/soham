use active_win_pos_rs::get_active_window;
use anyhow::Result;
use chrono::Utc;
use std::{thread, time::Duration};
use sysinfo::{Pid, System};

use crate::state::AppState;

pub struct ActivityPoller;

const POLL_INTERVAL_S: u64 = 5;

impl ActivityPoller {
    pub fn spawn(app_state: AppState) {
        thread::spawn(move || {
            let mut sys = System::new_all();
            loop {
                thread::sleep(Duration::from_secs(POLL_INTERVAL_S));
                if let Err(e) = Self::step(&app_state, &mut sys) {
                    let _ = app_state
                        .db
                        .insert_audit("error", &format!("activity poller error: {:?}", e));
                }
            }
        });
    }

    fn step(app_state: &AppState, sys: &mut System) -> Result<()> {
        let paused = *app_state.paused.lock().unwrap();
        if paused {
            return Ok(());
        }

        let win = match get_active_window() {
            Ok(w) => w,
            Err(_) => return Ok(()),
        };

        let ts = Utc::now().timestamp();
        let pid = win.process_id as i32;
        sys.refresh_processes();
        let app_name = sys
            .process(Pid::from(pid as usize))
            .map(|p| p.name().to_string())
            .unwrap_or_else(|| format!("pid:{}", pid));

        app_state
            .db
            .insert_activity_pulse(ts, &app_name, &win.title, POLL_INTERVAL_S as i64)?;

        Ok(())
    }
} 