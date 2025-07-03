use screenshots::Screen;
use anyhow::{Result, anyhow};
use chrono::Utc;
use std::{thread, time::Duration, sync::Arc};
use image;

use crate::{config::Config, db::Db};

pub struct ScreenshotService;

impl ScreenshotService {
    pub fn spawn(db: Arc<Db>, config: Config) {
        thread::spawn(move || {
            let interval = Duration::from_secs(config.screenshot_interval_secs);
            loop {
                if let Err(e) = Self::capture(&db) {
                    let _ = db.insert_audit("error", &format!("screenshot error: {e}"));
                }
                thread::sleep(interval);
            }
        });
    }

    fn capture(db: &Arc<Db>) -> Result<()> {
        let ts = Utc::now().timestamp();
        let screens = Screen::all()?;
        let screen = screens.first().ok_or(anyhow!("no screens found"))?;
        let image = screen.capture()?;
        let dir = Config::data_dir()
            .join("screenshots")
            .join(Utc::now().format("%Y/%m/%d").to_string());
        std::fs::create_dir_all(&dir)?;
        let path = dir.join(format!("{ts}.png"));
        let dyn_img = image::DynamicImage::ImageRgba8(image.clone());
        dyn_img.save(&path)?;
        db.insert_screenshot(ts, path.to_string_lossy().as_ref(), screen.display_info.id as i32)?;
        Ok(())
    }
} 