import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export interface RealtimeData {
    app_stats: Array<{
        app_id: string;
        total_duration: number;
        session_count: number;
        avg_session_duration: number;
    }>;
    daily_stats: Array<{
        date: string;
        total_duration: number;
        unique_apps: number;
        screenshot_count: number;
    }>;
    recent_activities: Array<{
        ts: number;
        event_type: string;
        window_title: string;
        app_id: string;
        pid: number;
    }>;
    recent_screenshots: Array<{
        id: number;
        ts: number;
        file_path: string;
        screen_id: number;
    }>;
    timestamp: number;
}

export function useRealtime() {
    const [data, setData] = useState<RealtimeData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchInitialData = useCallback(async () => {
        try {
            setIsLoading(true);
            const result = await invoke('get_realtime_dashboard_data');
            setData(result as RealtimeData);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch data');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchInitialData();

        const setupListener = async () => {
            const unlisten = await listen('dashboard-update', (event) => {
                const payload = event.payload as RealtimeData;
                setData(payload);
            });

            return unlisten;
        };

        let unlistenPromise: Promise<() => void> | null = null;

        setupListener().then(unlisten => {
            unlistenPromise = Promise.resolve(unlisten);
        });

        return () => {
            if (unlistenPromise) {
                unlistenPromise.then(unlisten => unlisten());
            }
        };
    }, [fetchInitialData]);

    const refresh = useCallback(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    return {
        data,
        isLoading,
        error,
        refresh
    };
} 