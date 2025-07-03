import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Clock, Monitor, AlertCircle, Zap } from 'lucide-react';
import { RealtimeData } from '@/hooks/useRealtime';
import { format } from 'date-fns';

interface ActivityFeedProps {
    data: RealtimeData | null;
}

export function ActivityFeed({ data }: ActivityFeedProps) {
    if (!data) return null;

    const getEventIcon = (eventType: string) => {
        switch (eventType) {
            case 'focus':
                return Monitor;
            case 'blur':
                return AlertCircle;
            default:
                return Activity;
        }
    };

    const getEventColor = (eventType: string) => {
        switch (eventType) {
            case 'focus':
                return 'text-green-500';
            case 'blur':
                return 'text-orange-500';
            default:
                return 'text-blue-500';
        }
    };

    const getEventBg = (eventType: string) => {
        switch (eventType) {
            case 'focus':
                return 'bg-green-500/10';
            case 'blur':
                return 'bg-orange-500/10';
            default:
                return 'bg-blue-500/10';
        }
    };

    return (
        <div className="space-y-6">
            {/* Live Status */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-lg bg-gradient-to-r from-green-500/10 via-green-500/5 to-background border border-green-500/20 p-6"
            >
                <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            <Zap className="h-8 w-8 text-green-500" />
                        </motion.div>
                        <div>
                            <h2 className="text-2xl font-bold text-foreground">Live Activity Feed</h2>
                            <p className="text-muted-foreground">Real-time window tracking</p>
                        </div>
                    </div>
                    <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2" />
                        Live
                    </Badge>
                </div>
            </motion.div>

            {/* Activity Timeline */}
            <Card className="border-muted/50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Recent Activities
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <AnimatePresence>
                            {data.recent_activities.map((activity, index) => {
                                const EventIcon = getEventIcon(activity.event_type);
                                const eventColor = getEventColor(activity.event_type);
                                const eventBg = getEventBg(activity.event_type);

                                return (
                                    <motion.div
                                        key={`${activity.ts}-${index}`}
                                        initial={{ opacity: 0, x: -50, scale: 0.9 }}
                                        animate={{ opacity: 1, x: 0, scale: 1 }}
                                        exit={{ opacity: 0, x: 50, scale: 0.9 }}
                                        transition={{
                                            duration: 0.3,
                                            delay: index * 0.05
                                        }}
                                        whileHover={{ scale: 1.02, x: 4 }}
                                        className="relative group"
                                    >
                                        <div className="flex items-start space-x-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-all duration-200 border border-transparent hover:border-primary/20">
                                            {/* Timeline indicator */}
                                            <div className="relative">
                                                <motion.div
                                                    className={`p-2 rounded-full ${eventBg} border-2 border-background`}
                                                    whileHover={{ scale: 1.1, rotate: 10 }}
                                                >
                                                    <EventIcon className={`h-4 w-4 ${eventColor}`} />
                                                </motion.div>
                                                {index < data.recent_activities.length - 1 && (
                                                    <div className="absolute top-10 left-1/2 transform -translate-x-1/2 w-0.5 h-8 bg-muted-foreground/20" />
                                                )}
                                            </div>

                                            {/* Activity details */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center space-x-2">
                                                        <Badge
                                                            variant="outline"
                                                            className={`text-xs ${eventColor} border-current`}
                                                        >
                                                            {activity.event_type}
                                                        </Badge>
                                                        <span className="font-semibold text-sm">{activity.app_id}</span>
                                                    </div>
                                                    <div className="flex items-center text-xs text-muted-foreground">
                                                        <Clock className="h-3 w-3 mr-1" />
                                                        {format(new Date(activity.ts * 1000), 'HH:mm:ss')}
                                                    </div>
                                                </div>

                                                <p className="text-sm text-muted-foreground truncate group-hover:text-foreground transition-colors">
                                                    {activity.window_title}
                                                </p>

                                                <div className="mt-2 flex items-center justify-between">
                                                    <span className="text-xs text-muted-foreground">
                                                        PID: {activity.pid}
                                                    </span>
                                                    <motion.div
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        transition={{ delay: 0.5 + index * 0.1 }}
                                                        className="text-xs text-muted-foreground"
                                                    >
                                                        {format(new Date(activity.ts * 1000), 'MMM d, yyyy')}
                                                    </motion.div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Hover effect overlay */}
                                        <motion.div
                                            className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                            initial={false}
                                        />
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>

                    {data.recent_activities.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-12"
                        >
                            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-lg font-semibold mb-2">No recent activity</p>
                            <p className="text-muted-foreground">
                                Activities will appear here as you use your applications
                            </p>
                        </motion.div>
                    )}
                </CardContent>
            </Card>

            {/* Activity Stats */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
                <Card className="border-muted/50">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Events</p>
                                <p className="text-2xl font-bold text-blue-500">
                                    {data.recent_activities.length}
                                </p>
                            </div>
                            <Activity className="h-8 w-8 text-blue-500/20" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-muted/50">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Focus Events</p>
                                <p className="text-2xl font-bold text-green-500">
                                    {data.recent_activities.filter(a => a.event_type === 'focus').length}
                                </p>
                            </div>
                            <Monitor className="h-8 w-8 text-green-500/20" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-muted/50">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Unique Apps</p>
                                <p className="text-2xl font-bold text-purple-500">
                                    {new Set(data.recent_activities.map(a => a.app_id)).size}
                                </p>
                            </div>
                            <Zap className="h-8 w-8 text-purple-500/20" />
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
} 