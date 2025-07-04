import React, { useState, useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { X } from 'lucide-react';

interface ActivityPayload {
    app: string;
    window_title: string;
}

interface LiveTerminalProps {
    onClose: () => void;
}

export function LiveTerminal({ onClose }: LiveTerminalProps) {
    const [activities, setActivities] = useState<ActivityPayload[]>([]);
    const terminalBodyRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const unlistenPromise = listen<ActivityPayload>('new-activity', (event) => {
            setActivities(prev => [event.payload, ...prev.slice(0, 99)]);
        });

        return () => {
            unlistenPromise.then(unlisten => unlisten());
        };
    }, []);

    useEffect(() => {
        // Scroll to bottom when new activity comes in
        if (terminalBodyRef.current) {
            terminalBodyRef.current.scrollTop = 0;
        }
    }, [activities]);

    const formatTime = () => new Date().toLocaleTimeString();

    return (
        <div className="fixed bottom-4 right-4 w-[600px] h-[400px] z-50">
            <div className="flex flex-col h-full bg-black/80 backdrop-blur-md rounded-lg shadow-2xl border border-primary/20 font-mono text-sm">
                {/* Terminal Header */}
                <div className="flex items-center justify-between bg-white/5 px-3 py-2 rounded-t-lg">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full" />
                        <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                        <div className="w-3 h-3 bg-green-500 rounded-full" />
                    </div>
                    <span className="text-green-400">/dev/live_feed</span>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X size={16} />
                    </button>
                </div>
                {/* Terminal Body */}
                <div ref={terminalBodyRef} className="flex-1 p-3 overflow-y-auto">
                    <div className="space-y-1">
                        {activities.map((act, index) => (
                            <div key={index} className="flex">
                                <span className="text-primary/60 mr-2">{formatTime()}</span>
                                <span className="text-green-400 mr-2">{act.app}</span>
                                <span className="text-gray-400 truncate">{act.window_title}</span>
                            </div>
                        ))}
                    </div>
                </div>
                {/* Terminal Prompt */}
                <div className="p-3 border-t border-white/5">
                    <div className="flex items-center">
                        <span className="text-green-400 mr-2">{'>'}</span>
                        <span className="bg-green-400 w-2 h-4 animate-pulse" />
                    </div>
                </div>
            </div>
        </div>
    );
} 