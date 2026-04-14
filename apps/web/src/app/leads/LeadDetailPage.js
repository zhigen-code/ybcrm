import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { crmApi } from '@/shared/utils/request';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Modal } from '@/shared/components/Modal';
import { Select } from '@/shared/components/Select';
import { Textarea } from '@/shared/components/Textarea';
import { Input } from '@/shared/components/Input';
import { formatDate } from '@/shared/utils/format';
import { useOptionGroup, toSelectOptions, getOptionLabel } from '@/shared/hooks/useOptions';
import { useState } from 'react';
const activitySchema = z.object({
    activityType: z.string().min(1),
    description: z.string().optional(),
    activityDate: z.string().min(1),
});
export default function LeadDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [showActivity, setShowActivity] = useState(false);
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
    const updateStatus = useMutation({
        mutationFn: (status) => crmApi.put(`/leads/${id}`, { status }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lead', id] }),
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
    const { register, handleSubmit, reset, formState: { isSubmitting }, } = useForm({
        resolver: zodResolver(activitySchema),
        defaultValues: { activityDate: new Date().toISOString().slice(0, 16) },
    });
    const addActivity = useMutation({
        mutationFn: (body) => crmApi.post('/activities', { ...body, leadId: id }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['activities', 'lead', id] });
            setShowActivity(false);
            reset();
        },
    });
    if (!lead)
        return _jsx("div", { className: "p-6 text-sm text-gray-500", children: "\u52A0\u8F7D\u4E2D..." });
    return (_jsxs("div", { className: "p-4 sm:p-6 max-w-3xl", children: [_jsx("button", { onClick: () => navigate(-1), className: "mb-4 text-sm text-gray-500 hover:text-gray-700", children: "\u2190 \u8FD4\u56DE" }), _jsxs("div", { className: "rounded-lg border bg-white p-4 sm:p-6 mb-4 sm:mb-6", children: [_jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-xl font-semibold text-gray-900", children: lead.name }), _jsxs("p", { className: "mt-1 text-sm text-gray-500", children: [lead.contactInfo, " \u00B7 ", lead.source] })] }), _jsx("div", { className: "flex flex-wrap gap-1", children: (lead.intendedServices ?? []).map((svc) => (_jsx(Badge, { children: svc }, svc))) })] }), _jsxs("div", { className: "mt-4 flex flex-wrap items-center gap-2", children: [_jsx("span", { className: "text-sm text-gray-600", children: "\u72B6\u6001\uFF1A" }), _jsx("div", { className: "flex flex-wrap gap-1.5", children: leadStatusOpts.filter((o) => o.value !== 'Converted').map((o) => (_jsx("button", { onClick: () => updateStatus.mutate(o.value), className: `rounded-full px-3 py-1 text-xs font-medium transition-colors ${lead.status === o.value
                                        ? 'bg-primary-600 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`, children: o.label }, o.value))) })] }), lead.notes && (_jsx("p", { className: "mt-3 text-sm text-gray-600 bg-gray-50 rounded p-3", children: lead.notes })), _jsxs("div", { className: "mt-4 text-xs text-gray-400", children: ["\u521B\u5EFA\u4EBA\uFF1A", lead.createdByName ?? '—', " \u00B7 \u521B\u5EFA\u4E8E ", formatDate(lead.createdAt)] }), lead.status !== 'Converted' && lead.status !== 'Lost' && (_jsx("div", { className: "mt-4 pt-4 border-t", children: _jsx(Button, { variant: "primary", size: "sm", onClick: () => convertToClient.mutate(), loading: convertToClient.isPending, children: "\u8F6C\u5316\u4E3A\u5BA2\u6237" }) }))] }), _jsxs("div", { className: "rounded-lg border bg-white p-4 sm:p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h2", { className: "font-semibold text-gray-900", children: "\u8DDF\u8FDB\u8BB0\u5F55" }), _jsx(Button, { size: "sm", variant: "secondary", onClick: () => setShowActivity(true), children: "\u6DFB\u52A0\u8BB0\u5F55" })] }), !activities?.length ? (_jsx("p", { className: "text-sm text-gray-500", children: "\u6682\u65E0\u8DDF\u8FDB\u8BB0\u5F55" })) : (_jsx("div", { className: "space-y-3", children: activities.map((act) => (_jsxs("div", { className: "flex gap-3 text-sm", children: [_jsx("span", { className: "mt-0.5 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 h-fit", children: getOptionLabel(activityTypeOpts, act.activityType) }), _jsxs("div", { className: "flex-1", children: [_jsx("p", { className: "text-gray-700", children: act.description ?? '（无描述）' }), _jsxs("p", { className: "mt-0.5 text-xs text-gray-400", children: [act.userName ?? '—', " \u00B7 ", formatDate(act.activityDate)] })] })] }, act.id))) }))] }), showActivity && (_jsx(Modal, { title: "\u6DFB\u52A0\u8DDF\u8FDB\u8BB0\u5F55", onClose: () => { setShowActivity(false); reset(); }, footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", type: "button", onClick: () => { setShowActivity(false); reset(); }, children: "\u53D6\u6D88" }), _jsx(Button, { loading: isSubmitting || addActivity.isPending, onClick: handleSubmit((d) => addActivity.mutate(d)), children: "\u4FDD\u5B58" })] }), children: _jsxs("div", { className: "space-y-3", children: [_jsx(Select, { label: "\u7C7B\u578B", options: toSelectOptions(activityTypeOpts), ...register('activityType') }), _jsx(Textarea, { label: "\u5185\u5BB9", ...register('description') }), _jsx(Input, { type: "datetime-local", label: "\u65F6\u95F4", ...register('activityDate') })] }) }))] }));
}
