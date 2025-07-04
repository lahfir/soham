import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HeatmapData, HeatmapMonthData, HeatmapYearData } from '@/types/dashboard';

interface ActivityHeatmapProps {
    data: HeatmapData[] | HeatmapMonthData[] | HeatmapYearData[];
    range?: 'week' | 'month' | 'year';
}

const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function ActivityHeatmap({ data, range = 'week' }: ActivityHeatmapProps) {
    const formatDuration = (seconds: number): string => {
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours}h ${remainingMinutes}m`;
    };

    const getGitHubStyleColor = (duration: number, maxDuration: number): string => {
        if (duration === 0) return 'bg-muted/20 hover:bg-muted/30 border-muted/30';
        const intensity = Math.min(duration / Math.max(maxDuration, 1), 1);

        if (intensity < 0.25) return 'bg-primary/25 hover:bg-primary/35 border-primary/40';
        if (intensity < 0.5) return 'bg-primary/45 hover:bg-primary/55 border-primary/60';
        if (intensity < 0.75) return 'bg-primary/65 hover:bg-primary/75 border-primary/80';
        return 'bg-primary/85 hover:bg-primary/95 border-primary/90';
    };

    const renderWeekView = () => {
        const gridData: number[][] = Array(7).fill(0).map(() => Array(24).fill(0));
        let maxDuration = 0;

        (data as HeatmapData[]).forEach(item => {
            if (item.day_of_week >= 0 && item.day_of_week < 7 && item.hour_of_day >= 0 && item.hour_of_day < 24) {
                gridData[item.day_of_week][item.hour_of_day] = item.total_duration;
                if (item.total_duration > maxDuration) {
                    maxDuration = item.total_duration;
                }
            }
        });

        return (
            <div className="space-y-4 w-full">
                {/* Legend */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground justify-end">
                    <span>Less</span>
                    <div className="flex gap-1">
                        <div className="w-3 h-3 rounded-md bg-muted/20 border border-muted/30"></div>
                        <div className="w-3 h-3 rounded-md bg-primary/25 border border-primary/40"></div>
                        <div className="w-3 h-3 rounded-md bg-primary/45 border border-primary/60"></div>
                        <div className="w-3 h-3 rounded-md bg-primary/65 border border-primary/80"></div>
                        <div className="w-3 h-3 rounded-md bg-primary/85 border border-primary/90"></div>
                    </div>
                    <span>More</span>
                </div>

                <div className="w-full space-y-2">
                    {/* Hour labels - spread across full width */}
                    <div className="flex">
                        <div className="w-12"></div>
                        <div className="flex-1 grid grid-cols-24 gap-1 text-xs text-muted-foreground font-medium">
                            {Array.from({ length: 24 }).map((_, i) => (
                                <div key={i} className="text-center">{i % 4 === 0 ? `${i}h` : ''}</div>
                            ))}
                        </div>
                    </div>

                    {/* Main grid with day labels */}
                    <div className="flex">
                        <div className="w-12 flex flex-col gap-1">
                            {days.map((day) => (
                                <div key={day} className="h-4 flex items-center justify-end pr-2 text-xs font-medium text-muted-foreground">
                                    {day}
                                </div>
                            ))}
                        </div>
                        <div className="flex-1 grid grid-cols-24 gap-1">
                            {Array.from({ length: 7 }).map((_, dayIndex) =>
                                Array.from({ length: 24 }).map((_, hourIndex) => {
                                    const duration = gridData[dayIndex][hourIndex];
                                    return (
                                        <Tooltip key={`${dayIndex}-${hourIndex}`} delayDuration={100}>
                                            <TooltipTrigger asChild>
                                                <div
                                                    className={`w-full h-4 rounded-md transition-all duration-200 cursor-pointer border ${getGitHubStyleColor(duration, maxDuration)}`}
                                                />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <div className="text-center">
                                                    <div className="font-medium">{formatDuration(duration)}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {days[dayIndex]} at {hourIndex}:00
                                                    </div>
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderMonthView = () => {
        const daysInMonth = 31;
        const gridData: number[][] = Array(daysInMonth).fill(0).map(() => Array(24).fill(0));
        let maxDuration = 0;

        (data as HeatmapMonthData[]).forEach(item => {
            const dayIndex = item.day_of_month - 1;
            const hourIndex = item.hour_of_day;
            if (dayIndex >= 0 && dayIndex < daysInMonth && hourIndex >= 0 && hourIndex < 24) {
                gridData[dayIndex][hourIndex] = item.total_duration;
                if (item.total_duration > maxDuration) {
                    maxDuration = item.total_duration;
                }
            }
        });

        return (
            <div className="space-y-4 w-full">
                {/* Legend */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground justify-end">
                    <span>Less</span>
                    <div className="flex gap-1">
                        <div className="w-3 h-3 rounded-md bg-muted/20 border border-muted/30"></div>
                        <div className="w-3 h-3 rounded-md bg-primary/25 border border-primary/40"></div>
                        <div className="w-3 h-3 rounded-md bg-primary/45 border border-primary/60"></div>
                        <div className="w-3 h-3 rounded-md bg-primary/65 border border-primary/80"></div>
                        <div className="w-3 h-3 rounded-md bg-primary/85 border border-primary/90"></div>
                    </div>
                    <span>More</span>
                </div>

                <div className="w-full space-y-2">
                    {/* Hour labels - spread across full width */}
                    <div className="flex">
                        <div className="w-12"></div>
                        <div className="flex-1 grid grid-cols-24 gap-1 text-xs text-muted-foreground font-medium">
                            {Array.from({ length: 24 }).map((_, i) => (
                                <div key={i} className="text-center">{i % 4 === 0 ? `${i}h` : ''}</div>
                            ))}
                        </div>
                    </div>

                    {/* Main grid with day labels */}
                    <div className="flex">
                        <div className="w-12 flex flex-col gap-1">
                            {Array.from({ length: daysInMonth }).map((_, i) => (
                                <div key={i} className="h-3 flex items-center justify-end pr-2 text-xs font-medium text-muted-foreground">
                                    {i + 1}
                                </div>
                            ))}
                        </div>
                        <div className="flex-1 grid grid-cols-24 gap-1 max-h-[400px] overflow-y-auto">
                            {Array.from({ length: daysInMonth }).map((_, dayIndex) =>
                                Array.from({ length: 24 }).map((_, hourIndex) => {
                                    const duration = gridData[dayIndex][hourIndex];
                                    return (
                                        <Tooltip key={`${dayIndex}-${hourIndex}`} delayDuration={100}>
                                            <TooltipTrigger asChild>
                                                <div
                                                    className={`w-full h-3 rounded-md transition-all duration-200 cursor-pointer border ${getGitHubStyleColor(duration, maxDuration)}`}
                                                />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <div className="text-center">
                                                    <div className="font-medium">{formatDuration(duration)}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        Day {dayIndex + 1} at {hourIndex}:00
                                                    </div>
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderYearView = () => {
        const daysInYear = 365;
        const gridData: number[] = Array(daysInYear).fill(0);
        let maxDuration = 0;

        (data as HeatmapYearData[]).forEach(item => {
            const dayIndex = item.day_of_year - 1;
            if (dayIndex >= 0 && dayIndex < daysInYear) {
                gridData[dayIndex] += item.total_duration;
                if (gridData[dayIndex] > maxDuration) {
                    maxDuration = gridData[dayIndex];
                }
            }
        });

        const weeksInYear = 53;
        const weeksData: number[][] = Array(weeksInYear).fill(0).map(() => Array(7).fill(0));

        // Map days to weeks
        gridData.forEach((duration, dayIndex) => {
            const weekIndex = Math.floor(dayIndex / 7);
            const dayOfWeek = dayIndex % 7;
            if (weekIndex < weeksInYear) {
                weeksData[weekIndex][dayOfWeek] = duration;
            }
        });

        return (
            <div className="space-y-4 w-full">
                {/* Legend */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground justify-end">
                    <span>Less</span>
                    <div className="flex gap-1">
                        <div className="w-3 h-3 rounded-md bg-muted/20 border border-muted/30"></div>
                        <div className="w-3 h-3 rounded-md bg-primary/25 border border-primary/40"></div>
                        <div className="w-3 h-3 rounded-md bg-primary/45 border border-primary/60"></div>
                        <div className="w-3 h-3 rounded-md bg-primary/65 border border-primary/80"></div>
                        <div className="w-3 h-3 rounded-md bg-primary/85 border border-primary/90"></div>
                    </div>
                    <span>More</span>
                </div>

                <div className="w-full space-y-2">
                    {/* Month labels - spread across full width */}
                    <div className="flex">
                        <div className="w-12"></div>
                        <div className="flex-1 grid grid-cols-12 gap-1 text-xs text-muted-foreground font-medium">
                            {months.map((month) => (
                                <div key={month} className="text-center">{month}</div>
                            ))}
                        </div>
                    </div>

                    {/* Main grid with day labels */}
                    <div className="flex">
                        <div className="w-12 flex flex-col gap-1">
                            {days.map((day) => (
                                <div key={day} className="h-4 flex items-center justify-end pr-2 text-xs font-medium text-muted-foreground">
                                    {day}
                                </div>
                            ))}
                        </div>
                        <div className="flex-1 grid grid-cols-53 gap-1">
                            {Array.from({ length: weeksInYear }).map((_, weekIndex) =>
                                Array.from({ length: 7 }).map((_, dayIndex) => {
                                    const duration = weeksData[weekIndex][dayIndex];
                                    const dayOfYear = weekIndex * 7 + dayIndex + 1;
                                    return (
                                        <Tooltip key={`${weekIndex}-${dayIndex}`} delayDuration={100}>
                                            <TooltipTrigger asChild>
                                                <div
                                                    className={`w-full h-4 rounded-md transition-all duration-200 cursor-pointer border ${getGitHubStyleColor(duration, maxDuration)}`}
                                                />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <div className="text-center">
                                                    <div className="font-medium">{formatDuration(duration)}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        Day {dayOfYear} of year
                                                    </div>
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="w-full">
            <TooltipProvider>
                {range === 'week' && renderWeekView()}
                {range === 'month' && renderMonthView()}
                {range === 'year' && renderYearView()}
            </TooltipProvider>
        </div>
    );
} 