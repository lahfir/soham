use screenshots::Screen;
use anyhow::{Result, anyhow};
use chrono::Utc;
use std::{thread, time::Duration, sync::{Arc, Mutex}};
use base64::{engine::general_purpose, Engine as _};
use serde_json;
use tauri::{AppHandle, Emitter};

use crate::{config::Config, db::Db};

pub struct ScreenshotService;

impl ScreenshotService {
    pub fn spawn(
        db: Arc<Db>,
        session: Arc<Mutex<i64>>,
        app_handle: AppHandle,
        interval_secs: u64,
    ) {
        thread::spawn(move || {
            let interval = Duration::from_secs(interval_secs.max(1));
            loop {
                if let Err(e) = Self::capture(&db, &session, &app_handle) {
                    let _ = db.insert_audit("error", &format!("screenshot error: {e}"));
                }
                thread::sleep(interval);
            }
        });
    }

    fn capture(db: &Arc<Db>, session_arc: &Arc<Mutex<i64>>, app_handle: &AppHandle) -> Result<()> {
        let ts = Utc::now().timestamp();
        let screens = Screen::all()?;
        let screen = screens.first().ok_or(anyhow!("no screens found"))?;
        let image = screen.capture()?;

        let dir = Config::data_dir()
            .join("screenshots")
            .join(Utc::now().format("%Y/%m/%d").to_string());
        std::fs::create_dir_all(&dir)?;
        let path = dir.join(format!("{ts}.png"));
        image.save(&path)?;

        let session_id = *session_arc.lock().unwrap();
        db.insert_screenshot_with_session(
            session_id,
            ts,
            path.to_string_lossy().as_ref(),
            screen.display_info.id as i32,
        )?;

        let encoded = general_purpose::STANDARD.encode(std::fs::read(&path)?);
        let payload = serde_json::json!({
            "session_id": session_id,
            "ts": ts,
            "path": path.to_string_lossy(),
            "base64": encoded,
        });
        let _ = app_handle.emit("screenshot-taken", payload);
        Ok(())
    }
} 