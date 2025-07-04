import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';

export function MainLayout() {
    const [isCollapsed, setIsCollapsed] = useState(false);

    const toggleSidebar = () => {
        setIsCollapsed(!isCollapsed);
    };

    return (
        <div className="flex h-screen bg-background">
            <Sidebar isCollapsed={isCollapsed} onToggle={toggleSidebar} />
            <main className="flex-1 overflow-y-auto">
                <Outlet />
            </main>
        </div>
    );
} 