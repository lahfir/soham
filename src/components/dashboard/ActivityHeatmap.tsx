import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { invoke } from '@tauri-apps/api/core';
import { Flame } from 'lucide-react';

interface HeatmapData {
    day_of_week: number;
    hour_of_day: number;
    total_duration: number;
}

const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const hours = Array.from({ length: 24 }, (_, i) => i);

export function ActivityHeatmap() {
    const [data, setData] = useState<HeatmapData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        invoke<HeatmapData[]>('get_activity_heatmap_data')
            .then(result => {
                setData(result);
                setIsLoading(false);
            })
            .catch(console.error);
    }, []);

    const gridData: number[][] = Array(7).fill(0).map(() => Array(24).fill(0));
    let maxDuration = 0;
    data.forEach(d => {
        if (d.day_of_week >= 0 && d.day_of_week < 7 && d.hour_of_day >= 0 && d.hour_of_day < 24) {
            gridData[d.day_of_week][d.hour_of_day] = d.total_duration;
            if (d.total_duration > maxDuration) {
                maxDuration = d.total_duration;
            }
        }
    });

    const getColor = (duration: number) => {
        if (duration === 0) return 'bg-muted/30';
        const intensity = Math.min(duration / Math.max(maxDuration, 1), 1);
        if (intensity < 0.2) return 'bg-primary/20';
        if (intensity < 0.4) return 'bg-primary/40';
        if (intensity < 0.6) return 'bg-primary/60';
        if (intensity < 0.8) return 'bg-primary/80';
        return 'bg-primary';
    };

    const formatDuration = (seconds: number): string => {
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours}h ${remainingMinutes}m`;
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Flame className="h-5 w-5" />
                    Activity Heatmap (Last 28 Days)
                </CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center items-center h-48">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                    </div>
                ) : (
                    <TooltipProvider>
                        <div className="flex gap-4">
                            <div className="grid grid-cols-1 gap-1 text-xs text-muted-foreground pt-7">
                                {days.map(day => <div key={day} className="h-4 text-right">{day}</div>)}
                            </div>
                            <div className="w-full">
                                <div className="grid grid-cols-12 gap-1 pb-1 text-xs text-muted-foreground">
                                    {Array.from({ length: 12 }).map((_, i) => (
                                        <div key={i} className="col-span-1 text-left">{i * 2}h</div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-24 grid-rows-7 gap-1">
                                    {gridData.flat().map((duration, index) => {
                                        const dayIndex = Math.floor(index / 24);
                                        const hourIndex = index % 24;
                                        return (
                                            <Tooltip key={index} delayDuration={100}>
                                                <TooltipTrigger asChild>
                                                    <div className={`h-4 w-full rounded-sm ${getColor(duration)}`} />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>{`${formatDuration(duration)} on ${days[dayIndex]} at ${hourIndex}:00`}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </TooltipProvider>
                )}
            </CardContent>
        </Card>
    );
} 