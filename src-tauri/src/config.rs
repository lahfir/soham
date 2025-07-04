use anyhow::Result;
use directories::ProjectDirs;
use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf};
use toml;

/// Runtime configuration loaded from disk
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub screenshot_interval_secs: u64,
    pub retention_days: u64,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            screenshot_interval_secs: 300,
            retention_days: 30,
        }
    }
}

impl Config {
    pub fn data_dir() -> PathBuf {
        ProjectDirs::from("com", "ExampleCorp", "TrackerAgent")
            .expect("cannot locate data dir")
            .data_local_dir()
            .to_path_buf()
    }

    pub fn path() -> PathBuf {
        Self::data_dir().join("config.toml")
    }

    pub fn load() -> Result<Self> {
        let path = Self::path();
        if path.exists() {
            let bytes = fs::read(path)?;
            let cfg: Self = toml::from_str(std::str::from_utf8(&bytes)?)?;
            Ok(cfg)
        } else {
            Ok(Self::default())
        }
    }
} 