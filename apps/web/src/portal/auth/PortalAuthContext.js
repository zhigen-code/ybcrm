import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { portalApi, attachTokenInterceptor } from '@/shared/utils/request';
const PortalAuthContext = createContext(null);
const TOKEN_KEY = 'portal_token';
export function PortalAuthProvider({ children }) {
    const [clientUser, setClientUser] = useState(null);
    const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
    const [isLoading, setIsLoading] = useState(true);
    const logout = useCallback(() => {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setClientUser(null);
    }, []);
    useEffect(() => {
        attachTokenInterceptor(portalApi, () => localStorage.getItem(TOKEN_KEY), logout);
    }, [logout]);
    useEffect(() => {
        if (!token) {
            setIsLoading(false);
            return;
        }
        portalApi
            .get('/auth/me')
            .then((res) => setClientUser(res.data.data))
            .catch(() => logout())
            .finally(() => setIsLoading(false));
    }, [token, logout]);
    const login = async (email, password) => {
        const res = await portalApi.post('/auth/login', { email, password });
        const { token: newToken, clientUser: newUser } = res.data.data;
        localStorage.setItem(TOKEN_KEY, newToken);
        setToken(newToken);
        setClientUser(newUser);
    };
    const sendMagicLink = async (email) => {
        await portalApi.post('/auth/magiclink', { email });
    };
    const verifyMagicLink = async (magicToken) => {
        const res = await portalApi.post('/auth/magiclink/verify', { token: magicToken });
        const { token: newToken, clientUser: newUser } = res.data.data;
        localStorage.setItem(TOKEN_KEY, newToken);
        setToken(newToken);
        setClientUser(newUser);
    };
    return (_jsx(PortalAuthContext.Provider, { value: { clientUser, token, isLoading, login, sendMagicLink, verifyMagicLink, logout }, children: children }));
}
export function usePortalAuth() {
    const ctx = useContext(PortalAuthContext);
    if (!ctx)
        throw new Error('usePortalAuth must be used within PortalAuthProvider');
    return ctx;
}
