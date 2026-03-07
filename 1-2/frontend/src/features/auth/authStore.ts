import { create } from 'zustand';
import { apiFetch, ensureCsrf } from '../../lib/apiClient';
import { clearCsrfToken } from '../../lib/csrf';

export type MeUser = {
    id: string;
    name: string;
    role: 'employee' | 'manager' | 'hr';
    department: { id: string; name: string };
};

type AuthState = {
    me: MeUser | null;
    meLoading: boolean;
    loadMe: () => Promise<MeUser | null>;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
    me: null,
    meLoading: false,
    loadMe: async () => {
        if (get().meLoading) return get().me;
        set({ meLoading: true });
        try {
            const res = await apiFetch<{ user: MeUser }>('/auth/me');
            set({ me: res.user });
            return res.user;
        } catch {
            set({ me: null });
            return null;
        } finally {
            set({ meLoading: false });
        }
    },
    login: async (email, password) => {
        await ensureCsrf();
        await apiFetch('/auth/login', { method: 'POST', json: { email, password } });
        await get().loadMe();
    },
    logout: async () => {
        try {
            await apiFetch('/auth/logout', { method: 'POST' });
        } finally {
            clearCsrfToken();
            set({ me: null });
        }
    },
}));
