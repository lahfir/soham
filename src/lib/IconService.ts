import { invoke } from '@tauri-apps/api/core';

type Listener = (src: string) => void;

class IconService {
    private cache = new Map<string, string>();
    private listeners = new Map<string, Set<Listener>>();
    private queue: string[] = [];
    private pending = new Set<string>();
    private isProcessing = false;

    public getIcon(appId: string): string | undefined {
        return this.cache.get(appId);
    }

    public subscribe(appId: string, listener: Listener): () => void {
        const existingListeners = this.listeners.get(appId) ?? new Set();
        existingListeners.add(listener);
        this.listeners.set(appId, existingListeners);

        if (!this.cache.has(appId)) {
            this.requestIcon(appId);
        }

        return () => {
            const listeners = this.listeners.get(appId);
            if (listeners) {
                listeners.delete(listener);
                if (listeners.size === 0) {
                    this.listeners.delete(appId);
                }
            }
        };
    }

    private requestIcon(appId: string) {
        if (this.cache.has(appId) || this.pending.has(appId)) {
            return;
        }
        this.pending.add(appId);
        this.queue.push(appId);
        this.processQueue();
    }

    private async processQueue() {
        if (this.isProcessing || this.queue.length === 0) {
            return;
        }
        this.isProcessing = true;

        const appId = this.queue.shift()!;

        try {
            const base64Icon = await invoke<string>('get_app_icon', { appId });
            const src = `data:image/png;base64,${base64Icon}`;
            this.cache.set(appId, src);
            this.notifyListeners(appId, src);
        } catch (err) {
            console.error(`Failed to fetch icon for ${appId}:`, err);
            this.cache.set(appId, 'error');
            this.notifyListeners(appId, 'error');
        } finally {
            this.pending.delete(appId);
            this.isProcessing = false;
            this.processQueue();
        }
    }

    private notifyListeners(appId: string, src: string) {
        const listeners = this.listeners.get(appId);
        if (listeners) {
            listeners.forEach(listener => listener(src));
        }
    }
}

export const iconService = new IconService(); 