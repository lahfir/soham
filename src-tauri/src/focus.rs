use active_win_pos_rs::get_active_window;
use anyhow::Result;
use chrono::Utc;
use std::{thread, time::Duration, sync::Arc, collections::HashMap};
use sysinfo::{System, Pid};

use crate::db::Db;

pub struct FocusTracker;

impl FocusTracker {
    pub fn spawn(db: Arc<Db>) {
        thread::spawn(move || {
            let mut current_app = String::new();
            let mut current_title = String::new();
            let mut start_ts = Utc::now().timestamp();
            let mut totals: HashMap<String, i64> = HashMap::new();
            let mut sys = System::new();
            loop {
                if let Err(e) = Self::step(&db, &mut current_app, &mut current_title, &mut start_ts, &mut totals, &mut sys) {
                    let _ = db.insert_audit("error", &format!("focus tracker error: {e}"));
                }
                thread::sleep(Duration::from_secs(1));
            }
        });
    }

    fn step(
        db: &Arc<Db>,
        current_app: &mut String,
        current_title: &mut String,
        start_ts: &mut i64,
        totals: &mut HashMap<String, i64>,
        sys: &mut System,
    ) -> Result<()> {
        let win = match get_active_window() {
            Ok(w) => w,
            Err(_) => return Ok(()),
        };
        let pid = win.process_id as i32;
        sys.refresh_processes();
        let app_name = sys
            .process(Pid::from(pid as usize))
            .map(|p| p.name().to_string())
            .unwrap_or_else(|| format!("pid:{pid}"));
        let title = win.title.clone();
        if &app_name != current_app || &title != current_title {
            let end_ts = Utc::now().timestamp();
            let duration = end_ts - *start_ts;
            if duration > 0 && !current_app.is_empty() {
                db.insert_time_log(current_app, current_title, *start_ts, end_ts, duration)?;
                let key = format!("{}", current_app);
                let entry = totals.entry(key.clone()).or_insert(0);
                *entry += duration;
                println!(
                    "[FocusTracker] Switched from '{}' (session {}s, total {}s)",
                    current_app,
                    duration,
                    *entry
                );
            }
            *current_app = app_name;
            *current_title = title;
            *start_ts = end_ts;
            println!("[FocusTracker] Now focusing '{}'", current_app);
        }
        Ok(())
    }
} 