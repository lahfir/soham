import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface SystemStats {
    cpu_usage: number;
    total_memory: number;
    used_memory: number;
    total_disk_space: number;
    available_disk_space: number;
    process_count: number;
}

export function useSystemStats() {
    const [stats, setStats] = useState<SystemStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const result = await invoke<SystemStats>('get_system_stats');
                setStats(result);
                setError(null);
            } catch (err) {
                console.error("Failed to fetch system stats:", err);
                setError(typeof err === 'string' ? err : 'An unknown error occurred');
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
        const intervalId = setInterval(fetchStats, 5000); // Poll every 5 seconds

        return () => clearInterval(intervalId);
    }, []);

    return { stats, isLoading, error };
} 