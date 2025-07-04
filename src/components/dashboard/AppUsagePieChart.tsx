import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { RealtimeData } from '@/hooks/useRealtime';
import { PieChart as PieChartIcon } from 'lucide-react';

interface AppUsagePieChartProps {
    data: RealtimeData | null;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1919'];

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const hours = Math.floor(data.value / 3600);
        const minutes = Math.floor((data.value % 3600) / 60);
        return (
            <div className="p-2 text-sm bg-background/80 backdrop-blur-sm border rounded-lg shadow-lg">
                <p className="font-bold">{data.name}</p>
                <p className="text-muted-foreground">{`Time: ${hours}h ${minutes}m`}</p>
                <p className="text-primary">{`(${(payload[0].percent * 100).toFixed(0)}%)`}</p>
            </div>
        );
    }
    return null;
};

export function AppUsagePieChart({ data }: AppUsagePieChartProps) {
    if (!data || !data.app_stats || data.app_stats.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <PieChartIcon className="h-5 w-5" />
                        App Distribution
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-64">
                    <p className="text-muted-foreground">No app usage data available.</p>
                </CardContent>
            </Card>
        );
    }

    const pieData = data.app_stats.slice(0, 5).map(app => ({
        name: app.app_id,
        value: app.total_duration,
    }));

    // If there are more than 5 apps, group the rest into "Other"
    if (data.app_stats.length > 5) {
        const otherDuration = data.app_stats.slice(5).reduce((acc, app) => acc + app.total_duration, 0);
        pieData.push({ name: 'Other', value: otherDuration });
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <PieChartIcon className="h-5 w-5" />
                    App Distribution
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            isAnimationActive={false}
                        >
                            {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend iconSize={10} />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
} 