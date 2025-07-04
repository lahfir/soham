use crate::db::Db;
use std::sync::{Arc, Mutex};
use sysinfo::{System, SystemExt};

#[derive(Clone)]
/// Global application state shared across threads
pub struct AppState {
    pub db: Arc<Db>,
    pub sys: Arc<Mutex<System>>,
    pub paused: Arc<Mutex<bool>>,
    pub current_session: Arc<Mutex<i64>>,
}

impl AppState {
    pub fn new(db: Arc<Db>) -> Self {
        Self {
            db,
            sys: Arc::new(Mutex::new(System::new_all())),
            paused: Arc::new(Mutex::new(false)),
            current_session: Arc::new(Mutex::new(-1)),
        }
    }
} 