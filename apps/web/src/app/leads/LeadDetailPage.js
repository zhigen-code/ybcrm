import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { crmApi } from '@/shared/utils/request';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { formatDate } from '@/shared/utils/format';
import { useOptionGroup, getOptionLabel } from '@/shared/hooks/useOptions';
import { ActivityModal } from '@/shared/components/ActivityModal';
import { useCrmAuth } from '@/app/auth/CrmAuthContext';
import { useState } from 'react';
export default function LeadDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user: me } = useCrmAuth();
    const [showActivity, setShowActivity] = useState(false);
    const [assigningUserId, setAssigningUserId] = useState(undefined);
    const canAssign = me?.role === 'admin' || me?.role === 'operations';
    const { options: leadStatusOpts } = useOptionGroup('lead_status');
    const { options: activityTypeOpts } = useOptionGroup('activity_type');
    const { data: lead } = useQuery({
        queryKey: ['lead', id],
        queryFn: () => crmApi.get(`/leads/${id}`).then((r) => r.data.data),
    });
    const { data: activities } = useQuery({
        queryKey: ['activities', 'lead', id],
        queryFn: () => crmApi.get('/activities', { params: { leadId: id } }).then((r) => r.data.data),
    });
    // 用于分配负责人的用户列表（仅 sales 角色）
    const { data: usersData } = useQuery({
        queryKey: ['users-sales'],
        queryFn: () => crmApi.get('/users').then((r) => r.data.data.filter((u) => u.role === 'sales')),
        enabled: canAssign,
    });
    const salesUsers = usersData ?? [];
    const updateStatus = useMutation({
        mutationFn: (status) => crmApi.put(`/leads/${id}`, { status }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lead', id] }),
    });
    const assignLead = useMutation({
        mutationFn: (assignedToUserId) => crmApi.put(`/leads/${id}`, { assignedToUserId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lead', id] });
            queryClient.invalidateQueries({ queryKey: ['leads'] });
            setAssigningUserId(undefined);
        },
    });
    const convertToClient = useMutation({
        mutationFn: () => crmApi.post('/clients', {
            leadId: id,
            name: lead?.name,
            phone: lead?.contactInfo,
            servicePlans: lead?.intendedServices ?? [],
            assignedSalesUserId: lead?.assignedToUserId,
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leads'] });
            navigate('/app/clients');
        },
    });
    const downloadFile = async (key, name) => {
        const res = await crmApi.get('/upload/file', { params: { key }, responseType: 'blob' });
        const url = URL.createObjectURL(res.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
    };
    const addActivity = useMutation({
        mutationFn: (body) => crmApi.post('/activities', { ...body, leadId: id }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['activities', 'lead', id] });
            setShowActivity(false);
        },
    });
    if (!lead)
        return _jsx("div", { className: "p-6 text-sm text-gray-500", children: "\u52A0\u8F7D\u4E2D..." });
    // 判断是否正在编辑分配：undefined=未进入编辑，null=选择"取消分配"，string=选择了某用户
    const isEditingAssign = assigningUserId !== undefined;
    return (_jsxs("div", { className: "p-4 sm:p-6 max-w-3xl", children: [_jsx("button", { onClick: () => navigate(-1), className: "mb-4 text-sm text-gray-500 hover:text-gray-700", children: "\u2190 \u8FD4\u56DE" }), _jsxs("div", { className: "rounded-lg border bg-white p-4 sm:p-6 mb-4 sm:mb-6", children: [_jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-xl font-semibold text-gray-900", children: lead.name }), _jsxs("p", { className: "mt-1 text-sm text-gray-500", children: [lead.contactInfo, " \u00B7 ", lead.source] })] }), _jsx("div", { className: "flex flex-wrap gap-1", children: (lead.intendedServices ?? []).map((svc) => (_jsx(Badge, { children: svc }, svc))) })] }), _jsxs("div", { className: "mt-4 flex flex-wrap items-center gap-2", children: [_jsx("span", { className: "text-sm text-gray-600", children: "\u72B6\u6001\uFF1A" }), _jsx("div", { className: "flex flex-wrap gap-1.5", children: leadStatusOpts.filter((o) => o.value !== 'Converted').map((o) => (_jsx("button", { onClick: () => updateStatus.mutate(o.value), className: `rounded-full px-3 py-1 text-xs font-medium transition-colors ${lead.status === o.value
                                        ? 'bg-primary-600 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`, children: o.label }, o.value))) })] }), _jsxs("div", { className: "mt-4 flex flex-wrap items-center gap-2", children: [_jsx("span", { className: "text-sm text-gray-600", children: "\u8D1F\u8D23\u4EBA\uFF1A" }), !isEditingAssign ? (_jsxs(_Fragment, { children: [_jsx("span", { className: `text-sm ${lead.assignedToName ? 'font-medium text-gray-900' : 'text-gray-400'}`, children: lead.assignedToName ?? '未分配' }), canAssign && (_jsx("button", { onClick: () => setAssigningUserId(lead.assignedToUserId ?? null), className: "text-xs text-primary-600 hover:text-primary-800 underline", children: lead.assignedToUserId ? '变更' : '分配' }))] })) : (_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("select", { className: "rounded-md border border-gray-300 bg-white px-2.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500", value: assigningUserId ?? '', onChange: (e) => setAssigningUserId(e.target.value || null), children: [_jsx("option", { value: "", children: "\u2014 \u53D6\u6D88\u5206\u914D \u2014" }), salesUsers.map((u) => (_jsx("option", { value: u.id, children: u.name }, u.id)))] }), _jsx(Button, { size: "sm", loading: assignLead.isPending, onClick: () => assignLead.mutate(assigningUserId ?? null), children: "\u786E\u8BA4" }), _jsx(Button, { size: "sm", variant: "secondary", onClick: () => setAssigningUserId(undefined), children: "\u53D6\u6D88" })] }))] }), lead.notes && (_jsx("p", { className: "mt-3 text-sm text-gray-600 bg-gray-50 rounded p-3", children: lead.notes })), _jsxs("div", { className: "mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400", children: [_jsxs("span", { children: ["\u521B\u5EFA\u4EBA\uFF1A", lead.createdByName ?? '—'] }), _jsxs("span", { children: ["\u521B\u5EFA\u4E8E ", formatDate(lead.createdAt)] })] }), lead.status !== 'Converted' && lead.status !== 'Lost' && (_jsx("div", { className: "mt-4 pt-4 border-t", children: _jsx(Button, { variant: "primary", size: "sm", onClick: () => convertToClient.mutate(), loading: convertToClient.isPending, children: "\u8F6C\u5316\u4E3A\u5BA2\u6237" }) }))] }), _jsxs("div", { className: "rounded-lg border bg-white p-4 sm:p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h2", { className: "font-semibold text-gray-900", children: "\u8DDF\u8FDB\u8BB0\u5F55" }), _jsx(Button, { size: "sm", variant: "secondary", onClick: () => setShowActivity(true), children: "\u6DFB\u52A0\u8BB0\u5F55" })] }), !activities?.length ? (_jsx("p", { className: "text-sm text-gray-500", children: "\u6682\u65E0\u8DDF\u8FDB\u8BB0\u5F55" })) : (_jsx("div", { className: "space-y-3", children: activities.map((act) => (_jsxs("div", { className: "flex gap-3 text-sm", children: [_jsx("span", { className: "mt-0.5 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 h-fit", children: getOptionLabel(activityTypeOpts, act.activityType) }), _jsxs("div", { className: "flex-1", children: [_jsx("p", { className: "text-gray-700", children: act.description ?? '（无描述）' }), _jsxs("p", { className: "mt-0.5 text-xs text-gray-400", children: [act.userName ?? '—', " \u00B7 ", formatDate(act.activityDate)] }), (act.attachments ?? []).length > 0 && (_jsx("div", { className: "mt-1.5 flex flex-wrap gap-1.5", children: act.attachments.map((att) => (_jsxs("button", { type: "button", onClick: () => downloadFile(att.key, att.name), className: "inline-flex items-center gap-1 rounded bg-primary-50 px-2 py-0.5 text-xs text-primary-600 hover:text-primary-800", children: [_jsx("svg", { className: "h-3 w-3", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" }) }), att.name] }, att.key))) }))] })] }, act.id))) }))] }), showActivity && (_jsx(ActivityModal, { title: "\u6DFB\u52A0\u8DDF\u8FDB\u8BB0\u5F55", onClose: () => setShowActivity(false), loading: addActivity.isPending, onSubmit: (d) => addActivity.mutate(d) }))] }));
}
