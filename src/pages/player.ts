import {
	type ApiPlayer,
	getPlayerInfoVisibility,
	type NormalizedSkill,
	normalizeSkills,
	type PlayerInfoVisibility,
	type SkillMap,
	toSkillMap,
} from "../player-data";

type Stat = NormalizedSkill;
type Stats = SkillMap;

interface PlayerStats {
	stats: Stats;
	infoVisibility: PlayerInfoVisibility;
}

export class Player {
	private stats: Stats;
	private minStats: Stats;
	private maxStats: Stats;
	private infoVisibility: PlayerInfoVisibility;
	private isAmateur: boolean;
	private ovr: number;
	private minOvr: number;
	private maxOvr: number;

	constructor(data: ApiPlayer) {
		const player = this.parsePlayerData(data);
		this.stats = player.stats;
		this.infoVisibility = player.infoVisibility;
		this.isAmateur = data?.amateur ?? false;
		this.minStats = this.calcMinStats(this.stats);
		this.maxStats = this.calcMaxStats(this.stats);
		this.ovr = data?.rating ?? 0;
		this.minOvr = this.calculateOVR(this.minStats);
		this.maxOvr = this.calculateOVR(this.maxStats);
	}

	private getFloor(): number {
		return this.isAmateur ? 3 : 4;
	}

	private getCap(): number {
		return this.isAmateur ? 5 : 10;
	}

	private parsePlayerData(data: ApiPlayer): PlayerStats {
		const skills = normalizeSkills(data.skills, data.talents);
		return {
			stats: toSkillMap(skills),
			infoVisibility: getPlayerInfoVisibility(skills),
		};
	}

	private canIncrease(stat: Stat): boolean {
		return !stat.max && !stat.dec;
	}

	private increaseStatTo(stat: Stat, targetRating: number): void {
		if (!this.canIncrease(stat)) return;

		stat.rating = Math.min(Math.max(stat.rating, targetRating), this.getCap());
	}

	private calcMinStats(stats: Stats): Stats {
		const minStats = structuredClone(stats);
		let weakestRating = this.getCap();
		let highestNonStrongestRating = 0;

		// update ratings and find the highest non-strongest rating
		for (const stat of Object.values(minStats)) {
			this.increaseStatTo(stat, stat.rating + 1);
			if (stat.strength !== "strongest") {
				highestNonStrongestRating = Math.max(
					highestNonStrongestRating,
					stat.rating,
				);
			}
		}

		// find the weakest rating
		for (const stat of Object.values(minStats)) {
			if (stat.strength === "weakest") {
				weakestRating = stat.rating;
			}
		}
		// adjust strongest stats
		for (const stat of Object.values(minStats)) {
			if (
				stat.strength === "strongest" &&
				stat.rating < highestNonStrongestRating
			) {
				this.increaseStatTo(stat, highestNonStrongestRating);
			}
		}

		// adjust weakest stats
		for (const stat of Object.values(minStats)) {
			if (stat.rating < weakestRating) {
				this.increaseStatTo(stat, weakestRating);
			}
			if (stat.rating < this.getFloor()) {
				this.increaseStatTo(stat, this.getFloor());
			}
		}
		return minStats;
	}

	private calcMaxStats(stats: Stats): Stats {
		const maxStats: Stats = structuredClone(stats);
		let strongestRating = this.getCap();
		let lowestNonWeakestRating = this.getCap();

		// find the strongest rating
		for (const stat of Object.values(maxStats)) {
			if (stat.strength === "strongest") {
				strongestRating = Math.min(
					strongestRating,
					this.canIncrease(stat) ? this.getCap() : stat.rating,
				);
			}
		}

		// update ratings and find the lowest non-weakest rating
		for (const stat of Object.values(maxStats)) {
			if (stat.rating < strongestRating) {
				this.increaseStatTo(stat, strongestRating);
			}
			if (stat.strength !== "weakest") {
				lowestNonWeakestRating = Math.min(lowestNonWeakestRating, stat.rating);
			}
		}

		// adjust strongest stats
		for (const stat of Object.values(maxStats)) {
			if (stat.strength === "strongest" && stat.rating < this.getCap()) {
				this.increaseStatTo(stat, this.getCap());
			}
		}

		// adjust weakest stats
		for (const stat of Object.values(maxStats)) {
			if (stat.strength === "weakest" && stat.rating > lowestNonWeakestRating) {
				stat.rating = lowestNonWeakestRating;
			}
			if (stat.rating < this.getFloor()) {
				this.increaseStatTo(stat, this.getFloor());
			}
		}

		return maxStats;
	}

	public getStats(): Stats {
		return this.stats;
	}

	public getMinStats(): Stats {
		return this.minStats;
	}

	public getMaxStats(): Stats {
		return this.maxStats;
	}

	public getInfoVisibility(): PlayerInfoVisibility {
		return this.infoVisibility;
	}

	public getOvr(): number {
		return this.ovr;
	}
	public getMaxOvr(): number {
		return Math.max(this.maxOvr, this.ovr); // handles cases where ovr is known through scouting, but stats are unknown
	}

	public getMinOvr(): number {
		return Math.max(this.minOvr, this.ovr);
	}

	private calculateOVR(stats: Stats): number {
		if (this.infoVisibility === "none") return 0;
		const statsValues = Object.values(stats);
		const sum = statsValues.reduce(
			(acc: number, stat: Stat) => acc + stat.rating,
			0,
		);
		const avg = sum / statsValues.length;
		const excess = statsValues.reduce(
			(acc: number, stat: Stat) =>
				stat.rating > avg ? acc + stat.rating - avg : acc,
			0,
		);
		const correctedSum = sum + excess;
		const correctedAverage = correctedSum / statsValues.length;
		return Math.round(correctedAverage * 10);
	}
}
