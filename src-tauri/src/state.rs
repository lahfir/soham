use std::sync::Arc;
use tokio::sync::RwLock;

use crate::cache::CacheManager;
use crate::database::{DatabasePool, Repository};

pub struct AppState {
    pub repository: Repository,
    pub cache: Arc<CacheManager>,
    paused: Arc<RwLock<bool>>,
    current_session_id: Arc<RwLock<i64>>,
}

impl AppState {
    pub fn new(db_pool: DatabasePool) -> Self {
        Self {
            repository: Repository::new(db_pool.pool().clone()),
            cache: Arc::new(CacheManager::new()),
            paused: Arc::new(RwLock::new(false)),
            current_session_id: Arc::new(RwLock::new(0)),
        }
    }

    pub async fn set_paused(&self, paused: bool) {
        *self.paused.write().await = paused;
    }

    pub async fn is_paused(&self) -> bool {
        *self.paused.read().await
    }

    pub async fn set_current_session_id(&self, session_id: i64) {
        *self.current_session_id.write().await = session_id;
    }

    pub async fn get_current_session_id(&self) -> i64 {
        *self.current_session_id.read().await
    }
}

impl Clone for AppState {
    fn clone(&self) -> Self {
        Self {
            repository: Repository::new(self.repository.pool().clone()),
            cache: Arc::clone(&self.cache),
            paused: Arc::clone(&self.paused),
            current_session_id: Arc::clone(&self.current_session_id),
        }
    }
}