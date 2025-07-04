import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Progress } from '@/components/ui/progress';
import { BarChart3, Calendar as CalendarIcon, Info } from 'lucide-react';
import { RealtimeData } from '@/hooks/useRealtime';
import { DateRange } from 'react-day-picker';

interface TimeTrackingProps {
    data: RealtimeData | null;
}

export function TimeTracking({ data }: TimeTrackingProps) {
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [icons, setIcons] = useState<Record<string, string>>({});

    useEffect(() => {
        if (data?.app_stats) {
            data.app_stats.forEach(app => {
                if (!icons[app.app_id]) {
                    invoke<string>('get_app_icon', { appId: app.app_id })
                        .then(iconStr => setIcons(prev => ({ ...prev, [app.app_id]: iconStr })))
                        .catch(() => setIcons(prev => ({ ...prev, [app.app_id]: '' })));
                }
            });
        }
    }, [data]);

    const formatDuration = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    };

    if (!data || !data.app_stats || data.app_stats.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-primary" />
                        Time Analytics
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-64">
                    <p className="text-muted-foreground">No app usage data available.</p>
                </CardContent>
            </Card>
        );
    }

    const appStats = data.app_stats;
    const totalTrackedTime = appStats.reduce((sum, app) => sum + app.total_duration, 0);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    <CardTitle>Time Analytics</CardTitle>
                </div>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4" />
                            <span>Filter by date</span>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                            mode="range"
                            selected={dateRange}
                            onSelect={setDateRange}
                        />
                    </PopoverContent>
                </Popover>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {appStats.map((app, index) => {
                        const percentage = totalTrackedTime > 0 ? (app.total_duration / totalTrackedTime) * 100 : 0;
                        const iconSrc = icons[app.app_id];
                        return (
                            <div key={index} className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2 truncate">
                                        {iconSrc ? (
                                            <img src={iconSrc} alt={app.app_id} className="w-5 h-5" />
                                        ) : (
                                            <div className="w-5 h-5 bg-muted rounded-sm flex-shrink-0" />
                                        )}
                                        <span className="font-medium truncate">{app.app_id}</span>
                                    </div>
                                    <span className="font-mono text-muted-foreground">{formatDuration(app.total_duration)}</span>
                                </div>
                                <Progress value={percentage} />
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
} 