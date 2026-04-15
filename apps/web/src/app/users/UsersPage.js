import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { crmApi } from '@/shared/utils/request';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Select } from '@/shared/components/Select';
import { Modal } from '@/shared/components/Modal';
import { Badge } from '@/shared/components/Badge';
const roleBadge = {
    admin: 'red', operations: 'blue', sales: 'green',
};
const roleLabel = {
    admin: '管理员', operations: '运营', sales: '销售',
};
const registerSchema = z.object({
    email: z.string().email('请输入有效邮箱'),
    password: z.string().min(8, '密码至少 8 位'),
    name: z.string().min(1, '请填写姓名'),
    role: z.enum(['admin', 'operations', 'sales']),
    teamId: z.string().optional(),
});
const editSchema = z.object({
    name: z.string().min(1, '请填写姓名'),
    role: z.enum(['admin', 'operations', 'sales']),
    teamId: z.string().optional(),
    capacity: z.coerce.number().int().min(1).max(100),
    specialization: z.array(z.string()),
});
const resetPasswordSchema = z.object({
    newPassword: z.string().min(8, '密码至少 8 位'),
    confirmPassword: z.string().min(1, '请确认密码'),
}).refine((d) => d.newPassword === d.confirmPassword, {
    message: '两次密码不一致',
    path: ['confirmPassword'],
});
function parseSpecialization(val) {
    if (Array.isArray(val))
        return val;
    if (typeof val === 'string') {
        try {
            return JSON.parse(val);
        }
        catch { /* ignore */ }
    }
    return [];
}
export default function UsersPage() {
    const queryClient = useQueryClient();
    const [showRegister, setShowRegister] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [resetTarget, setResetTarget] = useState(null);
    const { data: users, isLoading } = useQuery({
        queryKey: ['users'],
        queryFn: () => crmApi.get('/users').then((r) => r.data),
    });
    const { data: teams } = useQuery({
        queryKey: ['teams'],
        queryFn: () => crmApi.get('/teams').then((r) => r.data),
    });
    const { data: servicesResp } = useQuery({
        queryKey: ['services'],
        queryFn: () => crmApi.get('/services').then((r) => r.data),
    });
    const serviceNames = (servicesResp?.data ?? []).map((s) => s.name);
    const teamOptions = [
        { value: '', label: '无团队' },
        ...((teams?.data ?? []).map((t) => ({ value: t.id, label: t.name }))),
    ];
    const registerForm = useForm({ resolver: zodResolver(registerSchema) });
    const editForm = useForm({ resolver: zodResolver(editSchema) });
    const resetPasswordForm = useForm({ resolver: zodResolver(resetPasswordSchema) });
    const openEdit = (u) => {
        editForm.reset({
            name: u.name,
            role: u.role,
            teamId: u.teamId ?? '',
            capacity: u.capacity,
            specialization: parseSpecialization(u.specialization),
        });
        setEditTarget(u);
    };
    const openResetPassword = (u) => {
        resetPasswordForm.reset();
        setResetTarget(u);
    };
    const registerMutation = useMutation({
        mutationFn: (body) => crmApi.post('/auth/register', { ...body, teamId: body.teamId || null }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setShowRegister(false);
            registerForm.reset();
        },
        onError: (err) => {
            const msg = err?.response?.data?.message ?? '创建失败';
            registerForm.setError('email', { message: msg });
        },
    });
    const editMutation = useMutation({
        mutationFn: (body) => crmApi.put(`/users/${editTarget.id}`, { ...body, teamId: body.teamId || null }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setEditTarget(null);
        },
        onError: (err) => {
            const msg = err?.response?.data?.message ?? '保存失败';
            editForm.setError('name', { message: msg });
        },
    });
    const resetPasswordMutation = useMutation({
        mutationFn: ({ newPassword }) => crmApi.put(`/users/${resetTarget.id}/password`, { newPassword }),
        onSuccess: () => {
            setResetTarget(null);
            resetPasswordForm.reset();
        },
        onError: (err) => {
            const msg = err?.response?.data?.message ?? '重置失败';
            resetPasswordForm.setError('newPassword', { message: msg });
        },
    });
    return (_jsxs("div", { className: "p-4 sm:p-6", children: [_jsxs("div", { className: "mb-4 sm:mb-6 flex items-center justify-between", children: [_jsx("h1", { className: "text-xl font-semibold text-gray-900", children: "\u7528\u6237\u7BA1\u7406" }), _jsx(Button, { onClick: () => setShowRegister(true), children: "\u65B0\u5EFA\u7528\u6237" })] }), isLoading ? (_jsx("div", { className: "py-12 text-center text-sm text-gray-500", children: "\u52A0\u8F7D\u4E2D..." })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "space-y-3 sm:hidden", children: (users?.data ?? []).map((user) => (_jsxs("div", { className: "rounded-lg border bg-white p-4", children: [_jsxs("div", { className: "flex items-start justify-between gap-2 mb-2", children: [_jsxs("div", { children: [_jsx("p", { className: "font-medium text-gray-900", children: user.name }), _jsx("p", { className: "text-xs text-gray-500 mt-0.5", children: user.email })] }), _jsx(Badge, { variant: roleBadge[user.role], children: roleLabel[user.role] })] }), _jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx("span", { className: "text-xs text-gray-500 shrink-0", children: "\u7EBF\u7D22\u5BB9\u91CF" }), _jsx("div", { className: "flex-1 h-1.5 rounded-full bg-gray-200", children: _jsx("div", { className: "h-full rounded-full bg-primary-500", style: { width: `${Math.min(100, (user.currentLeadsCount / user.capacity) * 100)}%` } }) }), _jsxs("span", { className: "text-xs text-gray-600 shrink-0", children: [user.currentLeadsCount, "/", user.capacity] })] }), (() => {
                                    const specs = parseSpecialization(user.specialization);
                                    return specs.length > 0 ? (_jsx("div", { className: "flex flex-wrap gap-1 mb-3", children: specs.map((s) => (_jsx(Badge, { variant: "blue", children: s }, s))) })) : (_jsx("p", { className: "text-xs text-gray-400 mb-3", children: "\u4E13\u957F\u672A\u8BBE\u7F6E" }));
                                })(), _jsxs("div", { className: "flex gap-2 border-t pt-3", children: [_jsx(Button, { variant: "ghost", size: "sm", onClick: () => openEdit(user), children: "\u7F16\u8F91" }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => openResetPassword(user), children: "\u91CD\u7F6E\u5BC6\u7801" })] })] }, user.id))) }), _jsx("div", { className: "hidden sm:block rounded-lg border bg-white overflow-hidden", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-gray-50 border-b", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "\u59D3\u540D" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "\u90AE\u7BB1" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "\u89D2\u8272" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "\u4E13\u957F\u670D\u52A1" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "\u5F53\u524D\u7EBF\u7D22 / \u5BB9\u91CF" }), _jsx("th", { className: "px-4 py-3" })] }) }), _jsx("tbody", { className: "divide-y divide-gray-100", children: (users?.data ?? []).map((user) => (_jsxs("tr", { className: "hover:bg-gray-50", children: [_jsx("td", { className: "px-4 py-3 font-medium text-gray-900", children: user.name }), _jsx("td", { className: "px-4 py-3 text-gray-500", children: user.email }), _jsx("td", { className: "px-4 py-3", children: _jsx(Badge, { variant: roleBadge[user.role], children: roleLabel[user.role] }) }), _jsx("td", { className: "px-4 py-3", children: (() => {
                                                    const specs = parseSpecialization(user.specialization);
                                                    return specs.length > 0 ? (_jsx("div", { className: "flex flex-wrap gap-1", children: specs.map((s) => (_jsx(Badge, { variant: "blue", children: s }, s))) })) : (_jsx("span", { className: "text-xs text-gray-400", children: "\u672A\u8BBE\u7F6E" }));
                                                })() }), _jsx("td", { className: "px-4 py-3 text-gray-600", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "flex-1 h-1.5 rounded-full bg-gray-200 max-w-[80px]", children: _jsx("div", { className: "h-full rounded-full bg-primary-500", style: { width: `${Math.min(100, (user.currentLeadsCount / user.capacity) * 100)}%` } }) }), _jsxs("span", { className: "text-xs", children: [user.currentLeadsCount, "/", user.capacity] })] }) }), _jsx("td", { className: "px-4 py-3", children: _jsxs("div", { className: "flex items-center gap-2 justify-end", children: [_jsx(Button, { variant: "ghost", size: "sm", onClick: () => openEdit(user), children: "\u7F16\u8F91" }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => openResetPassword(user), children: "\u91CD\u7F6E\u5BC6\u7801" })] }) })] }, user.id))) })] }) })] })), showRegister && (_jsx(Modal, { title: "\u65B0\u5EFA\u7528\u6237", onClose: () => setShowRegister(false), footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", onClick: () => setShowRegister(false), children: "\u53D6\u6D88" }), _jsx(Button, { loading: registerMutation.isPending, onClick: registerForm.handleSubmit((d) => registerMutation.mutate(d)), children: "\u521B\u5EFA" })] }), children: _jsxs("div", { className: "space-y-3", children: [_jsx(Input, { label: "\u59D3\u540D", error: registerForm.formState.errors.name?.message, ...registerForm.register('name') }), _jsx(Input, { label: "\u90AE\u7BB1", type: "email", error: registerForm.formState.errors.email?.message, ...registerForm.register('email') }), _jsx(Input, { label: "\u521D\u59CB\u5BC6\u7801", type: "password", error: registerForm.formState.errors.password?.message, ...registerForm.register('password') }), _jsx(Select, { label: "\u89D2\u8272", options: [
                                { value: 'admin', label: '管理员' },
                                { value: 'operations', label: '运营' },
                                { value: 'sales', label: '销售' },
                            ], ...registerForm.register('role') }), _jsx(Select, { label: "\u6240\u5C5E\u56E2\u961F", options: teamOptions, ...registerForm.register('teamId') })] }) })), editTarget && (_jsx(Modal, { title: `编辑用户 · ${editTarget.name}`, onClose: () => setEditTarget(null), footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", onClick: () => setEditTarget(null), children: "\u53D6\u6D88" }), _jsx(Button, { loading: editMutation.isPending, onClick: editForm.handleSubmit((d) => editMutation.mutate(d)), children: "\u4FDD\u5B58" })] }), children: _jsxs("div", { className: "space-y-3", children: [_jsx(Input, { label: "\u59D3\u540D", error: editForm.formState.errors.name?.message, ...editForm.register('name') }), _jsx(Select, { label: "\u89D2\u8272", options: [
                                { value: 'admin', label: '管理员' },
                                { value: 'operations', label: '运营' },
                                { value: 'sales', label: '销售' },
                            ], ...editForm.register('role') }), _jsx(Select, { label: "\u6240\u5C5E\u56E2\u961F", options: teamOptions, ...editForm.register('teamId') }), _jsx(Input, { label: "\u7EBF\u7D22\u5BB9\u91CF", type: "number", ...editForm.register('capacity') }), _jsxs("div", { children: [_jsxs("p", { className: "mb-1.5 text-sm font-medium text-gray-700", children: ["\u4E13\u957F\u670D\u52A1", _jsx("span", { className: "ml-1 text-xs font-normal text-gray-400", children: "\uFF08\u7528\u4E8E\u4E13\u957F\u5339\u914D\u81EA\u52A8\u5206\u914D\uFF09" })] }), serviceNames.length === 0 ? (_jsx("p", { className: "text-xs text-gray-400", children: "\u8BF7\u5148\u5728\u670D\u52A1\u7BA1\u7406\u4E2D\u521B\u5EFA\u670D\u52A1" })) : (_jsx("div", { className: "flex flex-wrap gap-2", children: serviceNames.map((name) => {
                                        const cur = editForm.watch('specialization');
                                        const selected = Array.isArray(cur) && cur.includes(name);
                                        return (_jsx("button", { type: "button", onClick: () => {
                                                const cur = editForm.getValues('specialization');
                                                const curArr = Array.isArray(cur) ? cur : [];
                                                editForm.setValue('specialization', selected ? curArr.filter((s) => s !== name) : [...curArr, name]);
                                            }, className: `rounded-full px-3 py-1 text-sm font-medium border transition-colors ${selected
                                                ? 'bg-primary-600 text-white border-primary-600'
                                                : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400'}`, children: name }, name));
                                    }) }))] })] }) })), resetTarget && (_jsx(Modal, { title: `重置密码 · ${resetTarget.name}`, onClose: () => setResetTarget(null), footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", onClick: () => setResetTarget(null), children: "\u53D6\u6D88" }), _jsx(Button, { loading: resetPasswordMutation.isPending, onClick: resetPasswordForm.handleSubmit((d) => resetPasswordMutation.mutate(d)), children: "\u786E\u8BA4\u91CD\u7F6E" })] }), children: _jsxs("div", { className: "space-y-3", children: [_jsxs("p", { className: "text-sm text-gray-500", children: ["\u4E3A ", _jsx("span", { className: "font-medium text-gray-700", children: resetTarget.name }), " \u8BBE\u7F6E\u65B0\u5BC6\u7801\uFF0C\u8BE5\u7528\u6237\u4E0B\u6B21\u767B\u5F55\u9700\u4F7F\u7528\u65B0\u5BC6\u7801\u3002"] }), _jsx(Input, { label: "\u65B0\u5BC6\u7801", type: "password", autoComplete: "new-password", error: resetPasswordForm.formState.errors.newPassword?.message, ...resetPasswordForm.register('newPassword') }), _jsx(Input, { label: "\u786E\u8BA4\u65B0\u5BC6\u7801", type: "password", autoComplete: "new-password", error: resetPasswordForm.formState.errors.confirmPassword?.message, ...resetPasswordForm.register('confirmPassword') })] }) }))] }));
}
