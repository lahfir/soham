use std::fs::File;
use std::path::Path;
use std::process::Command;

use anyhow::{anyhow, Context, Result};
use base64::{engine::general_purpose, Engine as _};
use icns::{IconFamily, Image};
use plist::Value;

fn get_bundle_path_for_app_id(app_id: &str) -> Result<String> {
    let output = Command::new("mdfind")
        .arg(format!("kMDItemCFBundleIdentifier == '{}'", app_id))
        .output()?;

    if !output.status.success() {
        return Err(anyhow!("mdfind command failed to find bundle identifier"));
    }

    let path_str = String::from_utf8(output.stdout)?.trim().to_string();

    let first_path = path_str.lines().next().unwrap_or("").to_string();
    
    if first_path.is_empty() {
        let output_fsname = Command::new("mdfind")
            .arg(format!("kMDItemFSName == '{}.app'", app_id))
            .output()?;

        if !output_fsname.status.success() {
            return Err(anyhow!("mdfind command failed to find by app name"));
        }
        
        let path_fsname_str = String::from_utf8(output_fsname.stdout)?.trim().to_string();
        let first_fsname_path = path_fsname_str.lines().next().unwrap_or("").to_string();

        if first_fsname_path.is_empty() {
            Err(anyhow!("Application not found for id/name: {}", app_id))
        } else {
            Ok(first_fsname_path)
        }
    } else {
        Ok(first_path)
    }
}

fn get_best_image(icon_family: &IconFamily) -> Result<Image> {
    let best_type = icon_family
        .available_icons()
        .into_iter()
        .filter(|t| !t.is_mask())
        .max_by_key(|t| t.pixel_width() * t.pixel_height())
        .ok_or_else(|| anyhow!("No suitable icon found in ICNS file"))?;
    
    icon_family.get_icon_with_type(best_type)
        .with_context(|| format!("Failed to get icon with type {:?}", best_type))
}

pub fn get_app_icon_base64(app_id: &str) -> Result<String> {
    let bundle_path = get_bundle_path_for_app_id(app_id)?;

    let info_plist_path = Path::new(&bundle_path).join("Contents/Info.plist");
    let plist = Value::from_file(&info_plist_path)
        .map_err(|e| anyhow!("Failed to read Info.plist for {}: {}", app_id, e))?;

    let icon_file_name = plist
        .as_dictionary()
        .and_then(|dict| dict.get("CFBundleIconFile"))
        .and_then(|val| val.as_string())
        .ok_or_else(|| anyhow!("CFBundleIconFile not found in Info.plist for {}", app_id))?;

    let icon_path_str = if icon_file_name.ends_with(".icns") {
        icon_file_name.to_string()
    } else {
        format!("{}.icns", icon_file_name)
    };

    let icon_path = Path::new(&bundle_path)
        .join("Contents/Resources")
        .join(&icon_path_str);

    let file = File::open(&icon_path)
        .map_err(|e| anyhow!("Failed to open icon file at {:?}: {}", icon_path, e))?;
    let icon_family = IconFamily::read(file)
        .map_err(|e| anyhow!("Failed to read .icns file {:?}: {}", icon_path_str, e))?;

    let best_icon = get_best_image(&icon_family)
        .map_err(|e| anyhow!("Failed to find best icon for {}: {}", app_id, e))?;

    let mut image_data = Vec::new();
    best_icon.write_png(&mut image_data)
        .map_err(|e| anyhow!("Failed to encode icon to PNG for {}: {}", app_id, e))?;

    Ok(general_purpose::STANDARD.encode(&image_data))
} 