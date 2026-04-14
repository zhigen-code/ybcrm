import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { crmApi, attachTokenInterceptor } from '@/shared/utils/request';
const CrmAuthContext = createContext(null);
const TOKEN_KEY = 'crm_token';
export function CrmAuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
    const [isLoading, setIsLoading] = useState(true);
    const logout = useCallback(() => {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
    }, []);
    useEffect(() => {
        attachTokenInterceptor(crmApi, () => localStorage.getItem(TOKEN_KEY), logout);
    }, [logout]);
    useEffect(() => {
        if (!token) {
            setIsLoading(false);
            return;
        }
        crmApi
            .get('/auth/me')
            .then((res) => setUser(res.data.data))
            .catch(() => logout())
            .finally(() => setIsLoading(false));
    }, [token, logout]);
    const updateUser = useCallback((partial) => {
        setUser((prev) => prev ? { ...prev, ...partial } : prev);
    }, []);
    const login = async (email, password) => {
        const res = await crmApi.post('/auth/login', {
            email,
            password,
        });
        const { token: newToken, user: newUser } = res.data.data;
        localStorage.setItem(TOKEN_KEY, newToken);
        setToken(newToken);
        setUser(newUser);
    };
    return (_jsx(CrmAuthContext.Provider, { value: { user, token, isLoading, login, logout, updateUser }, children: children }));
}
export function useCrmAuth() {
    const ctx = useContext(CrmAuthContext);
    if (!ctx)
        throw new Error('useCrmAuth must be used within CrmAuthProvider');
    return ctx;
}
