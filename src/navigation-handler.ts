import { playerTooltipFeature } from "./features/player-tooltip";
import { coachMarketFeature } from "./pages/coach-market";
import { coachingStaffFeature } from "./pages/coaching-staff";
import { draftClassFeature } from "./pages/draft-class";
import { draftRankingFeature } from "./pages/draft-ranking";
import { freeAgentCenterFeature } from "./pages/free-agent-center";
import { rosterFeature } from "./pages/roster";
import { tradeCenterFeature } from "./pages/trade-center";
import { userSettingsFeature } from "./pages/user-settings";
import { extensionRuntime } from "./runtime";
import { onViewSettingsChanged } from "./view-settings";

export function initNavigationHandler() {
	extensionRuntime.registerFeatures([
		coachMarketFeature,
		coachingStaffFeature,
		draftClassFeature,
		draftRankingFeature,
		freeAgentCenterFeature,
		playerTooltipFeature,
		rosterFeature,
		tradeCenterFeature,
		userSettingsFeature,
	]);
	extensionRuntime.start();
	onViewSettingsChanged(() => {
		extensionRuntime.notifyRouteChanged();
	});
	handleNavigation();

	// @ts-expect-error
	window.navigation.addEventListener("currententrychange", handleNavigation);
}

function handleNavigation() {
	extensionRuntime.notifyRouteChanged();
}
