import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { AppLifecycleEvent, AppStat } from '@/types/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, Zap, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { AppIcon } from "./AppIcon";

interface AppDetailViewProps {
    app: AppStat | null;
}

function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
}

function MetricCard({ title, value, icon: Icon }: { title: string; value: string; icon: React.ElementType }) {
    return (
        <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="h-4 w-4 text-primary" />
                    </div>
                </div>
                <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">{title}</p>
                    <div className="text-xl font-bold tracking-tight">{value}</div>
                </div>
            </CardContent>
        </Card>
    );
}

export function AppDetailView({ app }: AppDetailViewProps) {
    const [events, setEvents] = useState<AppLifecycleEvent[]>([]);
    const [loadingEvents, setLoadingEvents] = useState(true);

    useEffect(() => {
        if (!app) {
            setEvents([]);
            return;
        }

        const appId = app.app_id;
        setLoadingEvents(true);
        const fetchEvents = async () => {
            try {
                const fetchedEvents = await invoke<AppLifecycleEvent[]>('get_app_lifecycle_events', { appId });
                setEvents(fetchedEvents);
            } catch (error) {
                console.error("Failed to fetch app events:", error);
                setEvents([]);
            } finally {
                setLoadingEvents(false);
            }
        };

        fetchEvents();
    }, [app]);

    if (!app) {
        return (
            <div className="p-6 flex items-center justify-center h-full">
                <div className="text-center space-y-3">
                    <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto">
                        <Activity className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Select an application</p>
                        <p className="text-xs text-muted-foreground/70">Choose an app to view detailed analytics</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-4">
                <AppIcon appId={app.app_id} className="h-12 w-12 rounded-lg shadow-sm" />
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{app.app_id}</h1>
                    <p className="text-sm text-muted-foreground">
                        Last seen: {new Date(app.last_seen).toLocaleString()}
                    </p>
                </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
                <MetricCard title="Total Usage" value={formatDuration(app.total_duration)} icon={Clock} />
                <MetricCard title="Sessions" value={app.session_count.toString()} icon={Zap} />
                <MetricCard title="Avg. Session" value={formatDuration(app.avg_duration)} icon={Activity} />
            </div>

            <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    {loadingEvents ? (
                        <div className="space-y-2">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Skeleton key={i} className="h-8 w-full" />
                            ))}
                        </div>
                    ) : events.length > 0 ? (
                        <div className="space-y-2">
                            {events.slice(0, 10).map(event => (
                                <div key={event.ts} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors duration-200">
                                    <span className={`text-sm font-medium capitalize ${event.event_type === 'open' ? 'text-green-600' : 'text-red-500'}`}>
                                        {event.event_type}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {format(new Date(event.ts * 1000), 'MMM d, yyyy @ HH:mm')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center p-8">
                            <div className="w-12 h-12 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Activity className="h-6 w-6 text-muted-foreground/50" />
                            </div>
                            <p className="text-sm text-muted-foreground">No activity events found</p>
                            <p className="text-xs text-muted-foreground/70">Events will appear here when available</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
} 