import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Activity, TrendingUp, ArrowRight, Zap, ExternalLink, RefreshCw } from 'lucide-react';
import { format } from "date-fns";
import { useAppIcon } from "@/hooks/useAppIcon";
import { useAppLifecycleFlow } from "@/hooks/useAppLifecycleFlow";
import { useFlowVisualization, AppNodeData } from "@/hooks/useFlowVisualization";

import ReactFlow, {
    MiniMap,
    Controls,
    Background,
    BackgroundVariant,
} from 'reactflow';

import 'reactflow/dist/style.css';

/**
 * Custom App Node Component for React Flow
 * Displays app information with icon, name, time, and transition type
 */
const AppNode: React.FC<{ data: AppNodeData }> = ({ data }) => {
    const appIcon = useAppIcon(data.app_name);

    return (
        <div className="bg-card/95 backdrop-blur-sm border border-border/50 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 min-w-[200px] max-w-[240px]">
            <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-muted/50 flex items-center justify-center">
                    {appIcon ? (
                        <img
                            src={`data:image/png;base64,${appIcon}`}
                            alt={data.app_name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                            <span className="text-xs font-medium text-primary">
                                {data.app_name.charAt(0).toUpperCase()}
                            </span>
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate text-foreground">
                        {data.app_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {data.time}
                    </p>
                </div>
            </div>

            <div className="flex items-center justify-between">
                <Badge
                    variant={data.transition_type === 'switch' ? 'default' : 'secondary'}
                    className="text-xs"
                >
                    {data.transition_type === 'switch' ? (
                        <><ArrowRight className="w-3 h-3 mr-1" />Switch</>
                    ) : (
                        <><Zap className="w-3 h-3 mr-1" />New</>
                    )}
                </Badge>
                <ExternalLink className="w-3 h-3 text-muted-foreground" />
            </div>
        </div>
    );
};

const nodeTypes = {
    appNode: AppNode,
};

/**
 * TimelinePage Component
 * Displays interactive app lifecycle flow visualization
 */
export const TimelinePage: React.FC = () => {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());

    // Data fetching hook
    const {
        flows,
        stats,
        isLoading,
        error,
        refresh,
        lastFetched
    } = useAppLifecycleFlow(selectedDate, {
        enableRealtime: true,
        autoRefresh: true,
    });

    // Visualization hook
    const {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        onConnect,
    } = useFlowVisualization(flows, {
        nodeSpacing: 300,
        maxNodesPerRow: 4,
        rowHeight: 200,
        animated: true,
    });

    // ReactFlow default edge style
    const defaultEdgeOptions = {
        animated: true,
        style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
    };

    const handleDateChange = (date: Date | undefined) => {
        if (date) {
            setSelectedDate(date);
        }
    };

    const handleRefresh = () => {
        refresh();
    };

    return (
        <div className="h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted/20">
            {/* Header */}
            <div className="flex items-center justify-between p-6 bg-card/50 backdrop-blur-sm border-b border-border/50">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-primary" />
                        <h1 className="text-xl font-semibold">App Lifecycle Flow</h1>
                    </div>

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="h-9 px-3">
                                <CalendarIcon className="w-4 h-4 mr-2" />
                                {format(selectedDate, 'MMM dd, yyyy')}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={handleDateChange}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <TrendingUp className="w-4 h-4" />
                            <span>{stats.apps} apps</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <ArrowRight className="w-4 h-4" />
                            <span>{stats.transitions} transitions</span>
                        </div>
                        {lastFetched && (
                            <div className="text-xs text-muted-foreground/70">
                                Last: {format(lastFetched, 'HH:mm:ss')}
                            </div>
                        )}
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={isLoading}
                        className="h-9 px-3"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>

                    {isLoading && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            Loading...
                        </div>
                    )}
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="mx-6 mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <div className="flex items-center gap-2 text-destructive">
                        <Activity className="w-4 h-4" />
                        <span className="font-medium">Error loading flow data</span>
                    </div>
                    <p className="text-sm text-destructive/80 mt-1">{error}</p>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        className="mt-2"
                    >
                        Try Again
                    </Button>
                </div>
            )}

            {/* Flow Visualization */}
            <div className="flex-1 relative">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    nodeTypes={nodeTypes}
                    defaultEdgeOptions={defaultEdgeOptions}
                    nodesDraggable={false}
                    nodesConnectable={false}
                    elementsSelectable={false}
                    fitView
                    fitViewOptions={{ padding: 100 }}
                    className="bg-transparent"
                >
                    <Controls
                        className="bg-card/90 backdrop-blur-sm border border-border/50 rounded-lg"
                        showZoom={true}
                        showFitView={true}
                        showInteractive={true}
                    />
                    <MiniMap
                        className="bg-card/90 backdrop-blur-sm border border-border/50 rounded-lg"
                        nodeColor="hsl(var(--primary))"
                        maskColor="hsl(var(--background))"
                    />
                    <Background
                        variant={BackgroundVariant.Dots}
                        gap={20}
                        size={1}
                        color="hsl(var(--muted-foreground))"
                        style={{ opacity: 0.3 }}
                    />
                </ReactFlow>

                {/* Empty State */}
                {flows.length === 0 && !isLoading && !error && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                            <Activity className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                            <p className="text-muted-foreground">No app transitions found for this date</p>
                            <p className="text-sm text-muted-foreground/70 mt-1">
                                Try selecting a different date or start using some apps
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};