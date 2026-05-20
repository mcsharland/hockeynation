import {
	type ApiPlayer,
	type ApiPlayerTalents,
	getPlayerFullName,
	getPlayerInfoVisibility,
	type NormalizedSkill,
	normalizeSkills,
	type PlayerInfoVisibility,
} from "../player-data";

export interface PlayerTooltipData {
	id: string;
	fullName: string;
	firstname: string;
	lastname: string;
	age: number;
	xp: number;
	rating: number;
	nationId?: string;
	positions: string[];
	skills: NormalizedSkill[];
	infoVisibility: PlayerInfoVisibility;
	talents?: ApiPlayerTalents;
	specialSkillCount: number;
	specialSkillIds: string[];
	specialSkillsVisible: boolean;
	isGoalie: boolean;
}

class PlayerTooltipCache {
	private readonly players = new Map<string, PlayerTooltipData>();

	public ingestPlayers(players: ApiPlayer[]): void {
		for (const player of players) {
			this.players.set(player.id, this.normalizePlayer(player));
		}
	}

	public getPlayer(playerId: string): PlayerTooltipData | null {
		return this.players.get(playerId) ?? null;
	}

	private normalizePlayer(player: ApiPlayer): PlayerTooltipData {
		const skills = normalizeSkills(player.skills, player.talents);
		const specialSkillsVisible = player.specialSkillsVisible !== false;

		return {
			id: player.id,
			fullName: getPlayerFullName(player),
			firstname: player.firstname,
			lastname: player.lastname,
			age: player.age,
			xp: player.xp,
			rating: player.rating ?? 0,
			nationId: player.nationId,
			positions: player.positions ?? [],
			skills,
			infoVisibility: getPlayerInfoVisibility(skills),
			talents: player.talents,
			specialSkillCount:
				player.specialSkillCount ?? player.specialSkills?.length ?? 0,
			specialSkillIds: specialSkillsVisible
				? (player.specialSkills ?? []).map((skill) => skill.id)
				: [],
			specialSkillsVisible,
			isGoalie: player.goalie === true,
		};
	}
}

export const playerTooltipCache = new PlayerTooltipCache();
