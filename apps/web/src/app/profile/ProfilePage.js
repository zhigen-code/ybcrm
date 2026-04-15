import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { crmApi } from '@/shared/utils/request';
import { useCrmAuth } from '@/app/auth/CrmAuthContext';
import { Input } from '@/shared/components/Input';
import { Button } from '@/shared/components/Button';
import { Modal } from '@/shared/components/Modal';
import { formatDate } from '@/shared/utils/format';
const TABS = [
    { key: 'info', label: '基本信息' },
    { key: 'password', label: '修改密码' },
    { key: 'api', label: 'API 接入' },
];
const nameSchema = z.object({
    name: z.string().min(1, '请填写姓名'),
});
const passwordSchema = z.object({
    currentPassword: z.string().min(1, '请输入当前密码'),
    newPassword: z.string().min(8, '新密码至少 8 位'),
    confirmPassword: z.string().min(1, '请确认新密码'),
}).refine((d) => d.newPassword === d.confirmPassword, {
    message: '两次密码不一致',
    path: ['confirmPassword'],
});
const apiKeySchema = z.object({
    name: z.string().min(1, '请填写用途说明').max(50),
});
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';
// ---- 基本信息 Tab ----
function InfoTab() {
    const { user, updateUser } = useCrmAuth();
    const [saved, setSaved] = useState(false);
    const form = useForm({
        resolver: zodResolver(nameSchema),
        defaultValues: { name: user?.name ?? '' },
    });
    const mutation = useMutation({
        mutationFn: (body) => crmApi.put('/auth/profile', body),
        onSuccess: (res) => {
            updateUser({ name: res.data.data.name });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        },
        onError: (err) => {
            const msg = err?.response?.data?.message ?? '操作失败';
            form.setError('name', { message: msg });
        },
    });
    return (_jsxs("div", { className: "rounded-lg border bg-white p-4 sm:p-6 max-w-lg", children: [_jsxs("div", { className: "mb-4 text-sm text-gray-500", children: ["\u90AE\u7BB1\uFF1A", _jsx("span", { className: "text-gray-700", children: user?.email }), _jsx("span", { className: "ml-3 text-gray-400", children: "\u00B7" }), _jsxs("span", { className: "ml-3", children: ["\u89D2\u8272\uFF1A", _jsx("span", { className: "text-gray-700", children: user?.role })] })] }), _jsxs("form", { onSubmit: form.handleSubmit((d) => mutation.mutate(d)), className: "space-y-3", children: [_jsx(Input, { label: "\u663E\u793A\u59D3\u540D", error: form.formState.errors.name?.message, ...form.register('name') }), _jsxs("div", { className: "flex items-center gap-3 pt-1", children: [_jsx(Button, { type: "submit", size: "sm", loading: mutation.isPending, children: "\u4FDD\u5B58\u59D3\u540D" }), saved && _jsx("span", { className: "text-sm text-green-600", children: "\u5DF2\u4FDD\u5B58" })] })] })] }));
}
// ---- 修改密码 Tab ----
function PasswordTab() {
    const [saved, setSaved] = useState(false);
    const form = useForm({ resolver: zodResolver(passwordSchema) });
    const mutation = useMutation({
        mutationFn: ({ currentPassword, newPassword }) => crmApi.put('/auth/profile', { currentPassword, newPassword }),
        onSuccess: () => {
            form.reset();
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        },
        onError: (err) => {
            const msg = err?.response?.data?.message ?? '操作失败';
            form.setError('currentPassword', { message: msg });
        },
    });
    return (_jsx("div", { className: "rounded-lg border bg-white p-4 sm:p-6 max-w-lg", children: _jsxs("form", { onSubmit: form.handleSubmit((d) => mutation.mutate(d)), className: "space-y-3", children: [_jsx(Input, { label: "\u5F53\u524D\u5BC6\u7801", type: "password", autoComplete: "current-password", error: form.formState.errors.currentPassword?.message, ...form.register('currentPassword') }), _jsx(Input, { label: "\u65B0\u5BC6\u7801", type: "password", autoComplete: "new-password", error: form.formState.errors.newPassword?.message, ...form.register('newPassword') }), _jsx(Input, { label: "\u786E\u8BA4\u65B0\u5BC6\u7801", type: "password", autoComplete: "new-password", error: form.formState.errors.confirmPassword?.message, ...form.register('confirmPassword') }), _jsxs("div", { className: "flex items-center gap-3 pt-1", children: [_jsx(Button, { type: "submit", size: "sm", loading: mutation.isPending, children: "\u4FEE\u6539\u5BC6\u7801" }), saved && _jsx("span", { className: "text-sm text-green-600", children: "\u5BC6\u7801\u5DF2\u4FEE\u6539" })] })] }) }));
}
// ---- API 接入 Tab ----
function ApiTab() {
    const queryClient = useQueryClient();
    const [showCreate, setShowCreate] = useState(false);
    const [newKey, setNewKey] = useState(null);
    const [copied, setCopied] = useState(false);
    const { data, isLoading } = useQuery({
        queryKey: ['api-keys'],
        queryFn: () => crmApi.get('/auth/api-keys').then((r) => r.data.data),
    });
    const form = useForm({ resolver: zodResolver(apiKeySchema) });
    const createMutation = useMutation({
        mutationFn: (body) => crmApi.post('/auth/api-keys', body),
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['api-keys'] });
            setShowCreate(false);
            form.reset();
            setNewKey(res.data.data.key);
        },
    });
    const deleteMutation = useMutation({
        mutationFn: (id) => crmApi.delete(`/auth/api-keys/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['api-keys'] }),
    });
    const copyKey = () => {
        if (!newKey)
            return;
        navigator.clipboard.writeText(newKey).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };
    const endpoint = `${API_BASE}/api/v1/leads`;
    return (_jsxs("div", { className: "space-y-4 max-w-2xl", children: [newKey && (_jsxs("div", { className: "rounded-lg border border-amber-300 bg-amber-50 p-4", children: [_jsx("p", { className: "text-sm font-medium text-amber-800 mb-2", children: "\u8BF7\u7ACB\u5373\u590D\u5236 API Key\uFF0C\u6B64\u540E\u4E0D\u518D\u663E\u793A" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("code", { className: "flex-1 break-all rounded bg-white border border-amber-200 px-3 py-2 text-sm font-mono text-gray-800", children: newKey }), _jsx(Button, { size: "sm", variant: "secondary", onClick: copyKey, children: copied ? '已复制' : '复制' })] }), _jsx("button", { className: "mt-2 text-xs text-amber-600 hover:text-amber-800 underline", onClick: () => setNewKey(null), children: "\u6211\u5DF2\u4FDD\u5B58\uFF0C\u5173\u95ED\u63D0\u793A" })] })), _jsxs("div", { className: "rounded-lg border bg-white overflow-hidden", children: [_jsxs("div", { className: "flex items-center justify-between px-4 py-3 border-b", children: [_jsx("h2", { className: "font-medium text-gray-900 text-sm", children: "API Keys" }), _jsx(Button, { size: "sm", onClick: () => setShowCreate(true), children: "\u751F\u6210\u65B0 Key" })] }), isLoading ? (_jsx("div", { className: "p-4 text-sm text-gray-400", children: "\u52A0\u8F7D\u4E2D..." })) : !data?.length ? (_jsx("div", { className: "p-4 text-sm text-gray-400", children: "\u6682\u65E0 API Key\uFF0C\u70B9\u51FB\u53F3\u4E0A\u89D2\u751F\u6210" })) : (_jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-gray-50 border-b", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-2 text-left font-medium text-gray-700", children: "\u7528\u9014" }), _jsx("th", { className: "px-4 py-2 text-left font-medium text-gray-700", children: "Key \u524D\u7F00" }), _jsx("th", { className: "px-4 py-2 text-left font-medium text-gray-700", children: "\u521B\u5EFA\u65F6\u95F4" }), _jsx("th", { className: "px-4 py-2 text-left font-medium text-gray-700", children: "\u6700\u540E\u4F7F\u7528" }), _jsx("th", { className: "px-4 py-2" })] }) }), _jsx("tbody", { className: "divide-y divide-gray-100", children: data.map((k) => (_jsxs("tr", { children: [_jsx("td", { className: "px-4 py-2.5 font-medium text-gray-900", children: k.name }), _jsxs("td", { className: "px-4 py-2.5 font-mono text-xs text-gray-500", children: [k.keyPrefix, "..."] }), _jsx("td", { className: "px-4 py-2.5 text-gray-500", children: formatDate(k.createdAt) }), _jsx("td", { className: "px-4 py-2.5 text-gray-500", children: k.lastUsedAt ? formatDate(k.lastUsedAt) : '从未' }), _jsx("td", { className: "px-4 py-2.5 text-right", children: _jsx("button", { onClick: () => { if (confirm(`确认吊销「${k.name}」？`))
                                                    deleteMutation.mutate(k.id); }, className: "text-xs text-red-500 hover:text-red-700", children: "\u540A\u9500" }) })] }, k.id))) })] }))] }), _jsxs("div", { className: "rounded-lg border bg-white p-4 sm:p-5", children: [_jsx("h2", { className: "font-medium text-gray-900 mb-3 text-sm", children: "\u63A5\u53E3\u8BF4\u660E" }), _jsxs("div", { className: "space-y-3 text-sm", children: [_jsxs("div", { children: [_jsx("p", { className: "text-gray-500 mb-1", children: "\u63D0\u4EA4\u65B0\u7EBF\u7D22" }), _jsxs("code", { className: "block rounded bg-gray-50 border px-3 py-2 text-xs font-mono text-gray-700", children: ["POST ", endpoint] })] }), _jsxs("div", { children: [_jsx("p", { className: "text-gray-500 mb-1", children: "\u8BF7\u6C42\u5934" }), _jsx("code", { className: "block rounded bg-gray-50 border px-3 py-2 text-xs font-mono text-gray-700 whitespace-pre", children: `Content-Type: application/json\nX-API-Key: <你的 API Key>` })] }), _jsxs("div", { children: [_jsx("p", { className: "text-gray-500 mb-1", children: "\u8BF7\u6C42\u4F53\uFF08JSON\uFF09" }), _jsx("code", { className: "block rounded bg-gray-50 border px-3 py-2 text-xs font-mono text-gray-700 whitespace-pre", children: `{\n  "source": "官网表单",\n  "name": "张三",\n  "contactInfo": "13800138000",\n  "intendedServices": ["赴美试管"],\n  "notes": "备注（可选）"\n}` })] }), _jsxs("div", { children: [_jsx("p", { className: "text-gray-500 mb-1", children: "cURL \u793A\u4F8B" }), _jsx("code", { className: "block rounded bg-gray-50 border px-3 py-2 text-xs font-mono text-gray-700 whitespace-pre", children: `curl -X POST ${endpoint} \\\n  -H "Content-Type: application/json" \\\n  -H "X-API-Key: crm_your_key_here" \\\n  -d '{"source":"官网","name":"张三","contactInfo":"138xxxx","intendedServices":["赴美试管"]}'` })] }), _jsxs("div", { children: [_jsx("p", { className: "text-gray-500 mb-1", children: "\u6210\u529F\u54CD\u5E94\uFF08201\uFF09" }), _jsx("code", { className: "block rounded bg-gray-50 border px-3 py-2 text-xs font-mono text-gray-700", children: `{ "data": { "id": "uuid", "status": "New" } }` })] })] })] }), showCreate && (_jsx(Modal, { title: "\u751F\u6210 API Key", onClose: () => { setShowCreate(false); form.reset(); }, footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", onClick: () => { setShowCreate(false); form.reset(); }, children: "\u53D6\u6D88" }), _jsx(Button, { loading: createMutation.isPending, onClick: form.handleSubmit((d) => createMutation.mutate(d)), children: "\u751F\u6210" })] }), children: _jsx(Input, { label: "\u7528\u9014\u8BF4\u660E", placeholder: "\u5982\uFF1A\u5B98\u7F51\u8868\u5355\u3001\u5C0F\u7A0B\u5E8F\u63A5\u5165", error: form.formState.errors.name?.message, ...form.register('name') }) }))] }));
}
// ---- 主页面 ----
export default function ProfilePage() {
    const [activeTab, setActiveTab] = useState('info');
    return (_jsxs("div", { className: "p-4 sm:p-6", children: [_jsxs("div", { className: "mb-6", children: [_jsx("h1", { className: "text-lg sm:text-xl font-semibold text-gray-900", children: "\u4E2A\u4EBA\u8BBE\u7F6E" }), _jsx("p", { className: "mt-0.5 text-sm text-gray-500", children: "\u7BA1\u7406\u8D26\u53F7\u4FE1\u606F\u548C API \u63A5\u5165\u914D\u7F6E" })] }), _jsx("div", { className: "mb-4 flex gap-1 border-b", children: TABS.map((t) => (_jsx("button", { type: "button", onClick: () => setActiveTab(t.key), className: `px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${activeTab === t.key
                        ? 'border-primary-600 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'}`, children: t.label }, t.key))) }), activeTab === 'info' && _jsx(InfoTab, {}), activeTab === 'password' && _jsx(PasswordTab, {}), activeTab === 'api' && _jsx(ApiTab, {})] }));
}
