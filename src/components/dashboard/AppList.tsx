import { AppStat } from '@/types/dashboard';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AppIcon } from "./AppIcon";

interface AppListProps {
    apps: AppStat[];
    onAppSelect: (appId: string) => void;
    selectedAppId: string | null;
}

function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

export function AppList({ apps, onAppSelect, selectedAppId }: AppListProps) {
    return (
        <ScrollArea className="h-full">
            <div className="p-3 space-y-1">
                {apps.map(app => (
                    <Button
                        key={app.app_id}
                        variant="ghost"
                        className={cn(
                            "w-full justify-start text-left h-auto p-3 hover:bg-muted/50 transition-all duration-200",
                            selectedAppId === app.app_id && "bg-primary/10 text-primary hover:bg-primary/15 shadow-sm border border-primary/20"
                        )}
                        onClick={() => onAppSelect(app.app_id)}
                    >
                        <div className="flex items-center w-full gap-3">
                            <AppIcon appId={app.app_id} className="h-8 w-8 rounded-lg shadow-sm flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{app.app_id}</p>
                                <p className="text-xs text-muted-foreground">
                                    {formatDuration(app.total_duration)}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-muted-foreground/70">Sessions</p>
                                <p className="text-sm font-medium">{app.session_count}</p>
                            </div>
                        </div>
                    </Button>
                ))}
            </div>
        </ScrollArea>
    );
} 