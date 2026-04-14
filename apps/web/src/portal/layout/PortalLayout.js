import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { usePortalAuth } from '@/portal/auth/PortalAuthContext';
import { Button } from '@/shared/components/Button';
import { cn } from '@/shared/utils/cn';
import { crmApi } from '@/shared/utils/request';
const navItems = [
    { to: '/portal/profile', label: '个人资料' },
    { to: '/portal/services', label: '服务进度' },
    { to: '/portal/resources', label: '我的文件' },
];
export default function PortalLayout() {
    const { clientUser, logout } = usePortalAuth();
    const navigate = useNavigate();
    const { data: publicSettings } = useQuery({
        queryKey: ['public-settings'],
        queryFn: () => crmApi.get('/public/settings').then((r) => r.data.data),
        staleTime: 1000 * 60 * 60,
    });
    const systemName = publicSettings?.systemName ?? '客户服务门户';
    useEffect(() => { document.title = systemName; }, [systemName]);
    const handleLogout = () => {
        logout();
        navigate('/portal/login');
    };
    return (_jsxs("div", { className: "min-h-screen bg-gray-50 pb-16 sm:pb-0", children: [_jsx("header", { className: "bg-white shadow-sm", children: _jsxs("div", { className: "mx-auto flex h-14 max-w-4xl items-center justify-between px-4", children: [_jsx("span", { className: "font-bold text-gray-900", children: systemName }), _jsx("nav", { className: "hidden sm:flex items-center gap-1", children: navItems.map((item) => (_jsx(NavLink, { to: item.to, className: ({ isActive }) => cn('rounded-md px-3 py-1.5 text-sm font-medium transition-colors', isActive
                                    ? 'bg-primary-50 text-primary-700'
                                    : 'text-gray-600 hover:bg-gray-100'), children: item.label }, item.to))) }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "hidden sm:block text-sm text-gray-500 max-w-[140px] truncate", children: clientUser?.email }), _jsx(Button, { variant: "secondary", size: "sm", onClick: handleLogout, children: "\u9000\u51FA" })] })] }) }), _jsx("main", { className: "mx-auto max-w-4xl px-4 py-6", children: _jsx(Outlet, {}) }), _jsx("nav", { className: "sm:hidden fixed bottom-0 left-0 right-0 z-20 flex border-t bg-white", children: navItems.map((item) => (_jsx(NavLink, { to: item.to, className: ({ isActive }) => cn('flex flex-1 flex-col items-center justify-center py-2 text-xs font-medium transition-colors', isActive ? 'text-primary-600' : 'text-gray-500'), children: item.label }, item.to))) })] }));
}
