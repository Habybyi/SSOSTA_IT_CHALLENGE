// Nie natvrdo "localhost": keď sa stránka otvorí na mobile cez IP počítača,
// "localhost" by znamenal samotný mobil.
const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3001/api/v1`;

export class ApiError extends Error {
  constructor(message, status, fields) {
    super(message);
    this.status = status;
    this.fields = fields || {};
  }
}

let onUnauthorized = null;

// AuthContext sa sem zaregistruje, aby pri vypršanom prihlásení odhlásil používateľa.
export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

async function request(path, { method = "GET", body, token, query } = {}) {
  const qs = query ? new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== "")).toString() : "";
  const response = await fetch(`${API_URL}${path}${qs ? `?${qs}` : ""}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && token && onUnauthorized) onUnauthorized();
    throw new ApiError(data?.error || "Niečo sa pokazilo. Skús to znova.", response.status, data?.fields);
  }
  return data;
}

export const api = {
  login: (email, password) => request("/auth/login", { method: "POST", body: { email, password } }),
  me: (token) => request("/auth/me", { token }),
  changePassword: (token, currentPassword, newPassword) =>
    request("/auth/change-password", { method: "POST", token, body: { currentPassword, newPassword } }),

  listUsers: (token, query) => request("/users", { token, query }),
  createUser: (token, data) => request("/users", { method: "POST", token, body: data }),
  updateUser: (token, id, data) => request(`/users/${id}`, { method: "PATCH", token, body: data }),
  resetPassword: (token, id) => request(`/users/${id}/reset-password`, { method: "POST", token }),
};
