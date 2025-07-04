import { useState } from 'react';
import { useRealtime } from '@/hooks/useRealtime';
import { useTheme } from '@/lib/theme-provider';
import { invoke } from '@tauri-apps/api/core';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Monitor,
    Play,
    Pause,
    Sun,
    Moon,
    Settings,
    AlertCircle,
    Sparkles,
    Terminal,
} from 'lucide-react';

import { Overview } from './dashboard/Overview';
import { TimeTracking } from './dashboard/TimeTracking';
import { Screenshots } from './dashboard/Screenshots';
import { AppUsagePieChart } from './dashboard/AppUsagePieChart';
import { ActivityHeatmap } from './dashboard/ActivityHeatmap';
import { LiveTerminal } from './dashboard/LiveTerminal';

export function Dashboard() {
    const { data, isLoading, error } = useRealtime();
    const { theme, setTheme } = useTheme();
    const [isPaused, setIsPaused] = useState(false);
    const [isTerminalOpen, setIsTerminalOpen] = useState(false);

    const handleToggleTracking = async () => {
        try {
            await invoke(isPaused ? 'resume' : 'pause');
            setIsPaused(!isPaused);
        } catch (error) {
            console.error('Failed to toggle tracking:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                    <p className="text-muted-foreground">Loading Dashboard...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-background text-destructive">
                <div className="flex flex-col items-center gap-2">
                    <AlertCircle className="h-12 w-12" />
                    <p className="font-semibold">Failed to load dashboard</p>
                    <p className="text-sm text-muted-foreground">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen w-screen bg-muted/40">
            <div className="flex flex-1 flex-col">
                <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b bg-background px-6">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Monitor className="h-7 w-7 text-primary" />
                            <h1 className="text-xl font-bold">Soham Tracker</h1>
                        </div>
                        <Badge variant="outline" className="hidden sm:flex items-center gap-1.5">
                            <Sparkles className="h-3 w-3 text-primary" />
                            AI-Powered Real-time Tracking
                        </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant={isPaused ? 'default' : 'outline'}
                            size="sm"
                            onClick={handleToggleTracking}
                            className="w-24"
                        >
                            {isPaused ? <Play className="mr-2 h-4 w-4" /> : <Pause className="mr-2 h-4 w-4" />}
                            {isPaused ? 'Resume' : 'Pause'}
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon">
                                    <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                                    <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                                    <span className="sr-only">Toggle theme</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setTheme('light')}>Light</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setTheme('dark')}>Dark</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setTheme('system')}>System</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button variant="outline" size="icon">
                            <Settings className="h-5 w-5" />
                            <span className="sr-only">Settings</span>
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => setIsTerminalOpen(prev => !prev)}>
                            <Terminal className="h-5 w-5" />
                            <span className="sr-only">Toggle Terminal</span>
                        </Button>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                    <div className="mx-auto max-w-5xl space-y-6">
                        <Overview data={data} />
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                            <div className="lg:col-span-3">
                                <TimeTracking data={data} />
                            </div>
                            <div className="lg:col-span-2">
                                <AppUsagePieChart data={data} />
                            </div>
                        </div>
                        <ActivityHeatmap />
                        <Screenshots data={data} />
                    </div>
                </main>
            </div>
            {isTerminalOpen && <LiveTerminal onClose={() => setIsTerminalOpen(false)} />}
        </div>
    );
} 