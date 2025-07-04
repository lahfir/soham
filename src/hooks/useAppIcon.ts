import { useState, useEffect } from 'react';
import { iconService } from '@/lib/IconService';

export function useAppIcon(appId: string) {
    const [iconSrc, setIconSrc] = useState<string | undefined>(iconService.getIcon(appId));

    useEffect(() => {
        if (!appId) return;

        const cachedSrc = iconService.getIcon(appId);
        if (cachedSrc) {
            setIconSrc(cachedSrc);
            return;
        }

        const unsubscribe = iconService.subscribe(appId, (src) => {
            setIconSrc(src);
        });

        return () => {
            unsubscribe();
        };
    }, [appId]);

    return iconSrc;
} 