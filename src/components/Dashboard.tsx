import { useState } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useSystemStats } from '@/hooks/useSystemStats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Activity,
    Clock,
    PieChart as PieChartIcon,
    ArrowRight,
    Cpu,
    MemoryStick,
    Server,
    TrendingUp,
    Calendar,
    Monitor,
    Home
} from 'lucide-react';
import { AppUsagePieChart } from '@/components/dashboard/AppUsagePieChart';
import { ActivityHeatmap } from '@/components/dashboard/ActivityHeatmap';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { AppStat } from '@/types/dashboard';
import { AppIcon } from './dashboard/AppIcon';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Link } from 'react-router-dom';

interface SystemHealthCardProps {
    title: string;
    value: string | React.ReactNode;
    icon: React.ElementType;
    description: string;
    trend?: 'up' | 'down' | 'stable';
    accentColor?: 'red' | 'yellow' | 'green';
}

function SystemHealthCard({ title, value, icon: Icon, description, trend, accentColor }: SystemHealthCardProps) {
    const accentColors = {
        red: 'text-red-500 bg-red-500/10 border-red-200/20',
        yellow: 'text-yellow-500 bg-yellow-500/10 border-yellow-200/20',
        green: 'text-green-500 bg-green-500/10 border-green-200/20',
    };

    const trendColors = {
        up: 'bg-red-500/10 text-red-600 border-red-200/30',
        down: 'bg-green-500/10 text-green-600 border-green-200/30',
        stable: 'bg-gray-500/10 text-gray-600 border-gray-200/30'
    };

    return (
        <Card className="border border-border/20 shadow-sm hover:shadow-md transition-all duration-200 bg-card">
            <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className={`p-2 rounded-lg border ${accentColor ? accentColors[accentColor] : 'bg-muted/30 border-border/20'}`}>
                        <Icon className="h-4 w-4" />
                    </div>
                    {trend && (
                        <Badge variant="outline" className={`h-5 text-xs px-2 border ${trendColors[trend]}`}>
                            {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'}
                        </Badge>
                    )}
                </div>
                <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <div className="text-xl font-bold tracking-tight">{value}</div>
                    <p className="text-xs text-muted-foreground/70">{description}</p>
                </div>
            </CardContent>
        </Card>
    );
}

function MetricCard({ title, value, icon: Icon, description }: {
    title: string;
    value: string | React.ReactNode;
    icon: React.ElementType;
    description: string;
}) {
    return (
        <Card className="border border-border/20 shadow-sm hover:shadow-md transition-all duration-200 bg-card">
            <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                    <div className="p-2 bg-primary/10 border border-primary/20 rounded-lg">
                        <Icon className="h-4 w-4 text-primary" />
                    </div>
                </div>
                <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <div className="text-xl font-bold tracking-tight">{value}</div>
                    <p className="text-xs text-muted-foreground/70">{description}</p>
                </div>
            </CardContent>
        </Card>
    );
}

function TopAppCard({ app, rank }: { app: AppStat; rank: number }) {
    return (
        <Link
            to={`/analytics/${encodeURIComponent(app.app_id)}`}
            className="flex items-center p-3 bg-muted/20 border border-border/10 rounded-lg hover:bg-muted/40 hover:border-border/20 transition-all duration-200 group"
        >
            <div className="flex items-center gap-3 flex-1">
                <div className="flex items-center justify-center w-6 h-6 bg-background border border-border/20 rounded-full text-sm font-medium shadow-sm">
                    {rank}
                </div>
                <AppIcon appId={app.app_id} className="h-8 w-8 rounded-lg shadow-sm" />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{app.app_id}</p>
                    <p className="text-xs text-muted-foreground">
                        {formatDuration(app.total_duration)}
                    </p>
                </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        </Link>
    );
}

function formatDuration(seconds: number): string {
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function getMemoryUsagePercent(used: number, total: number): number {
    return (used / total) * 100;
}

export function Dashboard() {
    const [from, setFrom] = useState(new Date(new Date().setDate(new Date().getDate() - 1)));
    const [to, setTo] = useState(new Date());
    const [heatmapRange, setHeatmapRange] = useState<'week' | 'month' | 'year'>('week');

    const [range, setRange] = useState({ from, to });
    const { data, isLoading } = useDashboardData(range, { enableRealtime: true });
    const { stats: systemStats } = useSystemStats();

    const handleApply = () => {
        setRange({ from, to });
    };

    if (isLoading && !data) {
        return (
            <div className="h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted/10">
                <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border/50 shadow-sm">
                    <div className="px-6 py-4">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-primary/10 border border-primary/20 rounded-lg">
                                        <Home className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <Skeleton className="h-6 w-32" />
                                        <Skeleton className="h-3 w-40 mt-1" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-10 w-28" />
                                <Skeleton className="h-10 w-28" />
                                <Skeleton className="h-10 w-20" />
                            </div>
                        </div>
                    </div>
                </header>
                <div className="flex-1 p-6 space-y-6">
                    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                        <Skeleton className="h-24" />
                        <Skeleton className="h-24" />
                        <Skeleton className="h-24" />
                        <Skeleton className="h-24" />
                    </div>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted/10">
                <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border/50 shadow-sm">
                    <div className="px-6 py-4">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-primary/10 border border-primary/20 rounded-lg">
                                        <Home className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <h1 className="text-xl font-bold tracking-tight">Activity Overview</h1>
                                        <p className="text-sm text-muted-foreground">Monitor your system and application usage</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <DateTimePicker label="From" value={from} onChange={setFrom} />
                                <DateTimePicker label="To" value={to} onChange={setTo} />
                                <Button onClick={handleApply} className="shadow-sm">Apply</Button>
                            </div>
                        </div>
                    </div>
                </header>
                <div className="flex-1 p-6">
                    <p className="text-muted-foreground">Could not load dashboard data for the selected range.</p>
                </div>
            </div>
        );
    }

    const totalDuration = data.app_stats.reduce((acc: number, app: AppStat) => acc + app.total_duration, 0);
    const mostUsedApp = data.app_stats[0];
    const memoryPercent = systemStats ? getMemoryUsagePercent(systemStats.used_memory, systemStats.total_memory) : 0;

    return (
        <div className="h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted/10">
            {/* Enhanced Header */}
            <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border/50 shadow-sm">
                <div className="px-6 py-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 border border-primary/20 rounded-lg">
                                    <Home className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold tracking-tight">Activity Overview</h1>
                                    <p className="text-sm text-muted-foreground">Monitor your system and application usage</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <DateTimePicker label="From" value={from} onChange={setFrom} />
                            <DateTimePicker label="To" value={to} onChange={setTo} />
                            <Button onClick={handleApply} className="shadow-sm">Apply</Button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 overflow-auto">
                <div className="p-6 space-y-6">
                    {/* System Overview - Flexed Row */}
                    <div className="flex flex-col xl:flex-row gap-6">
                        {/* System Health */}
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-4">
                                <Monitor className="h-5 w-5 text-muted-foreground" />
                                <h2 className="text-lg font-semibold">System Health</h2>
                            </div>
                            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                                <SystemHealthCard
                                    title="CPU Usage"
                                    value={systemStats ? `${systemStats.cpu_usage.toFixed(1)}%` : <Skeleton className="h-5 w-12" />}
                                    icon={Cpu}
                                    description="Current processor load"
                                    accentColor={systemStats && systemStats.cpu_usage > 80 ? 'red' : systemStats && systemStats.cpu_usage > 50 ? 'yellow' : 'green'}
                                    trend={systemStats && systemStats.cpu_usage > 80 ? 'up' : systemStats && systemStats.cpu_usage < 20 ? 'down' : 'stable'}
                                />
                                <SystemHealthCard
                                    title="Memory Usage"
                                    value={systemStats ? `${memoryPercent.toFixed(1)}%` : <Skeleton className="h-5 w-12" />}
                                    icon={MemoryStick}
                                    description={systemStats ? `${formatBytes(systemStats.used_memory)} used` : 'Loading...'}
                                    accentColor={memoryPercent > 80 ? 'red' : memoryPercent > 60 ? 'yellow' : 'green'}
                                    trend={memoryPercent > 80 ? 'up' : memoryPercent < 50 ? 'down' : 'stable'}
                                />
                                <SystemHealthCard
                                    title="Available Storage"
                                    value={systemStats ? `${formatBytes(systemStats.available_disk_space)}` : <Skeleton className="h-5 w-12" />}
                                    icon={Server}
                                    description={systemStats ? `of ${formatBytes(systemStats.total_disk_space)}` : 'Loading...'}
                                    accentColor="green"
                                />
                                <SystemHealthCard
                                    title="Active Processes"
                                    value={systemStats ? systemStats.process_count.toString() : <Skeleton className="h-5 w-12" />}
                                    icon={Activity}
                                    description="Running processes"
                                />
                            </div>
                        </div>

                        {/* Activity Summary */}
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-4">
                                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                                <h2 className="text-lg font-semibold">Activity Summary</h2>
                            </div>
                            <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
                                <MetricCard
                                    title="Total Active Time"
                                    value={formatDuration(totalDuration)}
                                    icon={Clock}
                                    description="All applications combined"
                                />
                                <MetricCard
                                    title="Applications Used"
                                    value={data.app_stats.length.toString()}
                                    icon={PieChartIcon}
                                    description="Unique applications"
                                />
                                <MetricCard
                                    title="Most Active App"
                                    value={
                                        mostUsedApp ? (
                                            <div className="flex items-center gap-2">
                                                <AppIcon appId={mostUsedApp.app_id} className="h-5 w-5 rounded-md" />
                                                <span className="truncate text-lg">{mostUsedApp.app_id}</span>
                                            </div>
                                        ) : 'No data'
                                    }
                                    icon={Activity}
                                    description={mostUsedApp ? `${formatDuration(mostUsedApp.total_duration)} total` : 'No activity'}
                                />
                            </div>
                        </div>
                    </div>

                    {/* App Analysis */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <Calendar className="h-5 w-5 text-muted-foreground" />
                            <h2 className="text-lg font-semibold">Application Analysis</h2>
                        </div>
                        <div className="grid gap-6 lg:grid-cols-5">
                            <Card className="col-span-1 lg:col-span-3 border border-border/20 shadow-sm bg-card">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base">Usage Distribution</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <AppUsagePieChart data={data.app_stats} />
                                </CardContent>
                            </Card>

                            <Card className="col-span-1 lg:col-span-2 border border-border/20 shadow-sm bg-card">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base">Top Applications</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <ScrollArea className="h-80">
                                        <div className="space-y-2 pr-2">
                                            {data.app_stats.slice(0, 12).map((app, index) => (
                                                <TopAppCard key={app.app_id} app={app} rank={index + 1} />
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Activity Timeline */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Activity className="h-5 w-5 text-muted-foreground" />
                                <h2 className="text-lg font-semibold">Activity Timeline</h2>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant={heatmapRange === 'week' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setHeatmapRange('week')}
                                >
                                    Week
                                </Button>
                                <Button
                                    variant={heatmapRange === 'month' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setHeatmapRange('month')}
                                >
                                    Month
                                </Button>
                                <Button
                                    variant={heatmapRange === 'year' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setHeatmapRange('year')}
                                >
                                    Year
                                </Button>
                            </div>
                        </div>
                        <Card className="border border-border/20 shadow-sm bg-card">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base">Activity Heatmap - {heatmapRange.charAt(0).toUpperCase() + heatmapRange.slice(1)} View</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <ActivityHeatmap data={data.heatmap_data} range={heatmapRange} />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
} 