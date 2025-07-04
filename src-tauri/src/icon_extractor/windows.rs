use anyhow::{anyhow, Result};
use base64::{engine::general_purpose, Engine as _};
use image::{ImageBuffer, ImageOutputFormat, Rgba};
use std::io::Cursor;
use std::path::Path;
use winreg::enums::*;
use winreg::RegKey;
use windows_icons::Icon;

pub fn get_app_icon_base64(app_id: &str) -> Result<String> {
    // app_id is likely the executable name, e.g. "Code.exe" or just "Code"
    let app_name = if app_id.ends_with(".exe") {
        app_id.to_string()
    } else {
        format!("{}.exe", app_id)
    };

    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let app_paths_key = hklm.open_subkey_with_flags(
        format!(
            r"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\{}",
            app_name
        ),
        KEY_READ,
    )?;

    let exe_path_str: String = app_paths_key.get_value("")?;
    let exe_path = Path::new(&exe_path_str);

    if !exe_path.exists() {
        return Err(anyhow!("Executable not found at path: {}", exe_path_str));
    }

    let icon = Icon::from_path(exe_path, Some(windows_icons::IconSize::Medium))?;
    let icon_dir = icon.get_ico()?;

    let best_entry = icon_dir
        .entries()
        .iter()
        .max_by_key(|entry| entry.width() * entry.height())
        .ok_or_else(|| anyhow!("No icons found in executable"))?;

    let image = best_entry.decode()?;
    let rgba_image = image.rgba_data();

    // Create an image buffer from raw data
    let img_buffer =
        ImageBuffer::<Rgba<u8>, _>::from_raw(image.width(), image.height(), rgba_image)
            .ok_or_else(|| anyhow!("Failed to create image buffer from raw icon data"))?;

    let mut png_data = Vec::new();
    img_buffer.write_to(&mut Cursor::new(&mut png_data), ImageOutputFormat::Png)?;

    Ok(general_purpose::STANDARD.encode(&png_data))
} 