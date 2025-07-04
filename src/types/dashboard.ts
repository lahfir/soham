export interface AppStat {
    app_id: string;
    total_duration: number;
    session_count: number;
    avg_duration: number;
    last_seen: number;
}

export interface DailyStat {
    date: string;
    total_duration: number;
    unique_apps: number;
    screenshot_count: number;
}

export interface Screenshot {
    path: string;
    ts: number;
}

export interface RecentActivity {
    ts: number;
    event_type: string;
    window_title: string;
    app_id: string;
    pid: number;
}

export interface HeatmapData {
    day_of_week: number;
    hour_of_day: number;
    total_duration: number;
}

export interface HeatmapMonthData {
    day_of_month: number;
    hour_of_day: number;
    total_duration: number;
}

export interface HeatmapYearData {
    day_of_year: number;
    hour_of_day: number;
    total_duration: number;
}

export interface DashboardData {
    app_stats: AppStat[];
    daily_stats: DailyStat[];
    recent_activities: RecentActivity[];
    recent_screenshots: Screenshot[];
    heatmap_data: HeatmapData[];
}

export interface ActivityPayload {
    ts: number;
    app: string;
    window_title: string;
    pid: number;
    path: string;
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

export interface AppLifecycleEvent {
    ts: number;
    app_id: string;
    event_type: 'open' | 'close';
}

export interface HistoricalEvent {
    ts: number;
    event_type: string;
    details: any;
}

export interface AppLifecycleFlow {
    from_app: string;
    to_app: string;
    transition_type: string;
    time: string;
    created_at: number;
} 