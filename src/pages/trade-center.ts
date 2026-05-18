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
import { isViewSettingEnabled } from "../view-settings";
import { Roster } from "./roster";

interface TradeCenterResources {
	tradePlayers: Roster;
}

const TRADE_CENTER_RESOURCE = "tradeCenter";
const TRADE_CENTER_FEATURE_ID = "trade-center-badges";
const CARD_SELECTOR = "div.card.card-secondary";
const PLAYER_LINK_SELECTOR = `a[href^="/player/"]`;

export const tradeCenterFeature: FeatureDefinition<TradeCenterResources> = {
	id: TRADE_CENTER_FEATURE_ID,
	enabled: () => isViewSettingEnabled("tradeCenter"),
	route: (url) => url.pathname.startsWith("/office/trade-center"),
	target: {
		selector: CARD_SELECTOR,
		resolveRoot: (match) => match.parentElement,
		isReady: (root) =>
			!!root.querySelector(`${CARD_SELECTOR} ${PLAYER_LINK_SELECTOR}`) &&
			!!root.querySelector(`${CARD_SELECTOR} .badge`),
	},
	getResources: (resources) => getTradeCenterResources(resources),
	mount: (context) => new TradeCenterBadgesFeature(context),
};

class TradeCenterBadgesFeature implements MountedFeature<TradeCenterResources> {
	private root: HTMLElement;
	private tradePlayers: Roster;

	constructor(context: FeatureContext<TradeCenterResources>) {
		this.root = context.root;
		this.tradePlayers = context.resources.tradePlayers;
		this.render();
	}

	public update(context: FeatureContext<TradeCenterResources>): void {
		this.root = context.root;
		this.tradePlayers = context.resources.tradePlayers;
		this.render();
	}

	public dispose(): void {
		clearRosterCardBadges(this.root, TRADE_CENTER_FEATURE_ID);
	}

	private render(): void {
		renderRosterCardBadges({
			featureId: TRADE_CENTER_FEATURE_ID,
			root: this.root,
			roster: this.tradePlayers,
			cardSelector: CARD_SELECTOR,
			playerLinkSelector: PLAYER_LINK_SELECTOR,
		});
	}
}

function getTradeCenterResources(
	resources: ResourceStore,
): TradeCenterResources | null {
	const tradePlayers = resources.get<Roster>(TRADE_CENTER_RESOURCE);
	return tradePlayers ? { tradePlayers } : null;
}

export function handleTradeCenterData(data: any[]) {
	extensionRuntime.setResource(
		TRADE_CENTER_RESOURCE,
		new Roster({ players: data }),
	);
}
