#[cfg(target_os = "macos")]
pub fn get_app_icon_base64(app_id: &str) -> anyhow::Result<String> {
    use std::process::Command;

    let output = Command::new("osascript")
        .arg("-e")
        .arg(format!(
            r#"tell application "System Events"
                try
                    set app_path to file of application process "{}"
                    set info_for to info for app_path
                    return POSIX path of app_path
                end try
            end tell"#,
            app_id
        ))
        .output()?;

    if !output.status.success() {
        return Err(anyhow::anyhow!("Failed to get app path for {}", app_id));
    }

    let app_path_output = String::from_utf8_lossy(&output.stdout);
    let app_path = app_path_output.trim();
    
    let icon_output = Command::new("osascript")
        .arg("-e")
        .arg(format!(
            r#"use framework "AppKit"
            use framework "Foundation"
            
            set appPath to "{}"
            set workspace to current application's NSWorkspace's sharedWorkspace()
            set appIcon to workspace's iconForFile:appPath
            set tiffData to appIcon's TIFFRepresentation()
            set base64String to tiffData's base64EncodedStringWithOptions:0
            return base64String as string"#,
            app_path
        ))
        .output()?;

    if !icon_output.status.success() {
        return Err(anyhow::anyhow!("Failed to extract icon for {}", app_id));
    }

    let icon_output_str = String::from_utf8_lossy(&icon_output.stdout);
    let icon_data = icon_output_str.trim();
    Ok(format!("data:image/tiff;base64,{}", icon_data))
}

#[cfg(target_os = "windows")]
pub fn get_app_icon_base64(app_id: &str) -> anyhow::Result<String> {
    // Placeholder Windows implementation
    Err(anyhow::anyhow!("Windows icon extraction not yet implemented for {}", app_id))
}

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
pub fn get_app_icon_base64(_app_id: &str) -> anyhow::Result<String> {
    Err(anyhow::anyhow!("Icon extraction not supported on this OS"))
} 