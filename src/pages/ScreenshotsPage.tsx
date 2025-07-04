import React, { useState, useRef, useLayoutEffect } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar as CalendarIcon, RefreshCw } from 'lucide-react';
import { useScreenshots, Screenshot } from '@/hooks/useScreenshots';
import { useVirtualizer } from '@tanstack/react-virtual';

const ScreenshotCard: React.FC<{ screenshot: Screenshot }> = ({ screenshot }) => {
    const ts = new Date(screenshot.ts * 1000);
    const base64Image = `data:image/png;base64,${screenshot.path}`;
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Card className="overflow-hidden cursor-pointer group h-full flex flex-col">
                    <div className="flex-grow overflow-hidden">
                        <img src={base64Image} alt={`Screenshot at ${ts}`} loading="lazy" className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105" />
                    </div>
                    <div className="p-2 text-xs text-center border-t text-muted-foreground bg-card shrink-0">
                        {format(ts, 'HH:mm:ss')}
                    </div>
                </Card>
            </DialogTrigger>
            <DialogContent className="max-w-6xl">
                <DialogHeader>
                    <DialogTitle>{format(ts, 'PPPp')}</DialogTitle>
                </DialogHeader>
                <img src={base64Image} alt={`Screenshot at ${ts}`} className="w-full rounded-md" />
            </DialogContent>
        </Dialog>
    );
};

export const ScreenshotsPage: React.FC = () => {
    const [date, setDate] = useState(new Date());
    const { screenshots, isLoading, error, refresh } = useScreenshots(date);
    const parentRef = useRef<HTMLDivElement>(null);

    // Responsive column calculation
    const [width, setWidth] = useState(0);
    useLayoutEffect(() => {
        if (!parentRef.current) return;
        const resizeObserver = new ResizeObserver(() => {
            setWidth(parentRef.current?.offsetWidth || 0);
        });
        resizeObserver.observe(parentRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    const MIN_CARD_WIDTH = 280;
    const GAP = 16;
    const columnCount = width > 0 ? Math.max(1, Math.floor(width / (MIN_CARD_WIDTH + GAP))) : 4;
    const rowCount = Math.ceil(screenshots.length / columnCount);

    const rowVirtualizer = useVirtualizer({
        count: rowCount,
        getScrollElement: () => parentRef.current,
        estimateSize: () => MIN_CARD_WIDTH,
        overscan: 5,
    });

    return (
        <div className="flex flex-col h-screen">
            <header className="flex items-center justify-between p-3 border-b shrink-0">
                <h1 className="text-lg font-semibold">Screenshot Gallery</h1>
                <div className="flex items-center gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-[280px] justify-start text-left font-normal">
                                <CalendarIcon className="w-4 h-4 mr-2" />
                                {format(date, 'PPP')}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus />
                        </PopoverContent>
                    </Popover>
                    <Button variant="ghost" size="icon" onClick={refresh} disabled={isLoading}>
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </header>
            <main ref={parentRef} className="flex-1 p-4 overflow-auto">
                {isLoading && (
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="w-full h-64" />)}
                    </div>
                )}
                {error && <div className="text-red-500">{error}</div>}
                {!isLoading && !error && screenshots.length === 0 && (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground">No screenshots found for this day.</p>
                    </div>
                )}
                {!isLoading && !error && screenshots.length > 0 && (
                    <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                        {rowVirtualizer.getVirtualItems().map(virtualRow => {
                            const startIndex = virtualRow.index * columnCount;
                            const items = screenshots.slice(startIndex, startIndex + columnCount);
                            return (
                                <div
                                    key={virtualRow.index}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: `${virtualRow.size}px`,
                                        transform: `translateY(${virtualRow.start}px)`,
                                        display: 'grid',
                                        gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
                                        gap: `${GAP}px`,
                                    }}
                                >
                                    {items.map(screenshot => (
                                        <ScreenshotCard key={screenshot.ts} screenshot={screenshot} />
                                    ))}
                                </div>
                            )
                        })}
                    </div>
                )}
            </main>
        </div>
    );
};
