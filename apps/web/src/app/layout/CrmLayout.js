import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCrmAuth } from '@/app/auth/CrmAuthContext';
import { Button } from '@/shared/components/Button';
import { cn } from '@/shared/utils/cn';
import { crmApi } from '@/shared/utils/request';
const navItems = [
    { to: '/app/leads', label: '线索管理' },
    { to: '/app/clients', label: '客户档案' },
    { to: '/app/activities', label: '销售活动' },
    { to: '/app/services', label: '服务管理' },
    { to: '/app/partners', label: '合作伙伴' },
];
const adminNavItems = [
    { to: '/app/users', label: '用户管理' },
    { to: '/app/settings', label: '系统管理' },
];
export default function CrmLayout() {
    const { user, logout } = useCrmAuth();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const handleLogout = () => {
        logout();
        navigate('/app/login');
    };
    const { data: publicSettings } = useQuery({
        queryKey: ['public-settings'],
        queryFn: () => crmApi.get('/public/settings').then((r) => r.data.data),
        staleTime: 1000 * 60 * 60,
    });
    const systemName = publicSettings?.systemName ?? 'CRM';
    useEffect(() => { document.title = systemName; }, [systemName]);
    const allNavItems = user?.role === 'admin' ? [...navItems, ...adminNavItems] : navItems;
    const Sidebar = ({ onNavClick }) => (_jsxs(_Fragment, { children: [_jsx("div", { className: "flex h-14 items-center px-4 border-b", children: _jsx("span", { className: "font-bold text-gray-900", children: systemName }) }), _jsx("nav", { className: "flex-1 overflow-y-auto p-3 space-y-0.5", children: allNavItems.map((item) => (_jsx(NavLink, { to: item.to, onClick: onNavClick, className: ({ isActive }) => cn('flex items-center rounded-md px-3 py-2.5 text-sm font-medium transition-colors', isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'), children: item.label }, item.to))) }), _jsxs("div", { className: "border-t p-3 space-y-0.5", children: [_jsxs(NavLink, { to: "/app/profile", onClick: onNavClick, className: ({ isActive }) => cn('flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors', isActive
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'), children: [user?.name, _jsxs("span", { className: "ml-1.5 text-xs font-normal text-gray-400", children: ["\u00B7 ", user?.role] })] }), _jsx(Button, { variant: "ghost", size: "sm", className: "w-full justify-start", onClick: handleLogout, children: "\u9000\u51FA\u767B\u5F55" })] })] }));
    return (_jsxs("div", { className: "flex h-screen bg-gray-100", children: [_jsxs("div", { className: "md:hidden fixed top-0 left-0 right-0 z-30 flex h-14 items-center justify-between bg-white px-4 shadow-sm", children: [_jsx("span", { className: "font-bold text-gray-900", children: systemName }), _jsx("button", { onClick: () => setSidebarOpen(true), className: "flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100", children: _jsx("svg", { className: "h-5 w-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M4 6h16M4 12h16M4 18h16" }) }) })] }), sidebarOpen && (_jsx("div", { className: "md:hidden fixed inset-0 z-40 bg-black/40", onClick: () => setSidebarOpen(false) })), _jsx("aside", { className: cn('md:hidden fixed left-0 top-0 bottom-0 z-50 flex w-64 flex-col bg-white shadow-xl transition-transform duration-300', sidebarOpen ? 'translate-x-0' : '-translate-x-full'), children: _jsx(Sidebar, { onNavClick: () => setSidebarOpen(false) }) }), _jsx("aside", { className: "hidden md:flex w-56 flex-col bg-white shadow-sm flex-shrink-0", children: _jsx(Sidebar, {}) }), _jsx("main", { className: "flex-1 overflow-y-auto pt-14 md:pt-0", children: _jsx(Outlet, {}) })] }));
}
