import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Camera, Search, Download, Filter, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { Screenshot } from '@/types/dashboard';
import { ScreenshotCard } from './ScreenshotCard';

interface ScreenshotsProps {
    data: Screenshot[];
}

export function Screenshots({ data }: ScreenshotsProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

    if (!data) return null;

    const filteredScreenshots = data.filter(screenshot =>
        screenshot.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
        format(new Date(screenshot.ts * 1000), 'yyyy-MM-dd').includes(searchTerm)
    );

    const groupedScreenshots = filteredScreenshots.reduce((groups: Record<string, Screenshot[]>, screenshot) => {
        const date = format(new Date(screenshot.ts * 1000), 'yyyy-MM-dd');
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(screenshot);
        return groups;
    }, {});

    return (
        <div className="space-y-6 p-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Camera className="h-8 w-8 text-primary" />
                    <div>
                        <h2 className="text-2xl font-bold">Screenshot Gallery</h2>
                        <p className="text-muted-foreground">
                            {data.length} screenshots captured
                        </p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by path or date..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 w-64"
                        />
                    </div>
                    <Button variant="outline" size="icon">
                        <Filter className="h-4 w-4" />
                    </Button>
                </div>
            </div>

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
                            <Badge variant="secondary">{screenshots.length} screenshots</Badge>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {screenshots.map((screenshot, index) => (
                                <ScreenshotCard
                                    key={screenshot.path}
                                    screenshot={screenshot}
                                    index={index}
                                    onSelect={setSelectedImageUrl}
                                />
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

            <AnimatePresence>
                {selectedImageUrl && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => setSelectedImageUrl(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            className="relative max-w-5xl w-full"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <img src={selectedImageUrl} className="w-full h-full object-contain rounded-lg shadow-2xl" />
                            <div className="absolute top-4 right-4">
                                <Button size="sm" variant="outline" onClick={() => { /* Implement download */ }}>
                                    <Download className="h-4 w-4 mr-2" />
                                    Download
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
} 