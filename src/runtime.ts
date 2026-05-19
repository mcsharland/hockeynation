export type ResourceKey = string;

// runtime resources are api-derived data captured by the fetch interceptor
// features can read from the store, but only the runtime writes to it
export interface ResourceStore {
	has(key: ResourceKey): boolean;
	get<T>(key: ResourceKey): T | null;
}

// where a feature should mount in the HN DOM
export interface FeatureTarget {
	// broad selector to find candidate element
	selector: string;
	// optional step from a matched child element to the DOM region the feature owns
	resolveRoot?: (match: HTMLElement) => HTMLElement | null;
	// optional readiness check for pages that render in stages
	// false delays mounting until DOM has expected structure
	isReady?: (root: HTMLElement) => boolean;
	// optional stable key for roots that should survive DOM churn
	// if omitted runtime assigns a WeakMap id to the root element
	getKey?: (root: HTMLElement) => string;
}

// passed to mounted features whenever they mount or update
export interface FeatureContext<TResources> {
	root: HTMLElement; // DOM region the feature owns
	match: HTMLElement; // original selector hit
	resources: TResources;
}

// live feature instance bound to one DOM root
// dispose must undo all DOM injections, listerners, and observers owned by the feature
export interface MountedFeature<TResources = unknown> {
	update?: (context: FeatureContext<TResources>) => void;
	dispose: () => void;
}

export interface FeatureDefinition<TResources = unknown> {
	id: string;
	enabled?: () => boolean;
	route: (url: URL) => boolean;
	target: FeatureTarget;
	getResources: (resources: ResourceStore) => TResources | null;
	mount: (context: FeatureContext<TResources>) => MountedFeature<TResources>;
}

interface MountedFeatureRecord {
	featureId: string;
	root: HTMLElement;
	instance: MountedFeature<any>;
}

class RuntimeResourceStore implements ResourceStore {
	// unknown because each feature owns shape it asks for
	private values = new Map<ResourceKey, unknown>();

	public set(key: ResourceKey, value: unknown): void {
		this.values.set(key, value);
	}

	public has(key: ResourceKey): boolean {
		return this.values.has(key);
	}

	public get<T>(key: ResourceKey): T | null {
		return this.values.has(key) ? (this.values.get(key) as T) : null;
	}
}

class ExtensionRuntime {
	// latest intercepted api data
	private readonly resources = new RuntimeResourceStore();
	private readonly mounted = new Map<string, MountedFeatureRecord>();
	private readonly rootIds = new WeakMap<HTMLElement, string>();
	private features: FeatureDefinition<any>[] = [];
	private observer: MutationObserver | null = null;
	private reconcileScheduled = false;
	private started = false;
	private nextRootId = 1;

	// replace feature registry and reconsile immediately
	public registerFeatures(features: FeatureDefinition<any>[]): void {
		this.features = [...features];
		this.scheduleReconcile();
	}

	public start(): void {
		if (this.started) return;
		this.started = true;
		this.ensureObserver();
		this.scheduleReconcile();
	}

	public setResource(key: ResourceKey, value: unknown): void {
		this.resources.set(key, value);
		this.scheduleReconcile();
	}

	public notifyRouteChanged(): void {
		this.scheduleReconcile();
	}

	// watch SPA DOM for changes, schedule reconciliation when page changes
	private ensureObserver(): void {
		if (this.observer || !document.body) return;

		this.observer = new MutationObserver((mutations) => {
			if (mutations.some((mutation) => !this.isOwnedMutation(mutation))) {
				this.scheduleReconcile();
			}
		});

		this.observer.observe(document.body, {
			attributes: true,
			attributeFilter: ["class", "style", "hidden", "aria-hidden"],
			childList: true,
			subtree: true,
		});
	}

	private isOwnedMutation(mutation: MutationRecord): boolean {
		if (mutation.type === "attributes") {
			return this.isOwnedNode(mutation.target);
		}

		if (mutation.type !== "childList") return false;

		const changedNodes = [
			...Array.from(mutation.addedNodes),
			...Array.from(mutation.removedNodes),
		];

		return (
			changedNodes.length > 0 &&
			changedNodes.every((node) => this.isOwnedNode(node))
		);
	}

	private isOwnedNode(node: Node): boolean {
		if (node instanceof HTMLElement) {
			return (
				node.hasAttribute("data-hn-feature") ||
				!!node.closest("[data-hn-feature]")
			);
		}

		return !!node.parentElement?.closest("[data-hn-feature]");
	}

	// coalesces multiple rapid signals into one
	private scheduleReconcile(): void {
		if (this.reconcileScheduled) return;
		this.reconcileScheduled = true;

		queueMicrotask(() => {
			this.reconcileScheduled = false;
			this.reconcile();
		});
	}

	private reconcile(): void {
		if (!document.body) return;
		this.ensureObserver();

		const url = new URL(window.location.href);
		const activeKeys = new Set<string>();

		for (const feature of this.features) {
			if (!feature.route(url) || feature.enabled?.() === false) {
				// dispose all live instances for given feature
				this.disposeFeature(feature.id);
				continue;
			}

			const resources = feature.getResources(this.resources);
			// data has not arrived yet
			// interceptor stores the data & feature will mount later when
			// another reconciliation is scheduled
			if (!resources) {
				continue;
			}

			const targets = this.findTargets(feature);
			for (const { key, root, match } of targets) {
				activeKeys.add(key);
				const context = { root, match, resources };
				const mounted = this.mounted.get(key);

				if (!mounted || mounted.root !== root) {
					// dispose stale references before mounting against current node
					mounted?.instance.dispose();
					this.mounted.set(key, {
						featureId: feature.id,
						root,
						instance: feature.mount(context),
					});
					continue;
				}

				mounted.instance.update?.(context);
			}
		}

		// safety
		for (const [key, mounted] of this.mounted) {
			if (!mounted.root.isConnected || !activeKeys.has(key)) {
				mounted.instance.dispose();
				this.mounted.delete(key);
			}
		}
	}

	private findTargets(feature: FeatureDefinition<any>) {
		const matches = Array.from(
			document.querySelectorAll<HTMLElement>(feature.target.selector),
		);
		const targets: { key: string; root: HTMLElement; match: HTMLElement }[] =
			[];
		const seenRoots = new Set<HTMLElement>();

		for (const match of matches) {
			const root = feature.target.resolveRoot?.(match) ?? match;
			// seenRoots prevents remounting same feature multiple times
			if (!root || !root.isConnected || seenRoots.has(root)) continue;
			if (feature.target.isReady && !feature.target.isReady(root)) continue;

			seenRoots.add(root);
			const targetKey = feature.target.getKey?.(root) ?? this.getRootId(root);
			targets.push({
				key: `${feature.id}:${targetKey}`,
				root,
				match,
			});
		}

		return targets;
	}

	// target identity tied to the actual DOM element
	// if replaced it received a new id and the old one is replaced
	private getRootId(root: HTMLElement): string {
		const existing = this.rootIds.get(root);
		if (existing) return existing;

		const id = `root-${this.nextRootId++}`;
		this.rootIds.set(root, id);
		return id;
	}

	private disposeFeature(featureId: string): void {
		for (const [key, mounted] of this.mounted) {
			if (mounted.featureId === featureId) {
				mounted.instance.dispose();
				this.mounted.delete(key);
			}
		}
	}
}

export const extensionRuntime = new ExtensionRuntime();
