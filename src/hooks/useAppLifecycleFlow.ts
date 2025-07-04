import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { format } from 'date-fns';
import { AppLifecycleFlow } from '@/types/dashboard';

export interface AppTransitionEvent {
    from_app: string;
    to_app: string;
    transition_type: string;
    timestamp: number;
}

export interface FlowStats {
    apps: number;
    transitions: number;
}

export interface FlowData {
    flows: AppLifecycleFlow[];
    stats: FlowStats;
}

export interface UseAppLifecycleFlowOptions {
    enableRealtime?: boolean;
    autoRefresh?: boolean;
    sessionId?: number;
}

/**
 * Hook for managing app lifecycle flow data with real-time updates
 * @param date - The date to fetch flow data for
 * @param options - Configuration options for the hook
 * @returns Object containing flow data, loading state, error state, and utility functions
 */
export function useAppLifecycleFlow(
    date: Date,
    options: UseAppLifecycleFlowOptions = {}
) {
    const [data, setData] = useState<FlowData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastFetched, setLastFetched] = useState<Date | null>(null);

    const { enableRealtime = true, autoRefresh = true, sessionId } = options;

    const fetchFlowData = useCallback(async (targetDate: Date) => {
        setIsLoading(true);
        setError(null);

        try {
            let flowData: AppLifecycleFlow[];
            if (sessionId !== undefined) {
                console.log('🔍 [useAppLifecycleFlow] Fetching flow data for session:', sessionId);
                flowData = await invoke('get_session_flow');
            } else {
                const dateStr = format(targetDate, 'yyyy-MM-dd');
                console.log('🔍 [useAppLifecycleFlow] Fetching flow data for date:', dateStr);
                flowData = await invoke('get_app_lifecycle_flow', {
                    date: dateStr,
                });
            }

            console.log('📊 [useAppLifecycleFlow] Flow data received:', flowData.length, 'transitions');

            // Calculate statistics
            const uniqueApps = new Set<string>();
            flowData.forEach(flow => {
                uniqueApps.add(flow.from_app);
                uniqueApps.add(flow.to_app);
            });

            const stats: FlowStats = {
                apps: uniqueApps.size,
                transitions: flowData.length,
            };

            const result: FlowData = {
                flows: flowData,
                stats,
            };

            setData(result);
            setLastFetched(new Date());

            console.log('📈 [useAppLifecycleFlow] Processed data:', stats);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch lifecycle flow data';
            console.error('❌ [useAppLifecycleFlow] Error:', message, err);
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, [sessionId]);

    const refresh = useCallback(() => {
        fetchFlowData(date);
    }, [fetchFlowData, date]);

    // Initial fetch when date changes
    useEffect(() => {
        if (autoRefresh) {
            fetchFlowData(date);
        }
    }, [date, fetchFlowData, autoRefresh]);

    // Real-time updates
    useEffect(() => {
        if (!enableRealtime) return;

        const unlisten = listen<AppTransitionEvent>('app-transition', (event) => {
            console.log('🔄 [useAppLifecycleFlow] Real-time transition:', event.payload);

            // Only refresh if the transition is for the selected date
            const today = format(new Date(), 'yyyy-MM-dd');
            const selectedDateStr = format(date, 'yyyy-MM-dd');

            if (sessionId !== undefined || today === selectedDateStr) {
                console.log('🔄 [useAppLifecycleFlow] Refreshing data for real-time update');
                refresh();
            }
        });

        return () => {
            unlisten.then(fn => fn());
        };
    }, [date, enableRealtime, refresh, sessionId]);

    return {
        data,
        isLoading,
        error,
        lastFetched,
        refresh,
        flows: data?.flows || [],
        stats: data?.stats || { apps: 0, transitions: 0 },
    };
} 