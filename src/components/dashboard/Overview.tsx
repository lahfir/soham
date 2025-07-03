import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Clock,
    Activity,
    Camera,
    Users,
    Zap,
    AlertCircle,
    TrendingUp,
    Monitor,
    Timer,
    Target
} from 'lucide-react';
import { RealtimeData } from '@/hooks/useRealtime';

interface OverviewProps {
    data: RealtimeData | null;
}

const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            duration: 0.4
        }
    }
};

const counterVariants = {
    hidden: { opacity: 0, scale: 0.5 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: {
            duration: 0.5
        }
    }
};

export function Overview({ data }: OverviewProps) {
    if (!data) return null;

    const formatDuration = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    };

    const todayStats = data.daily_stats[0] || { total_duration: 0, unique_apps: 0, screenshot_count: 0 };
    const totalSessions = data.app_stats.reduce((sum, app) => sum + app.session_count, 0);
    const avgSessionDuration = data.app_stats.length > 0
        ? data.app_stats.reduce((sum, app) => sum + app.avg_session_duration, 0) / data.app_stats.length
        : 0;

    const metrics = [
        {
            title: "Today's Activity",
            value: formatDuration(todayStats.total_duration),
            subtitle: "Active time today",
            icon: Clock,
            color: "text-blue-500",
            bgColor: "bg-blue-500/10",
            trend: "+12%"
        },
        {
            title: "Screenshots",
            value: todayStats.screenshot_count.toString(),
            subtitle: "Captured today",
            icon: Camera,
            color: "text-green-500",
            bgColor: "bg-green-500/10",
            trend: "+5"
        },
        {
            title: "Applications",
            value: data.app_stats.length.toString(),
            subtitle: "Total apps tracked",
            icon: Users,
            color: "text-purple-500",
            bgColor: "bg-purple-500/10",
            trend: "+2"
        },
        {
            title: "Sessions",
            value: totalSessions.toString(),
            subtitle: "Total sessions",
            icon: Activity,
            color: "text-orange-500",
            bgColor: "bg-orange-500/10",
            trend: "+18"
        },
        {
            title: "Avg Session",
            value: formatDuration(avgSessionDuration),
            subtitle: "Average duration",
            icon: Timer,
            color: "text-cyan-500",
            bgColor: "bg-cyan-500/10",
            trend: "-2m"
        },
        {
            title: "Productivity",
            value: "87%",
            subtitle: "Efficiency score",
            icon: Target,
            color: "text-emerald-500",
            bgColor: "bg-emerald-500/10",
            trend: "+3%"
        }
    ];

    return (
        <div className="space-y-6">
            {/* Status Banner */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative overflow-hidden rounded-lg bg-gradient-to-r from-primary/10 via-primary/5 to-background border border-primary/20 p-6"
            >
                <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="relative"
                        >
                            <Zap className="h-8 w-8 text-primary" />
                            <motion.div
                                className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"
                                animate={{ opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 1, repeat: Infinity }}
                            />
                        </motion.div>
                        <div>
                            <h2 className="text-2xl font-bold text-foreground">System Active</h2>
                            <p className="text-muted-foreground">Real-time tracking enabled</p>
                        </div>
                    </div>
                    <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
                        <Monitor className="w-3 h-3 mr-1" />
                        Live
                    </Badge>
                </div>
                <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5"
                    animate={{ x: [-100, 100] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                />
            </motion.div>

            {/* Metrics Grid */}
            <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                    visible: {
                        transition: {
                            staggerChildren: 0.1
                        }
                    }
                }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
                {metrics.map((metric, index) => (
                    <motion.div key={metric.title} variants={cardVariants}>
                        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-muted/50 hover:border-primary/20">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    {metric.title}
                                </CardTitle>
                                <motion.div
                                    className={`p-2 rounded-full ${metric.bgColor}`}
                                    whileHover={{ scale: 1.1, rotate: 10 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <metric.icon className={`h-4 w-4 ${metric.color}`} />
                                </motion.div>
                            </CardHeader>
                            <CardContent>
                                <motion.div
                                    variants={counterVariants}
                                    className="text-2xl font-bold text-foreground mb-1"
                                >
                                    {metric.value}
                                </motion.div>
                                <div className="flex items-center justify-between">
                                    <p className="text-xs text-muted-foreground">
                                        {metric.subtitle}
                                    </p>
                                    <motion.div
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.3 + index * 0.1 }}
                                        className={`text-xs ${metric.trend.startsWith('+') ? 'text-green-600' : 'text-orange-600'} flex items-center`}
                                    >
                                        <TrendingUp className="w-3 h-3 mr-1" />
                                        {metric.trend}
                                    </motion.div>
                                </div>
                            </CardContent>
                            <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
                                initial={{ x: '-100%' }}
                                whileHover={{ x: '100%' }}
                                transition={{ duration: 0.6 }}
                            />
                        </Card>
                    </motion.div>
                ))}
            </motion.div>

            {/* Recent Activity Preview */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
            >
                <Card className="border-muted/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5" />
                            Recent Activity
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {data.recent_activities.slice(0, 3).map((activity, index) => (
                                <motion.div
                                    key={`${activity.ts}-${index}`}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.5 + index * 0.1 }}
                                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex items-center space-x-3">
                                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                                        <div>
                                            <p className="font-medium text-sm">{activity.app_id}</p>
                                            <p className="text-xs text-muted-foreground truncate max-w-md">
                                                {activity.window_title}
                                            </p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {new Date(activity.ts * 1000).toLocaleTimeString()}
                                    </p>
                                </motion.div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
} 