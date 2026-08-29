const GRAPHQL_URL = "https://api.github.com/graphql";

const QUERY = `
query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            contributionCount
          }
        }
      }
    }
    repositories(first: 100, ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC) {
      nodes {
        languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
          edges {
            size
            node { name color }
          }
        }
      }
    }
  }
}`;

async function graphql(token, login) {
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      Authorization: `bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "jslopez1104-profile-generator",
    },
    body: JSON.stringify({ query: QUERY, variables: { login } }),
  });
  if (!res.ok) {
    throw new Error(`GitHub GraphQL request failed: ${res.status} ${await res.text()}`);
  }
  const json = await res.json();
  if (json.errors) {
    throw new Error(`GitHub GraphQL errors: ${JSON.stringify(json.errors)}`);
  }
  return json.data.user;
}

/** Longest run of consecutive days with contributionCount > 0, and the current run ending today/yesterday. */
function computeStreaks(days) {
  let longest = 0;
  let longestRange = null;
  let run = 0;
  let runStart = null;

  for (const day of days) {
    if (day.contributionCount > 0) {
      if (run === 0) runStart = day.date;
      run += 1;
      if (run > longest) {
        longest = run;
        longestRange = [runStart, day.date];
      }
    } else {
      run = 0;
      runStart = null;
    }
  }

  // Current streak: walk backward from the last day; a gap of "today has no
  // contribution yet" shouldn't zero out yesterday's streak, so skip a
  // trailing empty day once before requiring continuity.
  let current = 0;
  let skippedTrailingEmptyDay = false;
  for (let i = days.length - 1; i >= 0; i--) {
    const count = days[i].contributionCount;
    if (count > 0) {
      current += 1;
    } else if (!skippedTrailingEmptyDay && current === 0) {
      skippedTrailingEmptyDay = true;
      continue;
    } else {
      break;
    }
  }

  return { current, longest, longestRange };
}

function aggregateLanguages(repoNodes) {
  const totals = new Map();
  for (const repo of repoNodes) {
    for (const edge of repo.languages.edges) {
      const key = edge.node.name;
      const prev = totals.get(key) ?? { size: 0, color: edge.node.color };
      totals.set(key, { size: prev.size + edge.size, color: edge.node.color });
    }
  }
  const total = [...totals.values()].reduce((sum, v) => sum + v.size, 0) || 1;
  return [...totals.entries()]
    .map(([name, v]) => ({ name, color: v.color, pct: (v.size / total) * 100 }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 5);
}

export async function fetchStats(token, login) {
  const user = await graphql(token, login);
  const cal = user.contributionsCollection.contributionCalendar;
  const days = cal.weeks.flatMap((w) => w.contributionDays);
  const streaks = computeStreaks(days);
  const languages = aggregateLanguages(user.repositories.nodes);

  return {
    totalContributions: cal.totalContributions,
    days,
    currentStreak: streaks.current,
    longestStreak: streaks.longest,
    longestStreakRange: streaks.longestRange,
    languages,
  };
}
