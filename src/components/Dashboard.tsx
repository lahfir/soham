import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRealtime } from '@/hooks/useRealtime';
import { useTheme } from '@/lib/theme-provider';
import { invoke } from '@tauri-apps/api/core';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

import {
    Monitor,
    Play,
    Pause,
    Sun,
    Moon,
    Settings,
    Activity,
    BarChart3,
    Camera,
    Zap,
    Clock,
    Users,
    AlertCircle,
    TrendingUp,
    Eye,
    Calendar,
    Filter,
    Sparkles,
    Layers,
    Command
} from 'lucide-react';

import { Overview } from './dashboard/Overview';
import { TimeTracking } from './dashboard/TimeTracking';
import { ActivityFeed } from './dashboard/ActivityFeed';
import { Screenshots } from './dashboard/Screenshots';

const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.6,
            staggerChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.4 }
    }
};

export function Dashboard() {
    const { data, isLoading, error } = useRealtime();
    const { theme, setTheme } = useTheme();
    const [isPaused, setIsPaused] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const handleToggleTracking = async () => {
        try {
            if (isPaused) {
                await invoke('resume');
                setIsPaused(false);
            } else {
                await invoke('pause');
                setIsPaused(true);
            }
        } catch (error) {
            console.error('Failed to toggle tracking:', error);
        }
    };

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="text-center"
                >
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full mx-auto mb-4"
                    />
                    <p className="text-xl font-semibold text-muted-foreground">
                        Loading Dashboard...
                    </p>
                </motion.div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center"
                >
                    <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
                    <p className="text-xl font-semibold text-destructive mb-2">
                        Failed to load dashboard
                    </p>
                    <p className="text-muted-foreground">{error}</p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
            <motion.div
                initial="hidden"
                animate="visible"
                variants={containerVariants}
                className="relative"
            >
                {/* Header */}
                <motion.div
                    variants={itemVariants}
                    className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur-sm"
                >
                    <div className="flex h-16 items-center justify-between px-6">
                        <div className="flex items-center space-x-4">
                            <motion.div
                                className="flex items-center space-x-2"
                                whileHover={{ scale: 1.05 }}
                            >
                                <motion.div
                                    animate={isPaused ? { scale: [1, 1.1, 1] } : {}}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="relative"
                                >
                                    <Monitor className="h-8 w-8 text-primary" />
                                    <motion.div
                                        className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                    />
                                </motion.div>
                                <div>
                                    <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                                        Soham Tracker
                                    </h1>
                                    <p className="text-xs text-muted-foreground">
                                        {currentTime.toLocaleTimeString()}
                                    </p>
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                <Badge
                                    variant="outline"
                                    className="text-xs bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20"
                                >
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    AI-Powered Real-time Tracking
                                </Badge>
                            </motion.div>
                        </div>

                        <div className="flex items-center space-x-3">
                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <Button
                                    variant={isPaused ? "default" : "outline"}
                                    size="sm"
                                    onClick={handleToggleTracking}
                                    className="flex items-center gap-2 relative overflow-hidden"
                                >
                                    <motion.div
                                        initial={false}
                                        animate={isPaused ? { rotate: 0 } : { rotate: 360 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                                    </motion.div>
                                    {isPaused ? 'Resume' : 'Pause'}
                                    {!isPaused && (
                                        <motion.div
                                            className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-green-600/20"
                                            animate={{ opacity: [0.5, 0.8, 0.5] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                        />
                                    )}
                                </Button>
                            </motion.div>

                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={toggleTheme}
                                    className="relative overflow-hidden"
                                >
                                    <motion.div
                                        initial={false}
                                        animate={{ rotate: theme === 'dark' ? 180 : 0 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        {theme === 'dark' ? (
                                            <Sun className="h-4 w-4" />
                                        ) : (
                                            <Moon className="h-4 w-4" />
                                        )}
                                    </motion.div>
                                </Button>
                            </motion.div>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <motion.div
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <Button variant="ghost" size="sm">
                                            <Settings className="h-4 w-4" />
                                        </Button>
                                    </motion.div>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem>
                                        <Command className="h-4 w-4 mr-2" />
                                        Preferences
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                        <Filter className="h-4 w-4 mr-2" />
                                        Filter Data
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                        <Calendar className="h-4 w-4 mr-2" />
                                        Export Data
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </motion.div>

                {/* Main Content */}
                <motion.div
                    variants={itemVariants}
                    className="flex-1 p-6 space-y-6"
                >
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <TabsList className="grid w-full grid-cols-4 bg-muted/50 backdrop-blur-sm">
                                <TabsTrigger
                                    value="overview"
                                    className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                                >
                                    <Eye className="h-4 w-4" />
                                    Overview
                                </TabsTrigger>
                                <TabsTrigger
                                    value="time-tracking"
                                    className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                                >
                                    <BarChart3 className="h-4 w-4" />
                                    Analytics
                                </TabsTrigger>
                                <TabsTrigger
                                    value="activity"
                                    className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                                >
                                    <Activity className="h-4 w-4" />
                                    Activity Feed
                                </TabsTrigger>
                                <TabsTrigger
                                    value="screenshots"
                                    className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                                >
                                    <Camera className="h-4 w-4" />
                                    Screenshots
                                </TabsTrigger>
                            </TabsList>
                        </motion.div>

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                <TabsContent value="overview" className="space-y-6">
                                    <Overview data={data} />
                                </TabsContent>

                                <TabsContent value="time-tracking" className="space-y-6">
                                    <TimeTracking data={data} />
                                </TabsContent>

                                <TabsContent value="activity" className="space-y-6">
                                    <ActivityFeed data={data} />
                                </TabsContent>

                                <TabsContent value="screenshots" className="space-y-6">
                                    <Screenshots data={data} />
                                </TabsContent>
                            </motion.div>
                        </AnimatePresence>
                    </Tabs>
                </motion.div>
            </motion.div>
        </div>
    );
} 