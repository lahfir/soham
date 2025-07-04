import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { AppStat } from '@/types/dashboard';
import { AppIcon } from './AppIcon';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AppUsagePieChartProps {
    data: AppStat[];
}

interface PieChartData {
    name: string;
    value: number;
    originalApp?: AppStat;
    color: string;
    percentage: number;
}

function formatDuration(seconds: number): string {
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

function generateAppColor(appName: string): string {
    const colors = [
        '#007AFF', '#5856D6', '#AF52DE', '#FF2D92', '#FF3B30',
        '#FF9500', '#FFCC00', '#34C759', '#00C7BE', '#5AC8FA'
    ];

    let hash = 0;
    for (let i = 0; i < appName.length; i++) {
        const char = appName.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }

    const index = Math.abs(hash) % colors.length;
    return colors[index];
}

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload as PieChartData;
        const originalApp = data.originalApp;

        return (
            <div className="bg-background/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl p-3 min-w-[200px] max-w-[250px]">
                <div className="flex items-center gap-2 mb-2">
                    <AppIcon appId={data.name} className="h-6 w-6 rounded-md shadow-sm" />
                    <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{data.name}</p>
                        <p className="text-xs text-muted-foreground">{data.percentage.toFixed(1)}% of total</p>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Duration</span>
                        <span className="text-xs font-medium">{formatDuration(data.value)}</span>
                    </div>

                    {originalApp && (
                        <>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-muted-foreground">Sessions</span>
                                <span className="text-xs font-medium">{originalApp.session_count || 0}</span>
                            </div>

                            <div className="flex justify-between items-center">
                                <span className="text-xs text-muted-foreground">Avg Session</span>
                                <span className="text-xs font-medium">
                                    {formatDuration(originalApp.session_count > 0 ? originalApp.total_duration / originalApp.session_count : originalApp.total_duration)}
                                </span>
                            </div>

                            <div className="flex justify-between items-center">
                                <span className="text-xs text-muted-foreground">Last Seen</span>
                                <span className="text-xs font-medium">
                                    {new Date(originalApp.last_seen * 1000).toLocaleDateString()}
                                </span>
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    }
    return null;
};

export function AppUsagePieChart({ data }: AppUsagePieChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 text-center">
                <div className="space-y-2">
                    <div className="w-12 h-12 bg-muted/20 rounded-full flex items-center justify-center mx-auto">
                        <AppIcon appId="unknown" className="h-6 w-6 opacity-40" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">No usage data</p>
                        <p className="text-xs text-muted-foreground/70">Activity will appear here</p>
                    </div>
                </div>
            </div>
        );
    }

    // Calculate total duration for percentage calculations
    const totalDuration = data.reduce((sum, app) => sum + app.total_duration, 0);

    const pieData: PieChartData[] = data.slice(0, 8).map(app => ({
        name: app.app_id,
        value: app.total_duration,
        originalApp: app,
        color: generateAppColor(app.app_id),
        percentage: totalDuration > 0 ? (app.total_duration / totalDuration) * 100 : 0
    }));

    if (data.length > 8) {
        const otherDuration = data.slice(8).reduce((acc, app) => acc + app.total_duration, 0);
        const otherPercentage = totalDuration > 0 ? (otherDuration / totalDuration) * 100 : 0;
        pieData.push({
            name: 'Other',
            value: otherDuration,
            color: '#8E8E93',
            percentage: otherPercentage
        } as PieChartData);
    }

    return (
        <div className="flex flex-col lg:flex-row h-full w-full gap-6 items-center justify-center">
            <div className="flex-1 h-[260px] lg:h-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={80}
                            outerRadius={140}
                            paddingAngle={1}
                            dataKey="value"
                            stroke="none"
                        >
                            {pieData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.color}
                                    className="hover:opacity-80 transition-opacity duration-200 cursor-pointer"
                                />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <ScrollArea className="w-64 max-w-[45%] h-full">
                <div className="grid grid-cols-2 gap-4 pr-3">
                    {pieData.map((entry, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm text-foreground/90 truncate">
                            <div className="relative">
                                <AppIcon appId={entry.name} className="h-8 w-8 rounded-sm flex-shrink-0" />
                                <div
                                    className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-background"
                                    style={{ backgroundColor: entry.color }}
                                />
                            </div>
                            <span className="truncate flex-1" title={entry.name}>{entry.name}</span>
                            <span className="text-xs text-muted-foreground">{entry.percentage.toFixed(0)}%</span>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
} 