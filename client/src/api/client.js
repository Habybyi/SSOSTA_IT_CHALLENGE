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

  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const mustRelogin = response.status === 401 || data?.code === "PASSWORD_CHANGE_REQUIRED";
    if (mustRelogin && token && onUnauthorized) onUnauthorized();
    throw new ApiError(data?.error || "Niečo sa pokazilo. Skús to znova.", response.status, data?.fields);
  }
  return data;
}

async function upload(path, { token, formData }) {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(data?.error || "Nahrávanie zlyhalo. Skús to znova.", response.status, data?.fields);
  }
  return data;
}

async function fetchBlob(path, token) {
  const response = await fetch(`${API_URL}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new ApiError("Nepodarilo sa načítať súbor.", response.status);
  return response.blob();
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

  listCustomers: (token, query) => request("/customers", { token, query }),
  listCities: (token) => request("/customers/cities", { token }),
  getCustomer: (token, id) => request(`/customers/${id}`, { token }),
  createCustomer: (token, data) => request("/customers", { method: "POST", token, body: data }),
  updateCustomer: (token, id, data) => request(`/customers/${id}`, { method: "PATCH", token, body: data }),
  deleteCustomer: (token, id) => request(`/customers/${id}`, { method: "DELETE", token }),

  createGarden: (token, customerId, data) =>
    request(`/customers/${customerId}/gardens`, { method: "POST", token, body: data }),
  getGarden: (token, id) => request(`/gardens/${id}`, { token }),
  updateGarden: (token, id, data) => request(`/gardens/${id}`, { method: "PATCH", token, body: data }),
  deleteGarden: (token, id) => request(`/gardens/${id}`, { method: "DELETE", token }),

  createZone: (token, gardenId, data) => request(`/gardens/${gardenId}/zones`, { method: "POST", token, body: data }),
  updateZone: (token, gardenId, zoneId, data) =>
    request(`/gardens/${gardenId}/zones/${zoneId}`, { method: "PATCH", token, body: data }),
  deleteZone: (token, gardenId, zoneId) => request(`/gardens/${gardenId}/zones/${zoneId}`, { method: "DELETE", token }),

  getHistory: (token, gardenId) => request(`/gardens/${gardenId}/history`, { token }),
  addWorkLog: (token, gardenId, data) => request(`/gardens/${gardenId}/work-logs`, { method: "POST", token, body: data }),

  uploadGardenPhotos: (token, gardenId, files, caption) => {
    const formData = new FormData();
    for (const file of files) formData.append("photos", file);
    if (caption) formData.append("caption", caption);
    return upload(`/gardens/${gardenId}/photos`, { token, formData });
  },
  getPhotoBlob: (token, photoId) => fetchBlob(`/photos/${photoId}/file`, token),
  deletePhoto: (token, photoId) => request(`/photos/${photoId}`, { method: "DELETE", token }),

  listRequests: (token, query) => request("/requests", { token, query }),
  getRequestStats: (token) => request("/requests/stats", { token }),
  listAssignees: (token) => request("/requests/assignees", { token }),
  getRequest: (token, id) => request(`/requests/${id}`, { token }),
  createRequest: (token, data) => request("/requests", { method: "POST", token, body: data }),
  updateRequest: (token, id, data) => request(`/requests/${id}`, { method: "PATCH", token, body: data }),
  changeRequestStatus: (token, id, data) => request(`/requests/${id}/status`, { method: "POST", token, body: data }),
};
