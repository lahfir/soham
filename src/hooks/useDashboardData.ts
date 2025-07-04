import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { AppStat, HeatmapData } from '@/types/dashboard';

export interface DashboardQuery {
    app_stats: AppStat[];
    heatmap_data: HeatmapData[];
}

export function useDashboardData(range: { from: Date; to: Date }, options?: { enableRealtime?: boolean }) {
    const [data, setData] = useState<DashboardQuery | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!range.from || !range.to) return;

        setIsLoading(true);
        try {
            const from = Math.floor(range.from.getTime() / 1000);
            const to = Math.floor(range.to.getTime() / 1000);
            const result = await invoke<DashboardQuery>('get_dashboard_data', { from, to });
            setData(result);
            setError(null);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch dashboard data';
            console.error(message, err);
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, [range]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (options?.enableRealtime) {
            const unlisten = listen('dashboard-update', () => {
                console.log('Received dashboard-update, refetching data for current range.');
                fetchData();
            });

            return () => {
                unlisten.then(f => f());
            };
        }
    }, [fetchData, options?.enableRealtime]);

    return { data, isLoading, error, refresh: fetchData };
}

