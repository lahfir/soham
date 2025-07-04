import { useEffect, useCallback } from 'react';
import { Node, Edge, useNodesState, useEdgesState, addEdge, MarkerType } from 'reactflow';
import { AppLifecycleFlow } from '@/types/dashboard';

export interface AppNodeData {
    app_name: string;
    time: string;
    transition_type: string;
    created_at: number;
}

export interface FlowVisualizationConfig {
    nodeSpacing?: number;
    maxNodesPerRow?: number;
    rowHeight?: number;
    animated?: boolean;
}

/**
 * Hook for managing React Flow visualization from lifecycle flow data
 * @param flows - Array of app lifecycle flow data
 * @param config - Configuration options for the visualization
 * @returns Object containing nodes, edges, and React Flow event handlers
 */
export function useFlowVisualization(
    flows: AppLifecycleFlow[],
    config: FlowVisualizationConfig = {}
) {
    const [nodes, setNodes, onNodesChange] = useNodesState<AppNodeData>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    const {
        nodeSpacing = 300,
        maxNodesPerRow = 4,
        rowHeight = 200,
        animated = true,
    } = config;

    const onConnect = useCallback((params: any) => {
        setEdges((eds) => addEdge(params, eds));
    }, [setEdges]);

    const createVisualization = useCallback(() => {
        if (flows.length === 0) {
            setNodes([]);
            setEdges([]);
            return;
        }

        console.log('🎨 [useFlowVisualization] Creating visualization for', flows.length, 'flows');

        const nodeMap = new Map<string, Node<AppNodeData>>();
        const edgeList: Edge[] = [];

        let xPosition = 0;
        let yPosition = 0;

        flows.forEach((flow, index) => {
            // Create from_app node if not exists
            if (!nodeMap.has(flow.from_app)) {
                nodeMap.set(flow.from_app, {
                    id: `app-${flow.from_app}`,
                    type: 'appNode',
                    position: { x: xPosition, y: yPosition },
                    data: {
                        app_name: flow.from_app,
                        time: flow.time,
                        transition_type: flow.transition_type,
                        created_at: flow.created_at,
                    },
                });
                xPosition += nodeSpacing;
            }

            // Create to_app node if not exists
            if (!nodeMap.has(flow.to_app)) {
                nodeMap.set(flow.to_app, {
                    id: `app-${flow.to_app}`,
                    type: 'appNode',
                    position: { x: xPosition, y: yPosition },
                    data: {
                        app_name: flow.to_app,
                        time: flow.time,
                        transition_type: flow.transition_type,
                        created_at: flow.created_at,
                    },
                });
                xPosition += nodeSpacing;

                // Wrap to next row if needed
                if (xPosition > nodeSpacing * maxNodesPerRow) {
                    xPosition = 0;
                    yPosition += rowHeight;
                }
            }

            // Create edge between apps
            const edgeId = `edge-${index}`;
            const sourceId = `app-${flow.from_app}`;
            const targetId = `app-${flow.to_app}`;

            // Avoid duplicate edges
            if (!edgeList.find(e => e.source === sourceId && e.target === targetId)) {
                edgeList.push({
                    id: edgeId,
                    source: sourceId,
                    target: targetId,
                    type: 'smoothstep',
                    animated,
                    label: `${flow.time} - ${flow.transition_type}`,
                    labelStyle: {
                        fill: 'hsl(var(--foreground))',
                        fontSize: 12,
                        fontWeight: 500,
                    },
                    labelBgStyle: {
                        fill: 'hsl(var(--background))',
                        fillOpacity: 0.9,
                    },
                    style: {
                        stroke: flow.transition_type === 'switch'
                            ? 'hsl(var(--primary))'
                            : 'hsl(var(--chart-2))',
                        strokeWidth: 2,
                    },
                    markerEnd: {
                        type: MarkerType.ArrowClosed,
                        color: flow.transition_type === 'switch'
                            ? 'hsl(var(--primary))'
                            : 'hsl(var(--chart-2))',
                    },
                });
            }
        });

        const nodeArray = Array.from(nodeMap.values());
        setNodes(nodeArray);
        setEdges(edgeList);

        console.log('🎯 [useFlowVisualization] Created:', nodeArray.length, 'nodes,', edgeList.length, 'edges');
    }, [flows, nodeSpacing, maxNodesPerRow, rowHeight, animated, setNodes, setEdges]);

    // Update visualization when flows change
    useEffect(() => {
        createVisualization();
    }, [createVisualization]);

    const clearVisualization = useCallback(() => {
        setNodes([]);
        setEdges([]);
    }, [setNodes, setEdges]);

    return {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        onConnect,
        clearVisualization,
        recreateVisualization: createVisualization,
    };
} 