#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "macos")]
use self::macos as os;

#[cfg(target_os = "windows")]
mod windows;
#[cfg(target_os = "windows")]
use self::windows as os;


// Placeholder for other OSes
#[cfg(not(any(target_os = "windows", target_os = "macos")))]
mod os {
    pub fn get_app_icon_base64(_app_id: &str) -> anyhow::Result<String> {
        Err(anyhow::anyhow!("Icon extraction not supported on this OS"))
    }
}

pub fn get_app_icon_base64(app_id: &str) -> anyhow::Result<String> {
    os::get_app_icon_base64(app_id)
} 