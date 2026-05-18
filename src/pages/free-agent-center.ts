import {
	clearRosterCardBadges,
	renderRosterCardBadges,
} from "../features/roster-card-badges";
import {
	extensionRuntime,
	type FeatureContext,
	type FeatureDefinition,
	type MountedFeature,
	type ResourceStore,
} from "../runtime";
import { Roster } from "./roster";

interface FreeAgentCenterResources {
	freeAgents: Roster;
}

const FREE_AGENT_CENTER_RESOURCE = "freeAgentCenter";
const FREE_AGENT_CENTER_FEATURE_ID = "free-agent-center-badges";
const CARD_SELECTOR = "div.card.card-secondary";
const PLAYER_LINK_SELECTOR = `a[href^="/player/"]`;

export const freeAgentCenterFeature: FeatureDefinition<FreeAgentCenterResources> =
	{
		id: FREE_AGENT_CENTER_FEATURE_ID,
		route: (url) => url.pathname.startsWith("/office/free-agent-center"),
		target: {
			selector: CARD_SELECTOR,
			resolveRoot: (match) => findFreeAgentCenterRoot(match),
			isReady: (root) =>
				isSearchTabActive(root) &&
				!!root.querySelector(`${CARD_SELECTOR} ${PLAYER_LINK_SELECTOR}`) &&
				!!root.querySelector(`${CARD_SELECTOR} .badge`),
		},
		getResources: (resources) => getFreeAgentCenterResources(resources),
		mount: (context) => new FreeAgentCenterBadgesFeature(context),
	};

class FreeAgentCenterBadgesFeature
	implements MountedFeature<FreeAgentCenterResources>
{
	private root: HTMLElement;
	private freeAgents: Roster;

	constructor(context: FeatureContext<FreeAgentCenterResources>) {
		this.root = context.root;
		this.freeAgents = context.resources.freeAgents;
		this.render();
	}

	public update(context: FeatureContext<FreeAgentCenterResources>): void {
		this.root = context.root;
		this.freeAgents = context.resources.freeAgents;
		this.render();
	}

	public dispose(): void {
		clearRosterCardBadges(this.root, FREE_AGENT_CENTER_FEATURE_ID);
	}

	private render(): void {
		renderRosterCardBadges({
			featureId: FREE_AGENT_CENTER_FEATURE_ID,
			root: this.root,
			roster: this.freeAgents,
			cardSelector: CARD_SELECTOR,
			playerLinkSelector: PLAYER_LINK_SELECTOR,
		});
	}
}

function getFreeAgentCenterResources(
	resources: ResourceStore,
): FreeAgentCenterResources | null {
	const freeAgents = resources.get<Roster>(FREE_AGENT_CENTER_RESOURCE);
	return freeAgents ? { freeAgents } : null;
}

function findFreeAgentCenterRoot(match: HTMLElement): HTMLElement | null {
	let current: HTMLElement | null = match;

	while (current && current !== document.body) {
		if (current.querySelector(".btn-toggle") && current.contains(match)) {
			return current;
		}
		current = current.parentElement;
	}

	return match.parentElement;
}

function isSearchTabActive(root: HTMLElement): boolean {
	const activeTab = root.querySelector<HTMLButtonElement>(".btn-toggle.active");
	return activeTab?.textContent?.trim() === "Search";
}

export function handleFreeAgentCenterData(data: any[]) {
	extensionRuntime.setResource(
		FREE_AGENT_CENTER_RESOURCE,
		new Roster({ players: data }),
	);
}
