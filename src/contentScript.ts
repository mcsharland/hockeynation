declare global {
  interface Window {
    statsTableObserver?: MutationObserver | null;
  }
}

interface Stat {
  rating: number;
  hasRedPuck: boolean;
  strength: "strongest" | "weakest" | null;
}

interface Stats {
  [key: string]: Stat;
}

const calculateOVR = (stats: Stats): number => {
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
};

const parseStatsTable = (parentNode: HTMLElement): boolean => {
  const puck = parentNode.querySelector<SVGSVGElement>("svg.fa-hockey-puck");
  if (!puck) {
    return false;
  }

  let ancestor: HTMLElement | null = puck.parentElement;
  while (ancestor && !ancestor.matches("table[data-v-a81c915e]")) {
    ancestor = ancestor.parentElement;
  }

  const statsTable = ancestor as HTMLTableElement | null;
  if (!statsTable) {
    return false;
  }

  const divs = parentNode.querySelectorAll("div.card-header");

  const ovrElement = parentNode.querySelector<HTMLElement>(
    "div.polygon.select-none text",
  );
  const baseOVR = ovrElement ? ovrElement.textContent : null;

  const updateOVR = (ovr: number) => {
    const ovrElement = parentNode.querySelector<HTMLElement>(
      "div.polygon.select-none text",
    );
    if (ovrElement) {
      ovrElement.textContent = ovr.toString();

      const polygonElement = ovrElement.parentElement?.querySelector("polygon");
      if (polygonElement) {
        let fillColor = "";
        if (ovr <= 39) {
          fillColor = "#f56565";
        } else if (ovr >= 40 && ovr <= 54) {
          fillColor = "#ed8936";
        } else if (ovr >= 55 && ovr <= 69) {
          fillColor = "#1995AD";
        } else if (ovr >= 70 && ovr <= 79) {
          fillColor = "#10b981";
        } else if (ovr >= 80) {
          fillColor = "#383839";
        }
        polygonElement.setAttribute("fill", fillColor);
      }
    }
  };

  const updateHockeyPucks = (option: string) => {
    statsRows.forEach((row) => {
      const statName = row.cells[0]?.textContent?.trim() || "";
      const pucksCell = row.cells[1];
      const pucks =
        pucksCell.querySelectorAll<SVGElement>("svg.fa-hockey-puck");
      const ratingCell = row.cells[2];
      const ratingSpan = ratingCell?.querySelector("span");
      const stat = stats[statName];

      if (stat) {
        let rating = stat.rating;

        if (option === "Min") {
          rating = minStats[statName].rating;
        } else if (option === "Max") {
          rating = maxStats[statName].rating;
        }

        pucks.forEach((puck, index) => {
          puck.classList.remove("text-blue-400");
          if (index < rating) {
            puck.classList.remove("text-gray-300");
            if (index >= stat.rating) {
              puck.classList.add("text-blue-400");
            }
          } else {
            puck.classList.add("text-gray-300");
          }

          if (index === rating - 1 && stat.hasRedPuck) {
            puck.classList.add("max-level");
          } else {
            puck.classList.remove("max-level");
          }
        });

        // update the rating value in the span element
        if (ratingSpan) {
          ratingSpan.textContent = `(${rating})`;
        }
      }
    });

    let ovr = calculateOVR(stats);
    if (option === "Min") {
      ovr = calculateOVR(minStats);
    } else if (option === "Max") {
      ovr = calculateOVR(maxStats);
    }

    if (option !== "Default" || !scoutPlayer) {
      updateOVR(ovr);
    } else {
      updateOVR(baseOVR !== null ? parseInt(baseOVR) : ovr);
    }
  };

  divs.forEach((div) => {
    if (div.textContent && div.textContent.trim() === "Skills") {
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
        updateHockeyPucks(selectedOption);
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
  });

  const statsRows =
    statsTable.querySelectorAll<HTMLTableRowElement>("tbody tr");
  if (!statsRows.length) {
    return false;
  }

  const stats: Stats = {};
  let scoutPlayer = false;
  statsRows.forEach((row) => {
    const statName = row.cells[0]?.textContent?.trim() || "";
    const pucks = row.querySelectorAll<SVGSVGElement>("svg.fa-hockey-puck");
    const ratingText = row.cells[row.cells.length - 1]?.textContent?.trim();
    const ratingMatch = ratingText ? ratingText.match(/\((\d+)\)/) : null;

    if (!scoutPlayer && !ratingMatch) {
      scoutPlayer = true;
    }
    const rating = ratingMatch ? parseInt(ratingMatch[1], 10) : 0;
    const hasRedPuck = Array.from(pucks).some((puck) =>
      puck.classList.contains("max-level"),
    );

    stats[statName] = {
      rating,
      hasRedPuck,
      strength: null,
    };
  });

  const talentContainer = parentNode.querySelector<HTMLDivElement>(
    "div.flex.items-center.justify-end.flex-col span.text-muted",
  );
  if (talentContainer) {
    const talentText = talentContainer.textContent || "";
    const strongestMatch = talentText.match(
      /Strongest talents of .+ are (\w+ and \w+)/,
    );
    const weakestMatch = talentText.match(/weakest talent is (\w+)/);

    const strongestTalents = strongestMatch
      ? strongestMatch[1].split(" and ")
      : [];
    const weakestTalent = weakestMatch ? weakestMatch[1] : "";

    strongestTalents.forEach((talent) => {
      if (stats[talent]) {
        stats[talent].strength = "strongest";
      }
    });

    if (weakestTalent && stats[weakestTalent]) {
      stats[weakestTalent].strength = "weakest";
    }
  }
  const minStats: Stats = JSON.parse(JSON.stringify(stats));
  let weakestRating = 10;
  let highestNonStrongestRating = 0;

  // update ratings and find the highest non-strongest rating
  for (const stat of Object.values(minStats)) {
    stat.rating = stat.hasRedPuck ? stat.rating : stat.rating + 1;
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

  const maxStats: Stats = JSON.parse(JSON.stringify(stats));
  let strongestRating = 10;
  let lowestNonWeakestRating = 10;

  // find the strongest rating
  for (const stat of Object.values(maxStats)) {
    if (stat.strength === "strongest") {
      strongestRating = Math.min(
        strongestRating,
        stat.hasRedPuck ? stat.rating : 10,
      );
    }
  }

  // update ratings and find the lowest non-weakest rating
  for (const stat of Object.values(maxStats)) {
    if (!stat.hasRedPuck && stat.rating < strongestRating) {
      stat.rating = strongestRating;
    }
    if (stat.strength !== "weakest") {
      lowestNonWeakestRating = Math.min(lowestNonWeakestRating, stat.rating);
    }
  }

  // adjust strongest stats
  for (const stat of Object.values(maxStats)) {
    if (stat.strength === "strongest" && !stat.hasRedPuck && stat.rating < 10) {
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

  updateHockeyPucks("Default");
  return true;
};

(function () {
  const targetUrls = ["https://hockey-nation.com/player/"];

  function handlePageLoad() {
    const currentUrl = window.location.href;
    const isTargetPage = targetUrls.some((url) => currentUrl.startsWith(url));

    if (isTargetPage) {
      if (!window.statsTableObserver) {
        initializeObserver();
      }
    } else {
      if (window.statsTableObserver) {
        window.statsTableObserver.disconnect();
        window.statsTableObserver = null;
      }
    }
  }

  // @ts-ignore
  window.navigation.addEventListener("currententrychange", handlePageLoad);

  handlePageLoad();

  function initializeObserver() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as HTMLElement;
              if (
                element.matches("div[data-v-3c6c075b]") &&
                element.querySelector("table[data-v-a81c915e]")
              ) {
                parseStatsTable(element);
              }
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    window.statsTableObserver = observer;
  }
})();

export {};
