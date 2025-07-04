import { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { X, RadioTower } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { ActivityPayload } from "@/types/dashboard";
import { AppIcon } from "./AppIcon";

interface AppUsage {
    id: string;
    duration: number;
    lastActive: number;
}

const POLL_INTERVAL_S = 5;

function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return [h, m, s]
        .map(v => v.toString().padStart(2, '0'))
        .join(':');
}

export function LiveEventFeed() {
    const [usage, setUsage] = useState<Map<string, AppUsage>>(new Map());
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const unlistenActivity = listen<ActivityPayload>("new-activity", (event) => {
            const appId = event.payload.app;
            if (!appId) return;

            setUsage(prevUsage => {
                const newUsage = new Map(prevUsage);
                const existing = newUsage.get(appId) || { id: appId, duration: 0, lastActive: 0 };
                newUsage.set(appId, {
                    ...existing,
                    duration: existing.duration + POLL_INTERVAL_S,
                    lastActive: Date.now()
                });
                return newUsage;
            });
        });

        const unlistenToggle = listen('toggle-live-feed', () => {
            setIsVisible(v => !v);
        });

        return () => {
            Promise.all([unlistenActivity, unlistenToggle]).then(([f1, f2]) => {
                f1();
                f2();
            });
        };
    }, []);

    if (!isVisible) return null;

    const sortedUsage = Array.from(usage.values()).sort((a, b) => b.lastActive - a.lastActive);

    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="fixed bottom-4 right-4 w-96 z-50"
        >
            <Card className="shadow-2xl bg-background/80 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between p-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <RadioTower className="h-5 w-5" />
                        Live App Usage
                    </CardTitle>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsVisible(false)}>
                        <X className="h-4 w-4" />
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="h-48">
                        <div className="p-3 space-y-3">
                            {sortedUsage.length === 0 ? (
                                <p className="text-center text-sm text-muted-foreground p-4">Awaiting activity...</p>
                            ) : (
                                <AnimatePresence initial={false}>
                                    {sortedUsage.map(app => (
                                        <motion.div
                                            key={app.id}
                                            layout
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="flex items-center gap-3 text-sm"
                                        >
                                            <AppIcon appId={app.id} className="h-5 w-5 rounded-md flex-shrink-0" />
                                            <span className="truncate font-medium">{app.id}</span>
                                            <span className="font-mono text-right ml-auto text-muted-foreground">
                                                {formatDuration(app.duration)}
                                            </span>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </motion.div>
    );
} 