import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { HeatmapData, HeatmapMonthData, HeatmapYearData } from '@/types/dashboard';

export type HeatmapRange = 'week' | 'month' | 'year';

export interface HeatmapDataUnion {
    week: HeatmapData[];
    month: HeatmapMonthData[];
    year: HeatmapYearData[];
}

export function useHeatmapData(range: { from: Date; to: Date }, rangeType: HeatmapRange) {
    const [data, setData] = useState<HeatmapData[] | HeatmapMonthData[] | HeatmapYearData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!range.from || !range.to) return;

        setIsLoading(true);
        try {
            const from = Math.floor(range.from.getTime() / 1000);
            const to = Math.floor(range.to.getTime() / 1000);

            const result = await invoke('get_heatmap_data', {
                from,
                to,
                rangeType
            });

            setData(result as any);
            setError(null);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch heatmap data';
            console.error(message, err);
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, [range, rangeType]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { data, isLoading, error, refresh: fetchData };
} 