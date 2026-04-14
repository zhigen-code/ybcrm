import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { Navigate } from 'react-router-dom';
import { useCrmAuth } from './CrmAuthContext';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
export function CrmGuard({ children }) {
    const { user, isLoading } = useCrmAuth();
    if (isLoading)
        return _jsx(LoadingSpinner, { fullScreen: true });
    if (!user)
        return _jsx(Navigate, { to: "/app/login", replace: true });
    return _jsx(_Fragment, { children: children });
}
