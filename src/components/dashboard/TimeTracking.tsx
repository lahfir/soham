import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, Clock, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import { RealtimeData } from '@/hooks/useRealtime';

interface TimeTrackingProps {
    data: RealtimeData | null;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#ff00ff'];

export function TimeTracking({ data }: TimeTrackingProps) {
    if (!data) return null;

    const formatDuration = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    };

    const formatHours = (seconds: number): number => {
        return Math.round(seconds / 3600 * 10) / 10;
    };

    const topApps = data.app_stats.slice(0, 8).map(app => ({
        name: app.app_id,
        hours: formatHours(app.total_duration),
        sessions: app.session_count,
        avgSession: formatDuration(app.avg_session_duration)
    }));

    const pieData = data.app_stats.slice(0, 6).map(app => ({
        name: app.app_id,
        value: app.total_duration,
        hours: formatHours(app.total_duration)
    }));

    const timelineData = Array.from({ length: 24 }, (_, hour) => ({
        hour: `${hour.toString().padStart(2, '0')}:00`,
        activity: Math.random() * 100,
        productivity: Math.random() * 100
    }));

    return (
        <div className="space-y-6">
            {/* Header Stats */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 md:grid-cols-4 gap-4"
            >
                {[
                    { label: 'Total Time', value: formatDuration(data.app_stats.reduce((sum, app) => sum + app.total_duration, 0)), color: 'text-blue-500' },
                    { label: 'Active Apps', value: data.app_stats.length.toString(), color: 'text-green-500' },
                    { label: 'Total Sessions', value: data.app_stats.reduce((sum, app) => sum + app.session_count, 0).toString(), color: 'text-purple-500' },
                    { label: 'Avg Session', value: formatDuration(data.app_stats.reduce((sum, app) => sum + app.avg_session_duration, 0) / data.app_stats.length || 0), color: 'text-orange-500' }
                ].map((stat, index) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <Card className="border-muted/50">
                            <CardContent className="p-4">
                                <div className={`text-2xl font-bold ${stat.color} mb-1`}>
                                    {stat.value}
                                </div>
                                <p className="text-sm text-muted-foreground">{stat.label}</p>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Applications Chart */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <Card className="border-muted/50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-blue-500" />
                                Top Applications
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={topApps}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                                    <XAxis
                                        dataKey="name"
                                        tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                                        angle={-45}
                                        textAnchor="end"
                                        height={80}
                                    />
                                    <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--popover))',
                                            border: '1px solid hsl(var(--border))',
                                            borderRadius: '8px'
                                        }}
                                        formatter={(value: number) => [`${value}h`, 'Hours']}
                                    />
                                    <Bar dataKey="hours" fill="#8884d8" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Usage Distribution */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <Card className="border-muted/50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <PieChartIcon className="h-5 w-5 text-green-500" />
                                Usage Distribution
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {pieData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--popover))',
                                            border: '1px solid hsl(var(--border))',
                                            borderRadius: '8px'
                                        }}
                                        formatter={(value: number) => [`${formatHours(value)}h`, 'Hours']}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Timeline Chart */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
            >
                <Card className="border-muted/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-purple-500" />
                            Today's Timeline
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={timelineData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                                <XAxis
                                    dataKey="hour"
                                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                                />
                                <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--popover))',
                                        border: '1px solid hsl(var(--border))',
                                        borderRadius: '8px'
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="activity"
                                    stroke="#8884d8"
                                    strokeWidth={2}
                                    dot={{ fill: '#8884d8', strokeWidth: 2, r: 4 }}
                                    name="Activity"
                                />
                                <Line
                                    type="monotone"
                                    dataKey="productivity"
                                    stroke="#82ca9d"
                                    strokeWidth={2}
                                    dot={{ fill: '#82ca9d', strokeWidth: 2, r: 4 }}
                                    name="Productivity"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </motion.div>

            {/* App Details Grid */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
                {topApps.slice(0, 6).map((app, index) => (
                    <motion.div
                        key={app.name}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6 + index * 0.1 }}
                        whileHover={{ scale: 1.02 }}
                    >
                        <Card className="border-muted/50 hover:border-primary/20 transition-colors">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-semibold text-sm truncate">{app.name}</h3>
                                    <Badge variant="outline" className="text-xs">
                                        {app.hours}h
                                    </Badge>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">Sessions:</span>
                                        <span>{app.sessions}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">Avg Session:</span>
                                        <span>{app.avgSession}</span>
                                    </div>
                                    <div className="w-full bg-muted rounded-full h-2">
                                        <motion.div
                                            className="bg-primary h-2 rounded-full"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(app.hours * 10, 100)}%` }}
                                            transition={{ delay: 0.8 + index * 0.1, duration: 0.8 }}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </motion.div>
        </div>
    );
} 