export type StatStrength = "strongest" | "weakest" | null;
export type ScoutLevel = 0 | 1 | 2;

export interface ApiSkill {
	id: string;
	lvl: number | string;
	max?: boolean;
	dec?: boolean;
	hidden?: boolean;
}

export interface ApiPlayerTalents {
	weakest?: string;
	strongest?: string[];
}

export interface ApiPlayerSpecialSkill {
	id: string;
}

export interface ApiPlayer {
	id: string;
	firstname: string;
	lastname: string;
	age: number;
	xp: number;
	rating?: number;
	amateur?: boolean;
	skater?: boolean;
	goalie?: boolean;
	nationId?: string;
	skills: ApiSkill[];
	specialSkillCount?: number;
	specialSkills?: ApiPlayerSpecialSkill[];
	specialSkillsVisible?: boolean;
	positions?: string[];
	talents?: ApiPlayerTalents;
}

export interface NormalizedSkill {
	id: string;
	rating: number;
	max: boolean;
	dec: boolean;
	hidden: boolean;
	strength: StatStrength;
}

export type SkillMap = Record<string, NormalizedSkill>;

export function normalizeSkills(
	skills: ApiSkill[],
	talents?: ApiPlayerTalents,
): NormalizedSkill[] {
	return skills.map((skill) => ({
		id: skill.id,
		rating: Number(skill.lvl ?? 0),
		max: skill.max === true,
		dec: skill.dec === true,
		hidden: skill.hidden === true,
		strength: getSkillStrength(skill.id, talents),
	}));
}

export function toSkillMap(skills: readonly NormalizedSkill[]): SkillMap {
	return skills.reduce<SkillMap>((stats, skill) => {
		stats[skill.id] = { ...skill };
		return stats;
	}, {});
}

export function getScoutLevel(skills: readonly NormalizedSkill[]): ScoutLevel {
	if (skills.length === 0) return 0;

	const allHidden = skills.every((skill) => skill.hidden);
	const someHidden = skills.some((skill) => skill.hidden);
	return allHidden ? 1 : someHidden ? 2 : 0;
}

export function getPlayerFullName(player: Pick<ApiPlayer, "firstname" | "lastname">) {
	return `${player.firstname} ${player.lastname}`;
}

function getSkillStrength(
	skillId: string,
	talents?: ApiPlayerTalents,
): StatStrength {
	if (!talents?.weakest) return null;
	if (talents.weakest === skillId) return "weakest";
	return talents.strongest?.includes(skillId) ? "strongest" : null;
}
