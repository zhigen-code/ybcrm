import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import { crmApi } from '@/shared/utils/request';
import { Input } from '@/shared/components/Input';
import { Button } from '@/shared/components/Button';
import { Select } from '@/shared/components/Select';
import { Modal } from '@/shared/components/Modal';
const RULE_DESCRIPTIONS = {
    round_robin: '按顺序轮流分配给每位销售人员',
    load_balance: '分配给当前线索数最少的销售人员',
    skill_match: '优先分配给专长与线索意向服务匹配的销售人员',
    region_match: '优先分配给所在区域与线索来源地区匹配的销售人员',
};
const schema = z.object({
    system_name: z.string().min(1, '请填写系统名称'),
    smtp_host: z.string(),
    smtp_port: z.string(),
    smtp_secure: z.string(),
    smtp_user: z.string(),
    smtp_password: z.string(),
    smtp_from_email: z.string(),
    smtp_from_name: z.string(),
});
const TABS = [
    { key: 'basic', label: '基本配置' },
    { key: 'smtp', label: '邮件服务器' },
    { key: 'teams', label: '团队管理' },
    { key: 'assignment', label: '自动分配' },
];
const teamSchema = z.object({
    name: z.string().min(1, '请填写团队名称'),
    region: z.string().optional(),
});
export default function SystemSettingsPage() {
    const queryClient = useQueryClient();
    const [saved, setSaved] = useState(false);
    const [activeTab, setActiveTab] = useState('basic');
    const [editTarget, setEditTarget] = useState(null);
    const [showAdd, setShowAdd] = useState(false);
    // 团队列表
    const { data: teams, isLoading: teamsLoading } = useQuery({
        queryKey: ['teams'],
        queryFn: () => crmApi.get('/teams').then((r) => r.data.data),
        enabled: activeTab === 'teams',
    });
    const teamForm = useForm({ resolver: zodResolver(teamSchema) });
    const addForm = useForm({ resolver: zodResolver(teamSchema) });
    const invalidateTeams = () => queryClient.invalidateQueries({ queryKey: ['teams'] });
    const updateTeam = useMutation({
        mutationFn: ({ id, ...body }) => crmApi.put(`/teams/${id}`, body),
        onSuccess: () => { setEditTarget(null); invalidateTeams(); },
    });
    const addTeam = useMutation({
        mutationFn: (body) => crmApi.post('/teams', body),
        onSuccess: () => { setShowAdd(false); addForm.reset(); invalidateTeams(); },
    });
    const deleteTeam = useMutation({
        mutationFn: (id) => crmApi.delete(`/teams/${id}`),
        onSuccess: invalidateTeams,
    });
    const openEdit = (team) => {
        setEditTarget(team);
        teamForm.reset({ name: team.name, region: team.region ?? '' });
    };
    // 分配规则
    const { data: rules, isLoading: rulesLoading } = useQuery({
        queryKey: ['assignment-rules'],
        queryFn: () => crmApi.get('/admin/assignment-rules').then((r) => r.data.data),
        enabled: activeTab === 'assignment',
    });
    const updateRule = useMutation({
        mutationFn: ({ id, ...body }) => crmApi.put(`/admin/assignment-rules/${id}`, body),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assignment-rules'] }),
    });
    const toggleAutoAssign = useMutation({
        mutationFn: (enabled) => crmApi.put('/admin/settings', { auto_assign_enabled: enabled ? 'true' : 'false' }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['system-settings'] }),
    });
    const { data, isLoading } = useQuery({
        queryKey: ['system-settings'],
        queryFn: () => crmApi.get('/admin/settings').then((r) => r.data.data),
    });
    const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            system_name: '', smtp_host: '', smtp_port: '465',
            smtp_secure: 'true', smtp_user: '', smtp_password: '', smtp_from_email: '', smtp_from_name: '',
        },
    });
    useEffect(() => {
        if (data)
            reset(data);
    }, [data, reset]);
    const saveMutation = useMutation({
        mutationFn: (body) => crmApi.put('/admin/settings', body),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['system-settings'] });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        },
    });
    if (isLoading)
        return _jsx("div", { className: "p-6 text-sm text-gray-500", children: "\u52A0\u8F7D\u4E2D..." });
    return (_jsxs("div", { className: "p-4 sm:p-6", children: [_jsxs("div", { className: "mb-6", children: [_jsx("h1", { className: "text-lg sm:text-xl font-semibold text-gray-900", children: "\u7CFB\u7EDF\u7BA1\u7406" }), _jsx("p", { className: "mt-0.5 text-sm text-gray-500", children: "\u914D\u7F6E\u7CFB\u7EDF\u57FA\u672C\u4FE1\u606F\u548C\u670D\u52A1\u53C2\u6570" })] }), _jsx("div", { className: "mb-4 flex gap-1 border-b", children: TABS.map((t) => (_jsx("button", { type: "button", onClick: () => setActiveTab(t.key), className: `px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${activeTab === t.key
                        ? 'border-primary-600 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'}`, children: t.label }, t.key))) }), _jsx("form", { onSubmit: handleSubmit((d) => saveMutation.mutate(d)), children: _jsxs("div", { className: "max-w-2xl", children: [activeTab === 'basic' && (_jsx("div", { className: "rounded-lg border bg-white p-4 sm:p-6", children: _jsx("div", { className: "space-y-3", children: _jsx(Input, { label: "\u7CFB\u7EDF\u540D\u79F0", error: errors.system_name?.message, ...register('system_name') }) }) })), activeTab === 'smtp' && (_jsxs("div", { className: "rounded-lg border bg-white p-4 sm:p-6", children: [_jsx("p", { className: "text-xs text-gray-500 mb-4", children: "\u7528\u4E8E\u53D1\u9001\u901A\u77E5\u90AE\u4EF6\u3001\u9B54\u6CD5\u94FE\u63A5\u7B49\u7CFB\u7EDF\u90AE\u4EF6" }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-3", children: [_jsx("div", { className: "sm:col-span-2", children: _jsx(Input, { label: "SMTP \u670D\u52A1\u5668", placeholder: "smtp.example.com", ...register('smtp_host') }) }), _jsx(Input, { label: "\u7AEF\u53E3", placeholder: "465", ...register('smtp_port') })] }), _jsx(Select, { label: "\u52A0\u5BC6\u65B9\u5F0F", options: [
                                                { value: 'true', label: 'SSL/TLS（推荐）' },
                                                { value: 'false', label: '不加密' },
                                            ], ...register('smtp_secure') }), _jsx(Input, { label: "\u8D26\u53F7\uFF08\u7528\u6237\u540D\uFF09", placeholder: "your@email.com", ...register('smtp_user') }), _jsx(Input, { label: "\u5BC6\u7801 / \u6388\u6743\u7801", type: "password", autoComplete: "new-password", placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", ...register('smtp_password') }), _jsx(Input, { label: "\u53D1\u4EF6\u4EBA\u90AE\u7BB1", placeholder: "noreply@example.com", ...register('smtp_from_email') }), _jsx(Input, { label: "\u53D1\u4EF6\u4EBA\u540D\u79F0", placeholder: "\u8F85\u52A9\u751F\u6B96 CRM", ...register('smtp_from_name') })] })] })), activeTab !== 'teams' && activeTab !== 'assignment' && (_jsxs("div", { className: "flex items-center gap-3 mt-4", children: [_jsx(Button, { type: "submit", loading: isSubmitting || saveMutation.isPending, children: "\u4FDD\u5B58\u8BBE\u7F6E" }), saved && _jsx("span", { className: "text-sm text-green-600", children: "\u5DF2\u4FDD\u5B58" })] }))] }) }), activeTab === 'teams' && (_jsxs("div", { className: "max-w-2xl", children: [_jsxs("div", { className: "rounded-lg border bg-white overflow-hidden", children: [_jsxs("div", { className: "flex items-center justify-between px-4 py-3 border-b bg-gray-50", children: [_jsx("span", { className: "text-sm font-medium text-gray-700", children: "\u56E2\u961F\u5217\u8868" }), _jsx(Button, { size: "sm", onClick: () => { setShowAdd(true); addForm.reset(); }, children: "+ \u65B0\u5EFA\u56E2\u961F" })] }), teamsLoading ? (_jsx("div", { className: "py-8 text-center text-sm text-gray-400", children: "\u52A0\u8F7D\u4E2D..." })) : !teams?.length ? (_jsx("div", { className: "py-8 text-center text-sm text-gray-400", children: "\u6682\u65E0\u56E2\u961F" })) : (_jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-gray-50 border-b", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "\u56E2\u961F\u540D\u79F0" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "\u533A\u57DF" }), _jsx("th", { className: "px-4 py-3" })] }) }), _jsx("tbody", { className: "divide-y divide-gray-100", children: teams.map((team) => (_jsxs("tr", { children: [_jsx("td", { className: "px-4 py-3 font-medium text-gray-900", children: team.name }), _jsx("td", { className: "px-4 py-3 text-gray-500", children: team.region ?? '—' }), _jsx("td", { className: "px-4 py-3", children: _jsxs("div", { className: "flex items-center gap-2 justify-end", children: [_jsx("button", { onClick: () => openEdit(team), className: "text-xs text-primary-600 hover:text-primary-800", children: "\u7F16\u8F91" }), _jsx("span", { className: "text-gray-300", children: "|" }), _jsx("button", { onClick: () => {
                                                                    if (confirm(`确认删除团队「${team.name}」？成员将被移出该团队。`)) {
                                                                        deleteTeam.mutate(team.id);
                                                                    }
                                                                }, className: "text-xs text-red-500 hover:text-red-700", children: "\u5220\u9664" })] }) })] }, team.id))) })] }))] }), editTarget && (_jsx(Modal, { title: `编辑团队：${editTarget.name}`, onClose: () => setEditTarget(null), footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", onClick: () => setEditTarget(null), children: "\u53D6\u6D88" }), _jsx(Button, { loading: updateTeam.isPending, onClick: teamForm.handleSubmit((d) => updateTeam.mutate({ id: editTarget.id, ...d })), children: "\u4FDD\u5B58" })] }), children: _jsxs("div", { className: "space-y-3", children: [_jsx(Input, { label: "\u56E2\u961F\u540D\u79F0", error: teamForm.formState.errors.name?.message, ...teamForm.register('name') }), _jsx(Input, { label: "\u533A\u57DF\uFF08\u53EF\u9009\uFF09", placeholder: "\u5982\uFF1A\u534E\u4E1C\u3001\u5317\u4EAC", ...teamForm.register('region') })] }) })), showAdd && (_jsx(Modal, { title: "\u65B0\u5EFA\u56E2\u961F", onClose: () => { setShowAdd(false); addForm.reset(); }, footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", onClick: () => { setShowAdd(false); addForm.reset(); }, children: "\u53D6\u6D88" }), _jsx(Button, { loading: addTeam.isPending, onClick: addForm.handleSubmit((d) => addTeam.mutate(d)), children: "\u521B\u5EFA" })] }), children: _jsxs("div", { className: "space-y-3", children: [_jsx(Input, { label: "\u56E2\u961F\u540D\u79F0", error: addForm.formState.errors.name?.message, ...addForm.register('name') }), _jsx(Input, { label: "\u533A\u57DF\uFF08\u53EF\u9009\uFF09", placeholder: "\u5982\uFF1A\u534E\u4E1C\u3001\u5317\u4EAC", ...addForm.register('region') })] }) }))] })), activeTab === 'assignment' && (_jsxs("div", { className: "max-w-2xl space-y-4", children: [_jsx("div", { className: "rounded-lg border bg-white p-4 sm:p-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-900", children: "\u81EA\u52A8\u5206\u914D\u5F00\u5173" }), _jsx("p", { className: "mt-0.5 text-xs text-gray-500", children: "\u5F00\u542F\u540E\uFF0C\u65B0\u5EFA\u7EBF\u7D22\u5C06\u6839\u636E\u4E0B\u65B9\u89C4\u5219\u81EA\u52A8\u5206\u914D\u7ED9\u9500\u552E\u4EBA\u5458" })] }), _jsx("button", { type: "button", onClick: () => {
                                        const current = data?.auto_assign_enabled !== 'false';
                                        toggleAutoAssign.mutate(!current);
                                    }, disabled: toggleAutoAssign.isPending, className: `relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${data?.auto_assign_enabled !== 'false' ? 'bg-primary-600' : 'bg-gray-200'}`, children: _jsx("span", { className: `inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 ease-in-out ${data?.auto_assign_enabled !== 'false' ? 'translate-x-5' : 'translate-x-0'}` }) })] }) }), _jsxs("div", { className: "rounded-lg border bg-white overflow-hidden", children: [_jsxs("div", { className: "px-4 py-3 border-b bg-gray-50", children: [_jsx("p", { className: "text-sm font-medium text-gray-700", children: "\u5206\u914D\u89C4\u5219" }), _jsx("p", { className: "mt-0.5 text-xs text-gray-500", children: "\u89C4\u5219\u6309\u4F18\u5148\u7EA7\u987A\u5E8F\u4F9D\u6B21\u5C1D\u8BD5\uFF0C\u7B2C\u4E00\u4E2A\u5339\u914D\u6210\u529F\u7684\u89C4\u5219\u751F\u6548" })] }), rulesLoading ? (_jsx("div", { className: "py-8 text-center text-sm text-gray-400", children: "\u52A0\u8F7D\u4E2D..." })) : !rules?.length ? (_jsx("div", { className: "py-8 text-center text-sm text-gray-400", children: "\u6682\u65E0\u89C4\u5219" })) : (_jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-gray-50 border-b", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700 w-8", children: "\u4F18\u5148\u7EA7" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "\u89C4\u5219\u540D\u79F0" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "\u8BF4\u660E" }), _jsx("th", { className: "px-4 py-3 text-center font-medium text-gray-700", children: "\u542F\u7528" }), _jsx("th", { className: "px-4 py-3 text-center font-medium text-gray-700", children: "\u8C03\u6574\u987A\u5E8F" })] }) }), _jsx("tbody", { className: "divide-y divide-gray-100", children: [...rules].sort((a, b) => a.priority - b.priority).map((rule, idx, arr) => (_jsxs("tr", { className: rule.isActive ? '' : 'opacity-50', children: [_jsx("td", { className: "px-4 py-3 text-center text-gray-400 text-xs", children: rule.priority }), _jsx("td", { className: "px-4 py-3 font-medium text-gray-900", children: rule.ruleTypeLabel }), _jsx("td", { className: "px-4 py-3 text-gray-500 text-xs", children: RULE_DESCRIPTIONS[rule.ruleType] ?? '—' }), _jsx("td", { className: "px-4 py-3 text-center", children: _jsx("button", { type: "button", onClick: () => updateRule.mutate({ id: rule.id, isActive: rule.isActive === 0 }), className: `relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${rule.isActive ? 'bg-primary-600' : 'bg-gray-200'}`, children: _jsx("span", { className: `inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${rule.isActive ? 'translate-x-4' : 'translate-x-0'}` }) }) }), _jsx("td", { className: "px-4 py-3", children: _jsxs("div", { className: "flex items-center justify-center gap-1", children: [_jsx("button", { type: "button", disabled: idx === 0, onClick: () => {
                                                                    const prev = arr[idx - 1];
                                                                    updateRule.mutate({ id: rule.id, priority: prev.priority });
                                                                    updateRule.mutate({ id: prev.id, priority: rule.priority });
                                                                }, className: "p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed", title: "\u4E0A\u79FB", children: "\u2191" }), _jsx("button", { type: "button", disabled: idx === arr.length - 1, onClick: () => {
                                                                    const next = arr[idx + 1];
                                                                    updateRule.mutate({ id: rule.id, priority: next.priority });
                                                                    updateRule.mutate({ id: next.id, priority: rule.priority });
                                                                }, className: "p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed", title: "\u4E0B\u79FB", children: "\u2193" })] }) })] }, rule.id))) })] }))] })] }))] }));
}
