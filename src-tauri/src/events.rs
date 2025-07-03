use active_win_pos_rs::get_active_window;
use anyhow::Result;
use chrono::Utc;
use std::{thread, time::Duration, sync::Arc};
use sysinfo::{System, Pid};

use crate::db::Db;

pub struct EventPoller;

impl EventPoller {
    pub fn spawn(db: Arc<Db>) {
        thread::spawn(move || {
            let mut sys = System::new();
            let mut last_title = String::new();
            let mut last_pid: i32 = 0;
            loop {
                if let Err(e) = Self::poll(&db, &mut last_title, &mut last_pid, &mut sys) {
                    let _ = db.insert_audit("error", &format!("event poller error: {e}"));
                }
                thread::sleep(Duration::from_secs(1));
            }
        });
    }

    fn poll(
        db: &Arc<Db>,
        last_title: &mut String,
        last_pid: &mut i32,
        sys: &mut System,
    ) -> Result<()> {
        let win = match get_active_window() {
            Ok(w) => w,
            Err(_) => return Ok(()),
        };
        let title = win.title.clone();
        let pid = win.process_id as i32;

        if &title != last_title || pid != *last_pid {
            // refresh process info to resolve app name
            sys.refresh_processes();
            let app_name = sys
                .process(Pid::from(pid as usize))
                .map(|p| p.name().to_string())
                .unwrap_or_else(|| format!("pid:{pid}"));

            let ts = Utc::now().timestamp();
            db.insert_window_event(ts, "focus", &title, &app_name, pid)?;
            println!(
                "[EventPoller] App: {app_name} | Window: {title} (pid {pid})"
            );

            *last_title = title;
            *last_pid = pid;
        }
        Ok(())
    }
} 