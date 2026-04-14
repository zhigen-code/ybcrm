import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { Navigate } from 'react-router-dom';
import { usePortalAuth } from './PortalAuthContext';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
export function PortalGuard({ children }) {
    const { clientUser, isLoading } = usePortalAuth();
    if (isLoading)
        return _jsx(LoadingSpinner, { fullScreen: true });
    if (!clientUser)
        return _jsx(Navigate, { to: "/portal/login", replace: true });
    return _jsx(_Fragment, { children: children });
}
