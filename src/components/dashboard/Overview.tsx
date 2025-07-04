import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Clock,
    Camera,
    Users,
    Activity,
    Zap,
    Monitor,
} from 'lucide-react';
import { RealtimeData } from '@/hooks/useRealtime';

interface OverviewProps {
    data: RealtimeData | null;
}

export function Overview({ data }: OverviewProps) {
    if (!data) return null;

    const formatDuration = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    };

    const todayStats = data.daily_stats[0] || { total_duration: 0, unique_apps: 0, screenshot_count: 0 };
    const totalSessions = data.app_stats.reduce((sum, app) => sum + app.total_duration, 0) > 0 ? data.app_stats.length : 0;

    const metrics = [
        {
            title: "Today's Active Time",
            value: formatDuration(todayStats.total_duration),
            icon: Clock,
            color: "text-blue-500",
        },
        {
            title: "Screenshots Today",
            value: todayStats.screenshot_count.toString(),
            icon: Camera,
            color: "text-green-500",
        },
        {
            title: "Apps Used Today",
            value: todayStats.unique_apps.toString(),
            icon: Users,
            color: "text-purple-500",
        },
        {
            title: "Total Tracked Apps",
            value: totalSessions.toString(),
            icon: Activity,
            color: "text-orange-500",
        }
    ];

    return (
        <div className="space-y-6">
            <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-primary/10 via-primary/5 to-background border border-primary/20 p-6">
                <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="relative">
                            <Zap className="h-8 w-8 text-primary" />
                            <div
                                className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"
                            />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-foreground">System Active</h2>
                            <p className="text-muted-foreground">Real-time tracking enabled</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full bg-green-500/20 px-3 py-1 text-xs font-medium text-green-400">
                        <Monitor className="w-3 h-3" />
                        Live
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {metrics.map((metric) => (
                    <Card key={metric.title} className="border-muted/50">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {metric.title}
                            </CardTitle>
                            <metric.icon className={`h-5 w-5 ${metric.color}`} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-foreground">
                                {metric.value}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
} 