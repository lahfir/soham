use std::sync::{Arc, Mutex};
use crate::{db::Db, config::Config};

/// Global application state shared across threads
pub struct AppState {
    pub db: Arc<Db>,
    pub config: Arc<Mutex<Config>>,
    pub paused: Arc<Mutex<bool>>,
}

impl AppState {
    pub fn new(db: Arc<Db>, config: Config) -> Self {
        Self {
            db,
            config: Arc::new(Mutex::new(config)),
            paused: Arc::new(Mutex::new(false)),
        }
    }
} 