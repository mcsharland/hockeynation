export interface SpecialSkillInfo {
	name: string;
	description: string;
}

export const SPECIAL_SKILL_INFO: Record<string, SpecialSkillInfo> = {
	agitator: {
		name: "Agitator",
		description:
			"-1 to discipline of highest rated opponent skater (while on ice)",
	},
	"assist-king": {
		name: "Assist King",
		description: "+1 to passing after scoring an assist (limit: +3)",
	},
	"brick-wall": {
		name: "Brick Wall",
		description:
			"+1 to all skills after stopping 20 shots or more in a row. Allowing a goal resets this bonus.",
	},
	"buzzer-beater": {
		name: "Buzzer Beater",
		description: "+3 to shooting in final minute of period",
	},
	"crowd-pleaser": {
		name: "Crowd Pleaser",
		description: "+1 to a random skill when playing at home",
	},
	"egg-breaker": {
		name: "Egg Breaker",
		description: "+1 to all skills as long as game is tied at 0-0",
	},
	equalizer: {
		name: "Equalizer",
		description:
			"Cancels special skill of an opponent player (at start of game)",
	},
	"goalie-tandem": {
		name: "Goalie Tandem",
		description:
			"If both starter and backup have Goalie Tandem, gain +2 to a skill the other goalie excels in (at start of game)",
	},
	"goalie-telepathy": {
		name: "Goalie Telepathy",
		description:
			"Copies special skill of an opponent goalie (at start of game)",
	},
	"human-shield": {
		name: "Human Shield",
		description: "Increases number of blocked shots",
	},
	inspire: {
		name: "Inspire",
		description:
			"Your skaters with No Special Skills gain +1 to a random skill when this player is on the ice. Players can only have one Inspire bonus active at a time.",
	},
	"late-bloomer": {
		name: "Late Bloomer",
		description: "Special skill is unlocked at age 25",
	},
	"mr-game-five": {
		name: "Mr Game Five",
		description: "+1 to all skills in game five of league playoffs",
	},
	"on-fire": {
		name: "On Fire",
		description: "+1 to shooting after scoring a goal (limit: +3)",
	},
	"overtime-hero": {
		name: "Overtime Hero",
		description:
			"+1 to two random skills in overtime periods (shootout excluded)",
	},
	patriot: {
		name: "Patriot",
		description:
			"+1 to a random skill of a fellow countryman at the start of the game. Players can receive this bonus only once in a game.",
	},
	"penalty-killer": {
		name: "Penalty Killer",
		description:
			"+1 to skating, power, defending and checking while shorthanded",
	},
	"playoff-beard": {
		name: "Playoff Beard",
		description: "+1 to two random skills in league playoff games",
	},
	"powerplay-specialist": {
		name: "Powerplay Specialist",
		description: "+1 to shooting and passing while having man advantage",
	},
	rivalry: {
		name: "Rivalry",
		description: "+1 to three random skills when playing against rival",
	},
	"second-wind": {
		name: "Second Wind",
		description:
			"Regain full condition when behind or tied with 10 minutes to go in regulation",
	},
	"shootout-specialist": {
		name: "Shootout Specialist",
		description: "Increases chance of scoring on a shootout and penalty shot",
	},
	"shootout-stopper": {
		name: "Shootout Stopper",
		description: "Increases chance of stopping shootout and penalty shots",
	},
	tactician: {
		name: "Tactician",
		description:
			"Skaters of team with most Tacticians on ice gain +1 to a random skill",
	},
	"team-player": {
		name: "Team Player",
		description:
			"+1 to two random skills while another Team Player is on the ice",
	},
	telepathy: {
		name: "Telepathy",
		description:
			"Copies special skill of an opponent skater (at start of game)",
	},
	"wrecking-ball": {
		name: "Wrecking Ball",
		description:
			"Doubles the chance of making a big hit. Players who take a big hit lose 1-3% condition that cannot be recovered during intermissions.",
	},
};

export function getSpecialSkillInfo(id: string): SpecialSkillInfo {
	return (
		SPECIAL_SKILL_INFO[id] ?? {
			name: id
				.split("-")
				.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
				.join(" "),
			description: "",
		}
	);
}
