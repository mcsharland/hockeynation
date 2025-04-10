interface Stat {
  rating: number;
  max: boolean;
  strength: "strongest" | "weakest" | null;
}

interface Stats {
  [key: string]: Stat;
}

interface Player {
  stats: Stats;
  scout: boolean;
}

function parsePlayerData(data: any) {
  const player = {} as Player;
  player.stats = {};

  player.scout = data.data.skills.some((skill: any) => skill?.hidden ?? false);

  for (const s of data.data.skills) {
    player.stats[s.id] = {
      rating: parseInt(s?.lvl ?? 0),
      max: s?.max ?? false,
      strength: null, // default, change below
    };
  }
  if (data.data?.talents?.weakest) {
    // if weakness exists so does strength
    player.stats[data.data.talents.weakest].strength = "weakest";
    data.data.talents.strongest.forEach(
      (str: String) =>
        (player.stats[str as keyof typeof player.stats].strength = "strongest"),
    );
  }
  return player;
}

function calcMinStats(stats: Stats) {
  const minStats = structuredClone(stats);
  let weakestRating = 10;
  let highestNonStrongestRating = 0;

  // update ratings and find the highest non-strongest rating
  for (const stat of Object.values(minStats)) {
    stat.rating = stat.max ? stat.rating : stat.rating + 1;
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
    if (stat.rating < 4) {
      stat.rating = 4;
    }
  }
  return minStats;
}

function calcMaxStats(stats: Stats) {
  const maxStats: Stats = structuredClone(stats);
  let strongestRating = 10;
  let lowestNonWeakestRating = 10;

  // find the strongest rating
  for (const stat of Object.values(maxStats)) {
    if (stat.strength === "strongest") {
      strongestRating = Math.min(strongestRating, stat.max ? stat.rating : 10);
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
    if (stat.strength === "strongest" && !stat.max && stat.rating < 10) {
      stat.rating = 10;
    }
  }

  // adjust weakest stats
  for (const stat of Object.values(maxStats)) {
    if (stat.strength === "weakest" && stat.rating > lowestNonWeakestRating) {
      stat.rating = lowestNonWeakestRating;
    }
    if (stat.rating < 4) {
      stat.rating = 4;
    }
  }

  return maxStats;
}

function _insertDropdown(div: HTMLDivElement) {
  const dropdown = document.createElement("select");
  dropdown.classList.add("stats-dropdown");
  dropdown.style.marginLeft = "auto";
  dropdown.style.fontSize = "12px";
  dropdown.style.padding = "2px";
  dropdown.style.border = "none";
  dropdown.style.backgroundColor = "#fff";
  dropdown.style.color = "#000";
  dropdown.style.width = "85px";
  dropdown.style.height = "18px";
  dropdown.style.lineHeight = "18px";
  dropdown.style.paddingTop = "0px";
  dropdown.style.paddingBottom = "0px";
  dropdown.style.paddingRight = "21px";
  dropdown.style.borderRadius = "2px";

  dropdown.addEventListener("change", (event) => {
    const selectElement = event.target as HTMLSelectElement;
    const selectedOption = selectElement.value;
    // updateHockeyPucks(selectedOption);
  });

  const options = ["Default", "Min", "Max"];
  options.forEach((option) => {
    const optionElement = document.createElement("option");
    optionElement.value = option;
    optionElement.textContent = option;
    optionElement.style.textAlign = "center";
    dropdown.appendChild(optionElement);
  });

  div.appendChild(dropdown);
}

function checkPageLoad() {
  const div = Array.from(document.querySelectorAll("div.card-header")).filter(
    (d) => d?.textContent?.trim() === "Skills",
  )?.[0] as HTMLDivElement;
  if (div) {
    _insertDropdown(div);
    return;
  }
  requestAnimationFrame(checkPageLoad);
}

export function handlePlayerData(data: any) {
  // I just naturally assumed that the player request would only be used on the player page...
  // This is probably true but this will be left in until I confirm or refactor the handler
  if (!window.location.href.startsWith("https://hockey-nation.com/player"))
    return;

  const player: Player = parsePlayerData(data);
  const minStats = calcMinStats(player.stats);
  const maxStats = calcMaxStats(player.stats);
  requestAnimationFrame(checkPageLoad);
}
