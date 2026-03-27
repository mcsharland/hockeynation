import { SelectorHandler } from "./navigation-handler";
type ElementCallback = (element: HTMLElement) => void;

export class ObserverManager {
    private static instance: ObserverManager;
    private observer: MutationObserver | null = null;
    private activeHandlers: SelectorHandler[] | null = null;
    private shouldAutoDisconnect: boolean = true;

    private constructor() {} //singleton

    public static getInstance(): ObserverManager {
        if (!ObserverManager.instance) {
            ObserverManager.instance = new ObserverManager();
        }
        return ObserverManager.instance;
    }

    public setCallbacks(handlers: SelectorHandler[]): void {
        this.activeHandlers = [...handlers];
        this.shouldAutoDisconnect = handlers.length === 1;
        this.ensureObserverActive();
    }

    public resetCallback(): void {
        this.activeHandlers = null;
        this.disconnect();
    }

    private ensureObserverActive(): void {
        if (!this.observer) {
            this.observer = new MutationObserver((mutations) => {
                const handlers = this.activeHandlers;
                if (!handlers) return;

                mutations.forEach((mutation) => {
                    if (
                        mutation.type === "childList" &&
                        mutation.addedNodes.length > 0
                    ) {
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeType !== Node.ELEMENT_NODE) return;
                            const element = node as HTMLElement;
                            for (const [
                                i,
                                { selector, handler },
                            ] of handlers.entries()) {
                                if (element.querySelector(selector)) {
                                    handler(element);
                                    handlers.splice(i, 1); //remove
                                    break; // re-iterate on next mutation since we modified the array
                                }
                            }
                            if (
                                handlers.length === 0 &&
                                this.shouldAutoDisconnect
                            ) {
                                this.disconnect();
                            }
                        });
                    }
                });
            });

            this.observer.observe(document.body, {
                childList: true,
                subtree: true,
            });
        }
    }
    public disconnect(): void {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }
}
