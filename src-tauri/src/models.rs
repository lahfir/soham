use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum EventType {
    Focus,
    Blur,
    AppOpen,
    AppClose,
    WindowCreate,
    WindowDestroy,
}

impl EventType {
    pub fn as_str(&self) -> &'static str {
        match self {
            EventType::Focus => "focus",
            EventType::Blur => "blur",
            EventType::AppOpen => "app_open",
            EventType::AppClose => "app_close",
            EventType::WindowCreate => "window_create",
            EventType::WindowDestroy => "window_destroy",
        }
    }
}

impl std::str::FromStr for EventType {
    type Err = crate::error::AppError;
    
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "focus" => Ok(EventType::Focus),
            "blur" => Ok(EventType::Blur),
            "app_open" => Ok(EventType::AppOpen),
            "app_close" => Ok(EventType::AppClose),
            "window_create" => Ok(EventType::WindowCreate),
            "window_destroy" => Ok(EventType::WindowDestroy),
            _ => Err(crate::error::AppError::InvalidInput(format!("Unknown event type: {}", s))),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum TransitionType {
    AppSwitch,
    WindowSwitch,
    NewWindow,
    CloseWindow,
}

impl TransitionType {
    pub fn as_str(&self) -> &'static str {
        match self {
            TransitionType::AppSwitch => "app_switch",
            TransitionType::WindowSwitch => "window_switch",
            TransitionType::NewWindow => "new_window",
            TransitionType::CloseWindow => "close_window",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct WindowActivity {
    pub id: Option<i64>,
    pub session_id: i64,
    pub app_id: String,
    pub window_title: String,
    pub event_type: String,
    pub timestamp: DateTime<Utc>,
    pub duration: Option<i64>,
    pub metadata: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AppStats {
    pub app_id: String,
    pub total_duration: i64,
    pub session_count: i64,
    pub last_used: DateTime<Utc>,
    pub percentage: f64,
    pub window_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Session {
    pub id: i64,
    pub start_time: DateTime<Utc>,
    pub end_time: Option<DateTime<Utc>>,
    pub duration: Option<i64>,
    pub activity_count: i64,
    pub screenshot_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Screenshot {
    pub id: i64,
    pub session_id: i64,
    pub path: String,
    pub timestamp: DateTime<Utc>,
    pub file_size: i64,
    pub app_id: Option<String>,
    pub window_title: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ActivityHeatmapData {
    pub date: String,
    pub hour: i32,
    pub activity_count: i64,
    pub duration: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ActivityHeatmapMonthData {
    pub year: i32,
    pub month: i32,
    pub day: i32,
    pub activity_count: i64,
    pub duration: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ActivityHeatmapYearData {
    pub year: i32,
    pub month: i32,
    pub activity_count: i64,
    pub duration: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AppLifecycleFlow {
    pub id: i64,
    pub app_id: String,
    pub window_title: String,
    pub event_type: String,
    pub timestamp: DateTime<Utc>,
    pub duration: Option<i64>,
    pub position: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimelineEvent {
    pub timestamp: DateTime<Utc>,
    pub event_type: EventType,
    pub app_id: String,
    pub window_title: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardData {
    pub app_stats: Vec<AppStats>,
    pub heatmap_data: Vec<ActivityHeatmapData>,
    pub active_sessions: Vec<Session>,
    pub recent_screenshots: Vec<Screenshot>,
    pub system_stats: SystemStats,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemStats {
    pub cpu_usage: f32,
    pub memory_usage: f64,
    pub disk_usage: f64,
    pub uptime: u64,
    pub process_count: u32,
}