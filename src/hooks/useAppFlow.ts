import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Node, Edge, useNodesState, useEdgesState, MarkerType, addEdge } from 'reactflow';
import { startOfDay, endOfDay } from 'date-fns';

// 1. Data Types from Backend
export type TimelineEvent =
    | { type: 'AppTransition'; payload: AppTransitionPayload }
    | { type: 'WindowEvent'; payload: WindowEventPayload }
    | { type: 'Screenshot'; payload: ScreenshotPayload };

export interface AppTransitionPayload { from_app: string; to_app: string; ts: number; transition_type: string; }
export interface WindowEventPayload { event_type: 'minimize' | 'maximize' | 'close'; window_title: string; app_id: string; ts: number; }
export interface ScreenshotPayload { path: string; ts: number; }

// 2. Data Structures for React Flow Nodes
export interface AppNodeData {
    appName: string;
    events: (WindowEventPayload | ScreenshotPayload)[];
    startTimestamp: number;
    endTimestamp?: number;
}

// 3. The consolidated hook
export const useAppFlow = (
    date: Date,
    orientation: 'horizontal' | 'vertical' = 'horizontal',
    sessionId?: number | null,
) => {
    const [nodes, setNodes, onNodesChange] = useNodesState<AppNodeData>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const onConnect = useCallback((params: any) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

    const generateFlow = useCallback((events: TimelineEvent[]) => {
        if (!events || events.length === 0) {
            setNodes([]);
            setEdges([]);
            return;
        }

        const transitions = events.filter(e => e.type === 'AppTransition') as Extract<TimelineEvent, { type: 'AppTransition' }>[];
        const otherEvents = events.filter(e => e.type !== 'AppTransition') as (Extract<TimelineEvent, { type: 'WindowEvent' | 'Screenshot' }>)[]

        if (transitions.length === 0) {
            setNodes([]);
            setEdges([]);
            return;
        }

        const newNodes: Node<AppNodeData>[] = [];
        const newEdges: Edge[] = [];

        // Create a definitive, linear sequence of app appearances
        const appSequence = [transitions[0].payload.from_app, ...transitions.map(t => t.payload.to_app)];

        const GAP = 80;
        const NODE_WIDTH = 320;
        const NODE_HEIGHT = 140;

        const total = appSequence.length;
        const gridSize = Math.ceil(Math.sqrt(total));

        appSequence.forEach((appName, i) => {
            const startTimestamp = transitions[i - 1]?.payload.ts ?? (transitions[0].payload.ts - 1);
            const endTimestamp = transitions[i]?.payload.ts;

            const col = orientation === 'horizontal' ? i % gridSize : Math.floor(i / gridSize);
            const row = orientation === 'horizontal' ? Math.floor(i / gridSize) : i % gridSize;

            const position = {
                x: col * (NODE_WIDTH + GAP),
                y: row * (NODE_HEIGHT + GAP),
            };

            newNodes.push({
                id: `node-${i}`,
                type: 'appNode',
                position,
                data: {
                    appName,
                    events: [],
                    startTimestamp,
                    endTimestamp,
                },
            });

            if (i > 0) {
                const transition = transitions[i - 1].payload;
                newEdges.push({
                    id: `edge-${i - 1}`,
                    source: `node-${i - 1}`,
                    target: `node-${i}`,
                    type: 'smoothstep',
                    label: transition.transition_type,
                    labelStyle: { fill: 'hsl(var(--foreground)) dark:hsl(var(--foreground))', fontWeight: 500, fontSize: 12 },
                    labelBgPadding: [8, 4],
                    labelBgBorderRadius: 4,
                    labelBgStyle: { fill: 'hsl(var(--card))', fillOpacity: 0.8 },
                    markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--primary)) dark:hsl(var(--primary))' },
                });
            }
        });

        // Associate other events with the correct node based on timestamp
        otherEvents.forEach(event => {
            const eventTs = event.payload.ts;
            const targetNode = newNodes.find(node =>
                eventTs >= node.data.startTimestamp &&
                (node.data.endTimestamp === undefined || eventTs < node.data.endTimestamp)
            );

            if (targetNode) {
                targetNode.data.events.push(event.payload);
            }
        });

        setNodes(newNodes);
        setEdges(newEdges);
    }, [setNodes, setEdges, orientation]);

    const fetchAndGenerateFlow = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            let events: TimelineEvent[];
            if (sessionId != null) {
                events = await invoke("get_unified_timeline_events_for_session", { sessionId });
            } else {
                const from = Math.floor(startOfDay(date).getTime() / 1000);
                const to = Math.floor(endOfDay(date).getTime() / 1000);
                events = await invoke("get_unified_timeline_events", { from, to });
            }
            generateFlow(events.reverse()); // Reverse to process chronologically
        } catch (e: any) {
            setError(e.toString());
        } finally {
            setIsLoading(false);
        }
    }, [date, sessionId, generateFlow]);

    useEffect(() => {
        fetchAndGenerateFlow();
    }, [fetchAndGenerateFlow]);

    return { nodes, edges, isLoading, error, onNodesChange, onEdgesChange, onConnect, refresh: fetchAndGenerateFlow };
}; 