const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const message = data?.error || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data;
}

export function createTeam({ members, course }) {
  return request("/teams", {
    method: "POST",
    body: JSON.stringify({ members, course }),
  });
}

export function getTeam(teamId) {
  return request(`/teams/${teamId}`);
}

export function getProgress(teamId) {
  return request(`/progress/${teamId}`);
}

export function completeLevel({ teamId, level, moves, livesRemaining, elapsedSeconds }) {
  return request("/progress/complete-level", {
    method: "POST",
    body: JSON.stringify({ teamId, level, moves, livesRemaining, elapsedSeconds }),
  });
}

export function getLeaderboard(levelId) {
  return request(`/progress/leaderboard/${levelId}`);
}
