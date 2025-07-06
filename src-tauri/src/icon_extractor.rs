#[cfg(target_os = "macos")]
pub fn get_app_icon_base64(app_id: &str) -> anyhow::Result<String> {

    log::debug!("Extracting icon for app: {}", app_id);

    // First check if we have accessibility permissions
    if !check_accessibility_permissions() {
        log::warn!("Accessibility permissions not granted, falling back to default icon");
        return create_fallback_icon(app_id);
    }

    // Try to get app path using System Events
    let app_path = get_app_path(app_id)?;
    log::debug!("Found app path: {}", app_path);
    
    // Extract icon and convert to PNG
    extract_icon_as_png(&app_path)
}

#[cfg(target_os = "macos")]
fn check_accessibility_permissions() -> bool {
    use std::process::Command;
    
    let check_script = r#"
    tell application "System Events"
        try
            get processes
            return true
        on error
            return false
        end try
    end tell
    "#;
    
    let result = Command::new("osascript")
        .arg("-e")
        .arg(check_script)
        .output();
    
    match result {
        Ok(output) => {
            let output_str = String::from_utf8_lossy(&output.stdout);
            output_str.trim() == "true"
        }
        Err(_) => false,
    }
}

#[cfg(target_os = "macos")]
fn get_app_path(app_id: &str) -> anyhow::Result<String> {
    use std::process::Command;

    let output = Command::new("osascript")
        .arg("-e")
        .arg(format!(
            r#"tell application "System Events"
                try
                    set app_path to file of application process "{}"
                    return POSIX path of app_path
                on error err_msg
                    error "Cannot find running process: " & err_msg
                end try
            end tell"#,
            app_id
        ))
        .output()?;

    if !output.status.success() {
        let error_msg = String::from_utf8_lossy(&output.stderr);
        log::warn!("Failed to get app path for {}: {}", app_id, error_msg);
        return Err(anyhow::anyhow!("Failed to get app path for {}: {}", app_id, error_msg));
    }

    let app_path_output = String::from_utf8_lossy(&output.stdout);
    let app_path = app_path_output.trim();
    
    if app_path.is_empty() {
        return Err(anyhow::anyhow!("Empty app path returned for {}", app_id));
    }
    
    Ok(app_path.to_string())
}

#[cfg(target_os = "macos")]
fn extract_icon_as_png(app_path: &str) -> anyhow::Result<String> {
    use std::process::Command;

    let icon_script = format!(
        r#"use framework "AppKit"
        use framework "Foundation"
        use framework "CoreGraphics"
        
        set appPath to "{}"
        set workspace to current application's NSWorkspace's sharedWorkspace()
        set appIcon to workspace's iconForFile:appPath
        
        -- Resize icon to standard size (64x64)
        set iconSize to current application's NSMakeSize(64, 64)
        set resizedIcon to current application's NSImage's alloc()'s initWithSize:iconSize
        resizedIcon's lockFocus()
        appIcon's drawInRect:(current application's NSMakeRect(0, 0, 64, 64)) fromRect:(current application's NSZeroRect) operation:(current application's NSCompositingOperationCopy) fraction:1.0
        resizedIcon's unlockFocus()
        
        -- Convert to PNG
        set imageRep to resizedIcon's representations()'s objectAtIndex:0
        set pngData to imageRep's representationUsingType:(current application's NSBitmapImageFileTypePNG) |properties|:(missing value)
        set base64String to pngData's base64EncodedStringWithOptions:0
        return base64String as string"#,
        app_path
    );

    let icon_output = Command::new("osascript")
        .arg("-e")
        .arg(icon_script)
        .output()?;

    if !icon_output.status.success() {
        let error_msg = String::from_utf8_lossy(&icon_output.stderr);
        log::warn!("Failed to extract PNG icon: {}", error_msg);
        return Err(anyhow::anyhow!("Failed to extract PNG icon: {}", error_msg));
    }

    let icon_output_str = String::from_utf8_lossy(&icon_output.stdout);
    let icon_data = icon_output_str.trim();
    
    if icon_data.is_empty() {
        return Err(anyhow::anyhow!("Empty icon data returned"));
    }
    
    log::debug!("Successfully extracted PNG icon (size: {} chars)", icon_data.len());
    Ok(format!("data:image/png;base64,{}", icon_data))
}

#[cfg(target_os = "macos")]
pub fn create_fallback_icon(app_id: &str) -> anyhow::Result<String> {
    use base64::Engine;
    
    log::info!("Creating fallback icon for app: {}", app_id);
    
    // Create a simple SVG icon with the app name initial
    let initial = app_id.chars().next().unwrap_or('A').to_uppercase().to_string();
    let color = get_color_for_app(app_id);
    
    let svg_content = format!(
        r#"<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
            <rect width="64" height="64" rx="12" fill="{}"/>
            <text x="32" y="42" font-family="system-ui, -apple-system, sans-serif" 
                  font-size="28" font-weight="600" fill="white" text-anchor="middle">{}</text>
        </svg>"#,
        color, initial
    );
    
    let base64_svg = base64::engine::general_purpose::STANDARD.encode(svg_content.as_bytes());
    Ok(format!("data:image/svg+xml;base64,{}", base64_svg))
}

#[cfg(target_os = "macos")]
fn get_color_for_app(app_id: &str) -> &'static str {
    // Generate a consistent color based on app name
    let colors = [
        "#3B82F6", "#EF4444", "#10B981", "#F59E0B", 
        "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16"
    ];
    
    let hash = app_id.chars().map(|c| c as usize).sum::<usize>();
    colors[hash % colors.len()]
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