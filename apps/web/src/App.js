import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { CrmAuthProvider } from '@/app/auth/CrmAuthContext';
import { PortalAuthProvider } from '@/portal/auth/PortalAuthContext';
import { CrmGuard } from '@/app/auth/CrmGuard';
import { PortalGuard } from '@/portal/auth/PortalGuard';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
// 内部 CRM 页面（懒加载）
const CrmLogin = lazy(() => import('@/app/auth/LoginPage'));
const CrmLayout = lazy(() => import('@/app/layout/CrmLayout'));
const LeadsPage = lazy(() => import('@/app/leads/LeadsPage'));
const LeadDetailPage = lazy(() => import('@/app/leads/LeadDetailPage'));
const ClientsPage = lazy(() => import('@/app/clients/ClientsPage'));
const ClientDetailPage = lazy(() => import('@/app/clients/ClientDetailPage'));
const ServicesPage = lazy(() => import('@/app/services/ServicesPage'));
const PartnersPage = lazy(() => import('@/app/partners/PartnersPage'));
const ActivitiesPage = lazy(() => import('@/app/activities/ActivitiesPage'));
const UsersPage = lazy(() => import('@/app/users/UsersPage'));
const SystemSettingsPage = lazy(() => import('@/app/settings/SystemSettingsPage'));
const OptionsPage = lazy(() => import('@/app/settings/OptionsPage'));
const ProfilePage = lazy(() => import('@/app/profile/ProfilePage'));
// 客户门户页面（懒加载）
const PortalLogin = lazy(() => import('@/portal/auth/LoginPage'));
const PortalLayout = lazy(() => import('@/portal/layout/PortalLayout'));
const PortalProfilePage = lazy(() => import('@/portal/profile/ProfilePage'));
const PortalServicesPage = lazy(() => import('@/portal/services/ServicesPage'));
const PortalResourcesPage = lazy(() => import('@/portal/resources/ResourcesPage'));
export default function App() {
    return (_jsx(BrowserRouter, { children: _jsx(Suspense, { fallback: _jsx(LoadingSpinner, { fullScreen: true }), children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Navigate, { to: "/app/leads", replace: true }) }), _jsx(Route, { path: "/app/*", element: _jsx(CrmAuthProvider, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "login", element: _jsx(CrmLogin, {}) }), _jsxs(Route, { path: "*", element: _jsx(CrmGuard, { children: _jsx(CrmLayout, {}) }), children: [_jsx(Route, { path: "leads", element: _jsx(LeadsPage, {}) }), _jsx(Route, { path: "leads/:id", element: _jsx(LeadDetailPage, {}) }), _jsx(Route, { path: "clients", element: _jsx(ClientsPage, {}) }), _jsx(Route, { path: "clients/:id", element: _jsx(ClientDetailPage, {}) }), _jsx(Route, { path: "services", element: _jsx(ServicesPage, {}) }), _jsx(Route, { path: "partners", element: _jsx(PartnersPage, {}) }), _jsx(Route, { path: "activities", element: _jsx(ActivitiesPage, {}) }), _jsx(Route, { path: "users", element: _jsx(UsersPage, {}) }), _jsx(Route, { path: "settings", element: _jsx(SystemSettingsPage, {}) }), _jsx(Route, { path: "settings/options", element: _jsx(OptionsPage, {}) }), _jsx(Route, { path: "profile", element: _jsx(ProfilePage, {}) }), _jsx(Route, { index: true, element: _jsx(Navigate, { to: "leads", replace: true }) })] })] }) }) }), _jsx(Route, { path: "/portal/*", element: _jsx(PortalAuthProvider, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "login", element: _jsx(PortalLogin, {}) }), _jsxs(Route, { path: "*", element: _jsx(PortalGuard, { children: _jsx(PortalLayout, {}) }), children: [_jsx(Route, { path: "profile", element: _jsx(PortalProfilePage, {}) }), _jsx(Route, { path: "services", element: _jsx(PortalServicesPage, {}) }), _jsx(Route, { path: "resources", element: _jsx(PortalResourcesPage, {}) }), _jsx(Route, { index: true, element: _jsx(Navigate, { to: "profile", replace: true }) })] })] }) }) })] }) }) }));
}
