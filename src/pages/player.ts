type StatStrength = "strongest" | "weakest" | null;

interface Stat {
	rating: number;
	max: boolean;
	strength: StatStrength;
}

interface Stats {
	[id: string]: Stat;
}

interface PlayerStats {
	stats: Stats;
	scout: ScoutLevel;
}

type ScoutLevel = 0 | 1 | 2;

export class Player {
	private stats: Stats;
	private minStats: Stats;
	private maxStats: Stats;
	private scoutLevel: ScoutLevel;
	private isAmateur: boolean;
	private ovr: number;
	private minOvr: number;
	private maxOvr: number;

	constructor(data: any) {
		const player = this.parsePlayerData(data);
		this.stats = player.stats;
		this.scoutLevel = player.scout;
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

	private parsePlayerData(data: any): PlayerStats {
		const player = {} as PlayerStats;
		player.stats = {};

		const allHidden = data.skills.every((skill: any) => skill?.hidden ?? false);
		const someHidden = data.skills.some((skill: any) => skill?.hidden ?? false);
		player.scout = allHidden ? 1 : someHidden ? 2 : 0;

		for (const s of data.skills) {
			player.stats[s.id] = {
				rating: parseInt(s?.lvl ?? 0),
				max: s?.max ?? false,
				strength: null, // default, change below
			};
		}
		if (data?.talents?.weakest) {
			// if weakness exists so does strength
			player.stats[data.talents.weakest].strength = "weakest";
			data.talents.strongest.forEach(
				(str: string) =>
					(player.stats[str as keyof typeof player.stats].strength =
						"strongest"),
			);
		}
		return player;
	}

	private calcMinStats(stats: Stats): Stats {
		const minStats = structuredClone(stats);
		let weakestRating = this.getCap();
		let highestNonStrongestRating = 0;

		// update ratings and find the highest non-strongest rating
		for (const stat of Object.values(minStats)) {
			stat.rating = stat.max
				? stat.rating
				: Math.min(stat.rating + 1, this.getCap());
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
				stat.rating = highestNonStrongestRating;
			}
		}

		// adjust weakest stats
		for (const stat of Object.values(minStats)) {
			if (stat.rating < weakestRating) {
				stat.rating = weakestRating;
			}
			if (stat.rating < this.getFloor()) {
				stat.rating = this.getFloor();
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
					stat.max ? stat.rating : this.getCap(),
				);
			}
		}

		// update ratings and find the lowest non-weakest rating
		for (const stat of Object.values(maxStats)) {
			if (!stat.max && stat.rating < strongestRating) {
				stat.rating = strongestRating;
			}
			if (stat.strength !== "weakest") {
				lowestNonWeakestRating = Math.min(lowestNonWeakestRating, stat.rating);
			}
		}

		// adjust strongest stats
		for (const stat of Object.values(maxStats)) {
			if (
				stat.strength === "strongest" &&
				!stat.max &&
				stat.rating < this.getCap()
			) {
				stat.rating = this.getCap();
			}
		}

		// adjust weakest stats
		for (const stat of Object.values(maxStats)) {
			if (stat.strength === "weakest" && stat.rating > lowestNonWeakestRating) {
				stat.rating = lowestNonWeakestRating;
			}
			if (stat.rating < this.getFloor()) {
				stat.rating = this.getFloor();
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

	public getScoutLevel(): ScoutLevel {
		return this.scoutLevel;
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
		if (this.scoutLevel === 1) return 0;
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
