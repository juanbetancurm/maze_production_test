const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";

async function adminRequest(path, adminSecret, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      "x-admin-secret": adminSecret,
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

export function getAdminTeams(adminSecret) {
  return adminRequest("/admin/teams", adminSecret);
}

export function getAdminTeam(teamId, adminSecret) {
  return adminRequest(`/admin/teams/${teamId}`, adminSecret);
}

export function deleteAdminTeam(teamId, adminSecret) {
  return adminRequest(`/admin/teams/${teamId}`, adminSecret, {
    method: "DELETE",
  });
}
