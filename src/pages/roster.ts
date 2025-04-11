import { Player } from "./player";

declare global {
  interface Window {
    rosterData?: Roster | null;
  }
}

interface Players {
  [id: string]: Player;
}
class Roster {
  private players: Players;

  constructor(data: any) {
    this.players = this.parseRosterData(data);
  }

  private parseRosterData(data: any): Players {
    const roster = {} as Players;

    for (const p of data.players) {
      roster[p.id] = new Player(p);
    }
    console.log(roster);
    return roster;
  }
}

export function handleRosterData(data: any) {
  window.rosterData = new Roster(data);
}
