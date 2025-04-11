type ElementCallback = (element: HTMLElement) => void;

export class ObserverManager {
  private static instance: ObserverManager;
  private observer: MutationObserver | null = null;
  private currentSelector: string | null = null;
  private currentCallback: ElementCallback | null = null;

  private constructor() {} //singleton

  public static getInstance(): ObserverManager {
    if (!ObserverManager.instance) {
      ObserverManager.instance = new ObserverManager();
    }
    return ObserverManager.instance;
  }

  public setCallback(selector: string, callback: ElementCallback): void {
    this.currentSelector = selector;
    this.currentCallback = callback;
    this.ensureObserverActive();
  }

  public resetCallback(): void {
    this.currentSelector = null;
    this.currentCallback = null;
  }

  private ensureObserverActive(): void {
    if (!this.observer) {
      this.observer = new MutationObserver((mutations) => {
        const currentSelector = this.currentSelector;
        const currentCallback = this.currentCallback;

        if (!currentSelector || !currentCallback) return;

        mutations.forEach((mutation) => {
          if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as HTMLElement;
                const target = element.querySelector(currentSelector);

                if (target) {
                  currentCallback(element);
                  this.disconnect();
                }
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
