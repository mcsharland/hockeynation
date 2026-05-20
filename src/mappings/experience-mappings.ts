export const EXPERIENCE_LABELS: Record<number, string> = {
	0: "None",
	1: "Awful",
	2: "Bad",
	3: "Poor",
	4: "Average",
	5: "Solid",
	6: "Good",
	7: "Very Good",
	8: "Excellent",
	9: "Outstanding",
	10: "Elite",
};

export function getExperienceLabel(xp: number): string {
	return EXPERIENCE_LABELS[xp] ?? `Level ${xp}`;
}
