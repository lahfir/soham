import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { AppList } from '@/components/dashboard/AppList';
import { AppDetailView } from '@/components/dashboard/AppDetailView';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDashboardData } from '@/hooks/useDashboardData';
import { AppStat } from '@/types/dashboard';
import { BarChart3, TrendingUp, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export function AppAnalyticsPage() {
    const { appId } = useParams<{ appId?: string }>();
    const [selectedAppId, setSelectedAppId] = useState<string | null>(appId || null);

    const [from, setFrom] = useState(new Date(new Date().setDate(new Date().getDate() - 7)));
    const [to, setTo] = useState(new Date());
    const [range, setRange] = useState({ from, to });

    const { data, isLoading, error } = useDashboardData(range);
    const stats = data?.app_stats ?? [];

    useEffect(() => {
        if (appId) {
            setSelectedAppId(decodeURIComponent(appId));
        } else if (stats.length > 0 && !stats.some((s: AppStat) => s.app_id === selectedAppId)) {
            setSelectedAppId(stats[0].app_id);
        }
    }, [appId, stats, selectedAppId]);

    const handleApply = () => {
        setRange({ from, to });
    };

    const selectedApp = stats.find((s: AppStat) => s.app_id === selectedAppId) || null;
    const totalUsage = stats.reduce((sum, app) => sum + app.total_duration, 0);

    return (
        <div className="h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted/10">
            {/* Enhanced Header */}
            <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border/50 shadow-sm">
                <div className="px-6 py-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <Link
                                to="/"
                                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                <span className="text-sm font-medium">Back to Overview</span>
                            </Link>
                            <div className="h-4 w-px bg-border/50" />
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 border border-primary/20 rounded-lg">
                                    <BarChart3 className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold tracking-tight">Application Analytics</h1>
                                    <p className="text-sm text-muted-foreground">
                                        {selectedApp ? `Analyzing ${selectedApp.app_id}` : 'Detailed usage insights'}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <DateTimePicker label="From" value={from} onChange={setFrom} />
                            <DateTimePicker label="To" value={to} onChange={setTo} />
                            <Button onClick={handleApply} className="shadow-sm">Apply</Button>
                        </div>
                    </div>

                    {/* Stats Summary Bar */}
                    {stats.length > 0 && (
                        <div className="mt-4 flex items-center gap-6 text-sm">
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Total Apps:</span>
                                <Badge variant="secondary" className="font-medium">
                                    {stats.length}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Total Usage:</span>
                                <Badge variant="secondary" className="font-medium">
                                    {Math.floor(totalUsage / 3600)}h {Math.floor((totalUsage % 3600) / 60)}m
                                </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Average per App:</span>
                                <Badge variant="secondary" className="font-medium">
                                    {Math.floor(totalUsage / stats.length / 60)}m
                                </Badge>
                            </div>
                            {selectedApp && (
                                <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">Usage Share:</span>
                                    <Badge variant="default" className="font-medium">
                                        {((selectedApp.total_duration / totalUsage) * 100).toFixed(1)}%
                                    </Badge>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-[380px_1fr] overflow-hidden">
                {/* App List Sidebar */}
                <div className="border-r border-border/30 overflow-y-auto bg-card/50">
                    <div className="p-4 border-b border-border/20">
                        <div className="flex items-center gap-2 mb-3">
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            <h3 className="font-semibold">Applications</h3>
                        </div>
                        {isLoading && stats.length === 0 && (
                            <Card className="border border-border/20">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                                        <p className="text-sm text-muted-foreground">Loading applications...</p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                        {error && (
                            <Card className="border border-red-200/50 bg-red-50/50">
                                <CardContent className="p-4">
                                    <p className="text-sm text-red-600">{error}</p>
                                </CardContent>
                            </Card>
                        )}
                        {!isLoading && !error && stats.length === 0 && (
                            <Card className="border border-border/20">
                                <CardContent className="p-6 text-center">
                                    <BarChart3 className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                                    <p className="text-sm font-medium text-muted-foreground">No Data Available</p>
                                    <p className="text-xs text-muted-foreground/70 mt-1">
                                        No application data found for this period. Try expanding your date range.
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                    {stats.length > 0 && (
                        <div className="p-2">
                            <AppList apps={stats} onAppSelect={setSelectedAppId} selectedAppId={selectedAppId} />
                        </div>
                    )}
                </div>

                {/* App Detail View */}
                <div className="overflow-y-auto bg-background">
                    {selectedApp ? (
                        <AppDetailView app={selectedApp} />
                    ) : (
                        <div className="h-full flex items-center justify-center p-8">
                            <Card className="border border-border/20 max-w-md w-full">
                                <CardContent className="p-8 text-center">
                                    <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
                                    </div>
                                    <h3 className="text-lg font-semibold mb-2">Select an Application</h3>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Choose an application from the sidebar to view detailed analytics, usage patterns, and insights.
                                    </p>
                                    {stats.length > 0 && (
                                        <Button
                                            variant="outline"
                                            onClick={() => setSelectedAppId(stats[0].app_id)}
                                            className="shadow-sm"
                                        >
                                            View Top App
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}