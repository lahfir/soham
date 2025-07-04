import React, { useState, useEffect } from 'react';
import ReactFlow, { Controls, Background, MiniMap, NodeProps, Handle, Position } from 'reactflow';
import 'reactflow/dist/style.css';

import { useAppFlow, AppNodeData, WindowEventPayload, ScreenshotPayload } from '@/hooks/useAppFlow';
import { useAppIcon } from '@/hooks/useAppIcon';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Camera, Calendar as CalendarIcon, Maximize, Minimize, XCircle, RefreshCw, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { invoke } from '@tauri-apps/api/core';

const EventIcon: React.FC<{ event: WindowEventPayload | ScreenshotPayload }> = ({ event }) => {
    if ('event_type' in event) { // WindowEvent
        switch (event.event_type) {
            case 'minimize': return <Minimize className="h-4 w-4 text-muted-foreground" />;
            case 'maximize': return <Maximize className="h-4 w-4 text-muted-foreground" />;
            case 'close': return <XCircle className="h-4 w-4 text-muted-foreground" />;
        }
    }
    return <Camera className="h-4 w-4 text-muted-foreground" />;
};

const AppNodeComponent: React.FC<NodeProps<AppNodeData>> = ({ data, selected }) => {
    const appIcon = useAppIcon(data.appName);
    const hasEvents = data.events && data.events.length > 0;
    const durationSec = Math.max(0, Math.floor(((data.endTimestamp ?? Math.floor(Date.now() / 1000)) - data.startTimestamp)));

    return (
        <div className="relative">
            <Handle type="target" position={Position.Left} className="pointer-events-none !bg-transparent" />
            <Handle type="source" position={Position.Right} className="pointer-events-none !bg-transparent" />
            <Tooltip>
                <TooltipTrigger asChild>
                    <Card className={cn(
                        "w-80 border-2 bg-background/60 shadow-lg backdrop-blur-sm transition-all duration-200 dark:bg-background/0 dark:border-foreground/10",
                        selected ? "border-primary/80 shadow-primary/20 dark:border-foreground dark:shadow-foreground/20" : "border-transparent"
                    )}>
                        <div className="flex items-center gap-4 p-3">
                            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-muted/50">
                                {appIcon ? (
                                    <img src={appIcon} alt={data.appName} className="h-full w-full object-contain" />
                                ) : (
                                    <Activity className="h-6 w-6 text-muted-foreground" />
                                )}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="truncate font-bold text-lg text-foreground">{data.appName}</p>
                                <p className="text-xs text-muted-foreground">
                                    {format(new Date(data.startTimestamp * 1000), 'HH:mm:ss')} • {formatDurationShort(durationSec)}
                                </p>
                            </div>
                            {hasEvents && (
                                <div className="text-xs font-semibold text-primary/80 flex items-center gap-1">
                                    {data.events.length}
                                    <span className="text-muted-foreground">events</span>
                                </div>
                            )}
                        </div>
                    </Card>
                </TooltipTrigger>
                {hasEvents && (
                    <TooltipContent className="max-w-sm p-3 bg-background/80 backdrop-blur-sm border border-border shadow-lg" side="right">
                        <div className="space-y-3">
                            <p className="font-bold text-foreground">Logged Events</p>
                            {data.events.map((event, i) => (
                                <div key={i} className="flex items-start gap-3 text-sm">
                                    <div className="pt-0.5"><EventIcon event={event} /></div>
                                    <div className="flex-1">
                                        {'event_type' in event ? (
                                            <>
                                                <span className="font-semibold capitalize text-foreground">{event.event_type}</span>
                                                <p className="text-muted-foreground truncate">{event.window_title}</p>
                                            </>
                                        ) : (
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <p className="cursor-pointer hover:underline text-foreground">Screenshot taken</p>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-4xl">
                                                    <DialogHeader><DialogTitle>Screenshot at {format(new Date(event.ts * 1000), 'PPPp')}</DialogTitle></DialogHeader>
                                                    <img src={`data:image/png;base64,${event.path}`} alt={`Screenshot`} className="w-full rounded-md" />
                                                </DialogContent>
                                            </Dialog>
                                        )}
                                        <p className="text-xs text-muted-foreground">{format(new Date(event.ts * 1000), 'HH:mm:ss')}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </TooltipContent>
                )}
            </Tooltip>
        </div>
    );
};

const nodeTypes = { appNode: AppNodeComponent };

function formatDurationShort(seconds: number) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    const parts = [] as string[];
    if (hrs) parts.push(`${hrs}h`);
    if (mins) parts.push(`${mins}m`);
    if (secs || parts.length === 0) parts.push(`${secs}s`);
    return parts.join(' ');
}

export const TimelinePage: React.FC = () => {
    const [date, setDate] = useState(new Date());
    const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
    const [sessions, setSessions] = useState<{ id: number; start_ts: number; end_ts: number | null }[]>([]);
    const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);

    useEffect(() => {
        const fetchSessions = async () => {
            try {
                const dateStr = format(date, 'yyyy-MM-dd');
                const result = await invoke<{ id: number; start_ts: number; end_ts: number | null }[]>(
                    'get_sessions_for_date',
                    { date: dateStr }
                );
                setSessions(result);
                setSelectedSessionId(null);
            } catch (e) {
                console.error(e);
            }
        };
        fetchSessions();
    }, [date]);

    const { nodes, edges, isLoading, error, refresh, onNodesChange, onEdgesChange, onConnect } = useAppFlow(date, orientation, selectedSessionId);

    return (
        <div className="flex h-screen flex-col bg-muted/20">
            <header className="flex flex-shrink-0 items-center justify-between border-b bg-background/80 p-3 backdrop-blur-sm">
                <h1 className="text-lg font-semibold">Application Flow</h1>
                <div className="flex items-center gap-2">
                    <Button
                        variant={orientation === 'horizontal' ? 'default' : 'outline'}
                        size="icon"
                        onClick={() => setOrientation('horizontal')}
                    >H</Button>
                    <Button
                        variant={orientation === 'vertical' ? 'default' : 'outline'}
                        size="icon"
                        onClick={() => setOrientation('vertical')}
                    >V</Button>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-[280px] justify-start text-left font-normal">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {format(date, 'PPP')}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-50">
                            <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus />
                        </PopoverContent>
                    </Popover>
                    {sessions.length > 0 && (
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
                                    Session: {selectedSessionId == null ? 'All' : `#${selectedSessionId}`}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="p-0 w-[220px] z-50">
                                <div className="py-1">
                                    <button
                                        className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50"
                                        onClick={() => setSelectedSessionId(null)}
                                    >All Sessions</button>
                                    {sessions.map((s) => (
                                        <button
                                            key={s.id}
                                            className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50"
                                            onClick={() => setSelectedSessionId(s.id)}
                                        >{`#${s.id} - ${format(new Date(s.start_ts * 1000), 'HH:mm')} ${s.end_ts ? '-' + format(new Date(s.end_ts * 1000), 'HH:mm') : ''}`}</button>
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>
                    )}
                    <Button variant="ghost" size="icon" onClick={refresh} disabled={isLoading}>
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </header>
            <main className="relative flex-1">
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50 dark:bg-background/70">
                        <Skeleton className="h-32 w-1/3" />
                    </div>
                )}
                {error && <div className="p-4 text-destructive dark:text-destructive">{error}</div>}
                {!isLoading && !error && (
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        nodeTypes={nodeTypes}
                        fitView
                        fitViewOptions={{ padding: 0.2 }}
                        proOptions={{ hideAttribution: true }}
                    >
                        <Controls className="fill-muted-foreground stroke-muted-foreground text-muted-foreground dark:fill-foreground dark:stroke-foreground dark:text-foreground" />
                        <MiniMap
                            nodeStrokeWidth={3}
                            zoomable
                            pannable
                            className="dark:bg-background dark:border-border"
                        />
                        <Background
                            gap={24}
                            className="dark:bg-background"
                            color="hsl(var(--border))"
                        />
                    </ReactFlow>
                )}
            </main>
        </div>
    );
};