import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { listen } from '@tauri-apps/api/event';
import { ActivityPayload } from '@/types/dashboard';
import { ScrollArea } from '@/components/ui/scroll-area';

import { format } from 'date-fns';

export function LiveTerminal() {
    const [events, setEvents] = useState<ActivityPayload[]>([]);


    useEffect(() => {
        const unlistenPromise = listen<ActivityPayload>('new-activity', (event) => {
            setEvents((prevEvents) => [event.payload, ...prevEvents].slice(0, 100));
        });

        return () => {
            unlistenPromise.then(unlisten => unlisten());
        };
    }, []);

    return (
        <div className="p-8 h-full flex flex-col">
            <div className="flex items-center justify-between space-y-2 mb-4">
                <h2 className="text-3xl font-bold tracking-tight">Live View</h2>
            </div>
            <div className="flex-grow bg-black/80 rounded-lg shadow-inner overflow-hidden">
                <ScrollArea className="h-full">
                    <div className="p-4 font-mono text-sm text-white">
                        {events.map((event, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3 }}
                                className="flex items-start"
                            >
                                <span className="text-green-400 mr-4">
                                    {format(new Date(event.ts * 1000), 'HH:mm:ss.SSS')}
                                </span>
                                <span className="text-cyan-400 mr-4 w-1/4 truncate">{event.app}</span>
                                <span className="text-gray-300 flex-1 truncate">{event.window_title}</span>
                            </motion.div>
                        ))}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
} 