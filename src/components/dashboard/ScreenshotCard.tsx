import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';

import { Button } from '@/components/ui/button';
import { Eye, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { convertFileSrc } from '@tauri-apps/api/core';
import { Screenshot } from '@/types/dashboard';

interface ScreenshotCardProps {
    screenshot: Screenshot;
    index: number;
    onSelect: (url: string) => void;
}

export function ScreenshotCard({ screenshot, index, onSelect }: ScreenshotCardProps) {
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    useEffect(() => {
        let isCancelled = false;

        const getUrl = async () => {
            try {
                const url = await convertFileSrc(screenshot.path);
                if (!isCancelled) {
                    setImageUrl(url);
                }
            } catch (e) {
                console.error("Failed to convert file source for screenshot", e);
            }
        };

        getUrl();

        return () => {
            isCancelled = true;
        };
    }, [screenshot.path]);

    return (
        <motion.div
            key={screenshot.path}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="group cursor-pointer"
            onClick={() => imageUrl && onSelect(imageUrl)}
        >
            <Card className="overflow-hidden border-muted/50 hover:border-primary/20 transition-colors">
                <div className="relative aspect-video bg-muted/30 flex items-center justify-center">
                    {imageUrl ? (
                        <img src={imageUrl} alt={screenshot.path} className="w-full h-full object-cover" />
                    ) : (
                        <ImageIcon className="h-8 w-8 text-muted-foreground animate-pulse" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity transform-gpu translate-y-2 group-hover:translate-y-0">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 hover:text-white">
                            <Eye className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground truncate">
                        {screenshot.path.split(/[/\\]/).pop()}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">
                            {format(new Date(screenshot.ts * 1000), 'HH:mm:ss')}
                        </span>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
} 