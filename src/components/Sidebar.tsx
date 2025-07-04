import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Home, BarChart2, Clock, Settings, ChevronsLeft, PanelLeft, Camera } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
    isCollapsed: boolean;
    onToggle: () => void;
}

export function Sidebar({ className, isCollapsed, onToggle }: SidebarProps) {
    return (
        <aside className={cn("relative h-screen border-r border-border/50 flex flex-col bg-background/95 backdrop-blur-sm", isCollapsed ? "w-16" : "w-60", "transition-all duration-200 ease-in-out", className)}>
            <div className={cn("flex items-center", isCollapsed ? "justify-center" : "justify-between", "h-16 px-3 border-b border-border/30")}>
                {!isCollapsed && <span className="text-lg font-semibold tracking-tight">Soham</span>}
                <Button variant="ghost" size="icon" onClick={onToggle} className="h-8 w-8 hover:bg-muted/50">
                    {isCollapsed ? <PanelLeft className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
                    <span className="sr-only">Toggle sidebar</span>
                </Button>
            </div>

            <nav className="flex-1 space-y-1 px-2 py-4">
                <NavItem to="/" icon={Home} label="Overview" isCollapsed={isCollapsed} />
                <NavItem to="/analytics" icon={BarChart2} label="App Analytics" isCollapsed={isCollapsed} />
                <NavItem to="/timeline" icon={Clock} label="Timeline" isCollapsed={isCollapsed} />
                <NavItem to="/screenshots" icon={Camera} label="Screenshots" isCollapsed={isCollapsed} />
            </nav>

            <div className="mt-auto p-2 space-y-1 border-t border-border/30">
                <NavItem to="/settings" icon={Settings} label="Settings" isCollapsed={isCollapsed} />
                <div className={cn("flex items-center px-3 py-2 rounded-lg", isCollapsed ? "justify-center" : "justify-between")}>
                    {!isCollapsed && <span className="text-xs font-medium text-muted-foreground">Theme</span>}
                    <ThemeToggle />
                </div>
            </div>
        </aside>
    );
}

function NavItem({ to, icon: Icon, label, isCollapsed }: { to: string; icon: React.ElementType; label: string; isCollapsed: boolean }) {
    return (
        <NavLink
            to={to}
            end
            className={({ isActive }) =>
                cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:text-foreground hover:bg-muted/50",
                    isCollapsed && "justify-center",
                    isActive && "bg-primary/10 text-primary font-semibold shadow-sm"
                )
            }
        >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {isCollapsed ? <span className="sr-only">{label}</span> : <span>{label}</span>}
        </NavLink>
    );
} 