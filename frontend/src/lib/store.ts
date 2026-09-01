import { create } from "zustand";
import { api, setAuthToken } from "./api";

interface AuthState {
  token: string | null;
  userId: string | null;
  setToken: (token: string, userId: string) => void;
  clearToken: () => void;
  isAuthenticated: () => boolean;
}

const persistedToken = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
if (persistedToken) {
  setAuthToken(persistedToken);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: typeof window !== "undefined" ? localStorage.getItem("auth_token") : null,
  userId: typeof window !== "undefined" ? localStorage.getItem("user_id") : null,
  setToken: (token, userId) => {
    localStorage.setItem("auth_token", token);
    localStorage.setItem("user_id", userId);
    setAuthToken(token);
    set({ token, userId });
  },
  clearToken: () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_id");
    delete api.defaults.headers.common["Authorization"];
    set({ token: null, userId: null });
  },
  isAuthenticated: () => !!get().token,
}));

interface DoctorProfile {
  id: string;
  name: string;
  specialty: string;
  consult_fee?: number;
  bio?: string;
}

interface DoctorStore {
  profile: DoctorProfile | null;
  setProfile: (profile: DoctorProfile) => void;
  clearProfile: () => void;
}

export const useDoctorStore = create<DoctorStore>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
  clearProfile: () => set({ profile: null }),
}));

type Language = "en" | "ml";

interface LanguageStore {
  language: Language;
  setLanguage: (lang: Language) => void;
}

const persistedLang = typeof window !== "undefined" ? localStorage.getItem("app_lang") as Language : null;

export const useLanguageStore = create<LanguageStore>((set) => ({
  language: persistedLang && ["en", "ml"].includes(persistedLang) ? persistedLang : "en",
  setLanguage: (lang) => {
    localStorage.setItem("app_lang", lang);
    set({ language: lang });
  },
}));
