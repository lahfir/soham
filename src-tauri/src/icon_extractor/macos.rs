use anyhow::{anyhow, Result};
use base64::{engine::general_purpose::STANDARD, Engine as _};
use icns::IconFamily;
use plist::Value;
use std::{
    fs::File,
    io::Cursor,
    path::PathBuf,
};

fn find_app_path(app_id: &str) -> Option<PathBuf> {
    let app_name = format!("{}.app", app_id);
    let common_dirs = [
        PathBuf::from("/Applications"),
        dirs::home_dir().map(|h| h.join("Applications")).unwrap_or_default(),
    ];

    for dir in &common_dirs {
        let app_path = dir.join(&app_name);
        if app_path.exists() {
            return Some(app_path);
        }
    }
    None
}

fn get_best_image(icon_family: &IconFamily) -> Result<icns::Image> {
    let best_type = icon_family
        .available_icons()
        .into_iter()
        .filter(|t| !t.is_mask())
        .max_by_key(|t| t.pixel_width() * t.pixel_height())
        .ok_or_else(|| anyhow!("No suitable icon found in ICNS file"))?;

    Ok(icon_family.get_icon_with_type(best_type)?)
}

pub fn get_icon_for_app(app_id: &str) -> Result<String> {
    let app_path = find_app_path(app_id).ok_or_else(|| anyhow!("Application '{}' not found", app_id))?;

    let plist_path = app_path.join("Contents/Info.plist");
    let plist_val = Value::from_file(&plist_path)?;

    let icon_file_name = plist_val
        .as_dictionary()
        .and_then(|dict| dict.get("CFBundleIconFile"))
        .and_then(|val| val.as_string())
        .ok_or_else(|| anyhow!("Could not find CFBundleIconFile in Info.plist"))?;

    let mut icon_path = app_path.join("Contents/Resources").join(icon_file_name);
    if icon_path.extension().is_none() {
        icon_path.set_extension("icns");
    }

    let file = File::open(&icon_path)?;
    let icon_family = IconFamily::read(file)?;

    let image = get_best_image(&icon_family)?;
    
    let mut png_buffer = Cursor::new(Vec::new());
    image.write_png(&mut png_buffer)?;

    let base64_icon = STANDARD.encode(png_buffer.get_ref());
    Ok(format!("data:image/png;base64,{}", base64_icon))
} 