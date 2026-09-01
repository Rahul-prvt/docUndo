import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

// Read the persisted session for every request. This makes a page refresh
// safe: Axios defaults are recreated on refresh, while localStorage survives.
api.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    delete config.headers.Authorization;
  }
  return config;
});

// Add auth token to requests
export const setAuthToken = (token: string) => {
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
};

// Doctor endpoints
export const doctorApi = {
  signup: (data: any) => api.post("/auth/signup/doctor", data),
  login: (data: any) => api.post("/auth/login", data),
  getProfile: () => api.get("/doctors/me"),
  updateProfile: (data: any) => api.put("/doctors/me", data),
  addClinic: (data: any) => api.post("/doctors/me/clinic", data),
  toggleAvailability: (available: boolean) =>
    api.put("/doctors/me/availability", { available }),
};

// Search endpoints
export const searchApi = {
  search: (lat: number, lng: number, specialty?: string, radius_km?: number) =>
    api.get("/search", {
      params: { lat, lng, specialty, radius_km },
    }),
};

// Triage endpoints
export const triageApi = {
  suggest: (symptoms: string) => api.post("/triage", { symptoms }),
  chat: (messages: { role: string; content: string }[]) =>
    api.post("/chat", { messages }),
};

// Admin endpoints
export const adminApi = {
  listPending: () => api.get("/admin/doctors/pending"),
  verifyDoctor: (doctorId: string, verified: boolean) =>
    api.post(`/admin/doctors/${doctorId}/verify`, { verified }),
};
