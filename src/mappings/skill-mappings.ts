export const SKILL_NAME_TO_ID: Record<string, string> = {
	Skating: "SKA",
	Reflexes: "REF",
	Endurance: "END",
	Power: "PWR",
	Positioning: "POS",
	Shooting: "SHO",
	Pads: "PAD",
	Passing: "PAS",
	Glove: "GLO",
	Defending: "DEF",
	Blocker: "BLO",
	Checking: "CHK",
	Stick: "STK",
	Discipline: "DSC",
	Faceoffs: "FOF",
	"Offensive Play": "OFP",
	"Defensive Play": "DFP",
	"Puck Battling": "BAT",
	"Power Play": "PP",
	"Penalty Kill": "PK",
};

export const SKILL_ID_TO_NAME: Record<string, string> = Object.fromEntries(
	Object.entries(SKILL_NAME_TO_ID).map(([name, id]) => [id, name]),
);
