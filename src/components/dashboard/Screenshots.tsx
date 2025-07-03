import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Camera, Search, Download, Eye, Calendar, Filter } from 'lucide-react';
import { RealtimeData } from '@/hooks/useRealtime';
import { format } from 'date-fns';

interface ScreenshotsProps {
    data: RealtimeData | null;
}

export function Screenshots({ data }: ScreenshotsProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    if (!data) return null;

    const filteredScreenshots = data.recent_screenshots.filter(screenshot =>
        screenshot.file_path.toLowerCase().includes(searchTerm.toLowerCase()) ||
        format(new Date(screenshot.ts * 1000), 'yyyy-MM-dd').includes(searchTerm)
    );

    const groupedScreenshots = filteredScreenshots.reduce((groups, screenshot) => {
        const date = format(new Date(screenshot.ts * 1000), 'yyyy-MM-dd');
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(screenshot);
        return groups;
    }, {} as Record<string, typeof filteredScreenshots>);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Camera className="h-8 w-8 text-blue-500" />
                    <div>
                        <h2 className="text-2xl font-bold">Screenshot Gallery</h2>
                        <p className="text-muted-foreground">
                            {data.recent_screenshots.length} screenshots captured
                        </p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search screenshots..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 w-64"
                        />
                    </div>
                    <Button variant="outline" size="sm">
                        <Filter className="h-4 w-4 mr-2" />
                        Filter
                    </Button>
                </div>
            </div>

            {/* Screenshots Grid */}
            <AnimatePresence>
                {Object.entries(groupedScreenshots).map(([date, screenshots]) => (
                    <motion.div
                        key={date}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-4"
                    >
                        <div className="flex items-center space-x-3">
                            <Calendar className="h-5 w-5 text-muted-foreground" />
                            <h3 className="text-lg font-semibold">{date}</h3>
                            <Badge variant="outline">{screenshots.length} screenshots</Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {screenshots.map((screenshot, index) => (
                                <motion.div
                                    key={screenshot.id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.1 }}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="group cursor-pointer"
                                    onClick={() => setSelectedImage(screenshot.file_path)}
                                >
                                    <Card className="overflow-hidden border-muted/50 hover:border-primary/20 transition-colors">
                                        <div className="relative aspect-video bg-muted/30 flex items-center justify-center">
                                            <Camera className="h-8 w-8 text-muted-foreground" />
                                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        <CardContent className="p-3">
                                            <p className="text-xs text-muted-foreground truncate">
                                                {screenshot.file_path.split('/').pop()}
                                            </p>
                                            <div className="flex items-center justify-between mt-2">
                                                <span className="text-xs text-muted-foreground">
                                                    {format(new Date(screenshot.ts * 1000), 'HH:mm:ss')}
                                                </span>
                                                <Badge variant="outline" className="text-xs">
                                                    Screen {screenshot.screen_id}
                                                </Badge>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>

            {filteredScreenshots.length === 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12"
                >
                    <Camera className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No screenshots found</h3>
                    <p className="text-muted-foreground">
                        {searchTerm ? 'Try adjusting your search terms' : 'Screenshots will appear here as they are captured'}
                    </p>
                </motion.div>
            )}

            {/* Image Modal */}
            <AnimatePresence>
                {selectedImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
                        onClick={() => setSelectedImage(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            className="relative max-w-4xl max-h-full"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="bg-background rounded-lg p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold">Screenshot Preview</h3>
                                    <div className="flex items-center space-x-2">
                                        <Button size="sm" variant="outline">
                                            <Download className="h-4 w-4 mr-2" />
                                            Download
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => setSelectedImage(null)}>
                                            ×
                                        </Button>
                                    </div>
                                </div>
                                <div className="aspect-video bg-muted/30 rounded-lg flex items-center justify-center">
                                    <Camera className="h-16 w-16 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground mt-4">
                                        {selectedImage}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
} 