#[cfg(target_os = "macos")]
pub mod macos;

#[cfg(target_os = "windows")]
pub mod windows;

#[cfg(target_os = "linux")]
pub mod linux;

use anyhow::Result;

/// Gets the application icon as a base64 encoded PNG.
/// The `app_id` is typically the executable name (e.g., "Code").
pub fn get_app_icon_base64(app_id: &str) -> Result<String> {
    #[cfg(target_os = "macos")]
    {
        macos::get_icon_for_app(app_id)
    }
    #[cfg(not(target_os = "macos"))]
    {
        // Placeholder for other platforms
        anyhow::bail!("Icon extraction not implemented for this platform");
    }
} 