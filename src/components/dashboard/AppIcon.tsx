import { useAppIcon } from '@/hooks/useAppIcon';
import { Skeleton } from '@/components/ui/skeleton';
import { Package } from 'lucide-react';

interface AppIconProps {
    appId: string;
    className?: string;
}

export function AppIcon({ appId, className }: AppIconProps) {
    const iconSrc = useAppIcon(appId);

    if (!iconSrc) {
        return <Skeleton className={className} />;
    }

    if (iconSrc === 'error') {
        return <Package className={className} />;
    }

    return <img src={iconSrc} alt={`${appId} icon`} className={className} />;
}