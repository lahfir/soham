import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

// Assuming Screenshot type is defined in dashboard types
import { Screenshot } from '@/types/dashboard';

export function useScreenshots() {
    const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);
            const result = await invoke<Screenshot[]>('get_recent_screenshots');
            setScreenshots(result);
            setError(null);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch screenshots';
            console.error(message, err);
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { screenshots, isLoading, error, refresh: fetchData };
} 