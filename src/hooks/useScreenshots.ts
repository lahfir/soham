import { invoke } from "@tauri-apps/api/core";
import { useState, useEffect, useCallback } from "react";
import { startOfDay, endOfDay } from 'date-fns';

// This is a simplified version of the one in db.rs
// In a real app, you might share these types.
export interface Screenshot {
    path: string; // This will be base64 encoded image data
    ts: number;
}


export const useScreenshots = (date: Date) => {
    const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchScreenshots = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const from = Math.floor(startOfDay(date).getTime() / 1000);
            const to = Math.floor(endOfDay(date).getTime() / 1000);
            const result: Screenshot[] = await invoke('get_screenshots_in_range', { from, to });
            setScreenshots(result);
        } catch (e: any) {
            setError(e.toString());
        } finally {
            setIsLoading(false);
        }
    }, [date]);

    useEffect(() => {
        fetchScreenshots();
    }, [fetchScreenshots]);

    return { screenshots, isLoading, error, refresh: fetchScreenshots };
}; 