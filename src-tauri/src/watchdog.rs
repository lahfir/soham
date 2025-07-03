use chrono::Utc;
use std::{thread, time::Duration, sync::Arc};

use crate::db::Db;

pub struct Watchdog;

impl Watchdog {
    pub fn spawn(db: Arc<Db>) {
        thread::spawn(move || loop {
            thread::sleep(Duration::from_secs(60));
            let _ = db.insert_audit("info", &format!("heartbeat {}", Utc::now()));
        });
    }
} 