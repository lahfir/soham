export interface WindowActivity {
    ts: number;
    event_type: string;
    window_title: string;
    app_id: string;
    pid: number;
}

export interface Screenshot {
    id: number;
    ts: number;
    file_path: string;
    screen_id: number;
}

export interface TimeLog {
    id: number;
    app_id: string;
    window_title: string;
    focus_start: number;
    focus_end: number;
    duration: number;
}

export interface AuditEvent {
    id: number;
    ts: number;
    level: string;
    message: string;
}

export interface AppStats {
    app_id: string;
    total_duration: number;
    session_count: number;
    avg_session_duration: number;
}

export interface DailyStats {
    date: string;
    total_duration: number;
    unique_apps: number;
    screenshot_count: number;
}

export interface DashboardStats {
    totalApps: number;
    totalSessions: number;
    todayScreenshots: number;
    todayDuration: number;
    isTracking: boolean;
    lastActivity: string;
} 