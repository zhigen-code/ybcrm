import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { crmApi } from '@/shared/utils/request';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Select } from '@/shared/components/Select';
import { Badge } from '@/shared/components/Badge';
import { Modal } from '@/shared/components/Modal';
import { formatDate } from '@/shared/utils/format';
import { useOptionGroup, toSelectOptions, getOptionColor, getOptionLabel } from '@/shared/hooks/useOptions';
import { ActivityModal } from '@/shared/components/ActivityModal';
const editSchema = z.object({
    phone: z.string().nullable().optional(),
    email: z.string().email().nullable().optional(),
    servicePlans: z.array(z.string()).optional(),
    contractStatus: z.string().nullable().optional(),
});
export default function ClientDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [showEdit, setShowEdit] = useState(false);
    const [showActivity, setShowActivity] = useState(false);
    const { options: contractStatusOpts } = useOptionGroup('contract_status');
    const { options: activityTypeOpts } = useOptionGroup('activity_type');
    const { data: servicesData } = useQuery({
        queryKey: ['services'],
        queryFn: () => crmApi.get('/services').then((r) => r.data),
    });
    const serviceOptions = servicesData?.data ?? [];
    const { data: client } = useQuery({
        queryKey: ['client', id],
        queryFn: () => crmApi.get(`/clients/${id}`).then((r) => r.data.data),
    });
    const { data: activities } = useQuery({
        queryKey: ['activities', 'client', id, client?.leadId],
        enabled: !!client,
        queryFn: () => crmApi.get('/activities', {
            params: { clientId: id, ...(client?.leadId ? { leadId: client.leadId } : {}) },
        }).then((r) => r.data.data),
    });
    const editForm = useForm({
        resolver: zodResolver(editSchema),
        ...(client ? {
            values: {
                phone: client.phone,
                email: client.email,
                servicePlans: client.servicePlans ?? [],
                contractStatus: client.contractStatus,
            }
        } : {}),
    });
    const selectedPlans = editForm.watch('servicePlans') ?? [];
    const togglePlan = (svcName) => {
        const next = selectedPlans.includes(svcName)
            ? selectedPlans.filter((s) => s !== svcName)
            : [...selectedPlans, svcName];
        editForm.setValue('servicePlans', next);
    };
    const updateClient = useMutation({
        mutationFn: (body) => crmApi.put(`/clients/${id}`, body),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['client', id] });
            setShowEdit(false);
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
        mutationFn: (body) => crmApi.post('/activities', { ...body, clientId: id }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['activities', 'client', id] });
            setShowActivity(false);
        },
    });
    if (!client)
        return _jsx("div", { className: "p-6 text-sm text-gray-500", children: "\u52A0\u8F7D\u4E2D..." });
    return (_jsxs("div", { className: "p-4 sm:p-6 max-w-3xl", children: [_jsx("button", { onClick: () => navigate(-1), className: "mb-4 text-sm text-gray-500 hover:text-gray-700", children: "\u2190 \u8FD4\u56DE" }), _jsxs("div", { className: "rounded-lg border bg-white p-4 sm:p-6 mb-4 sm:mb-6", children: [_jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-xl font-semibold text-gray-900", children: client.name }), _jsxs("p", { className: "mt-1 text-sm text-gray-500", children: [client.phone ?? '无电话', " \u00B7 ", client.email ?? '无邮箱'] })] }), _jsx(Button, { variant: "secondary", size: "sm", onClick: () => setShowEdit(true), children: "\u7F16\u8F91" })] }), _jsxs("div", { className: "mt-4 grid grid-cols-2 sm:grid-cols-2 gap-3 text-sm", children: [_jsxs("div", { children: [_jsx("span", { className: "text-gray-500", children: "\u670D\u52A1\u5957\u9910" }), _jsx("div", { className: "mt-0.5 flex flex-wrap gap-1", children: (client.servicePlans ?? []).length > 0
                                            ? (client.servicePlans ?? []).map((p) => _jsx(Badge, { variant: "blue", children: p }, p))
                                            : _jsx("span", { className: "text-gray-400", children: "\u2014" }) })] }), _jsxs("div", { children: [_jsx("span", { className: "text-gray-500", children: "\u5408\u540C\u72B6\u6001" }), _jsx("p", { className: "mt-0.5", children: client.contractStatus ? (_jsx(Badge, { variant: getOptionColor(contractStatusOpts, client.contractStatus), children: client.contractStatus })) : '—' })] }), client.detailedProfile?.source && (_jsxs("div", { children: [_jsx("span", { className: "text-gray-500", children: "\u6765\u6E90" }), _jsx("p", { className: "mt-0.5 text-gray-700", children: String(client.detailedProfile.source) })] })), _jsxs("div", { children: [_jsx("span", { className: "text-gray-500", children: "\u521B\u5EFA\u4EBA" }), _jsx("p", { className: "mt-0.5 text-gray-700", children: client.createdByName ?? '—' })] }), _jsxs("div", { children: [_jsx("span", { className: "text-gray-500", children: "\u521B\u5EFA\u65F6\u95F4" }), _jsx("p", { className: "mt-0.5 text-gray-700", children: formatDate(client.createdAt) })] }), _jsxs("div", { children: [_jsx("span", { className: "text-gray-500", children: "\u66F4\u65B0\u65F6\u95F4" }), _jsx("p", { className: "mt-0.5 text-gray-700", children: formatDate(client.updatedAt) })] })] }), client.detailedProfile?.notes && (_jsx("p", { className: "mt-3 text-sm text-gray-600 bg-gray-50 rounded p-3", children: String(client.detailedProfile.notes) }))] }), _jsxs("div", { className: "rounded-lg border bg-white p-4 sm:p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h2", { className: "font-semibold text-gray-900", children: "\u8DDF\u8FDB\u8BB0\u5F55" }), _jsx(Button, { size: "sm", variant: "secondary", onClick: () => setShowActivity(true), children: "\u6DFB\u52A0\u8BB0\u5F55" })] }), !activities?.length ? (_jsx("p", { className: "text-sm text-gray-500", children: "\u6682\u65E0\u8DDF\u8FDB\u8BB0\u5F55" })) : (_jsx("div", { className: "space-y-3", children: activities.map((act) => (_jsx("div", { className: "flex gap-3 text-sm border-l-2 border-gray-200 pl-3", children: _jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [_jsx("span", { className: "text-xs font-medium text-gray-600", children: getOptionLabel(activityTypeOpts, act.activityType) }), _jsx("span", { className: "text-xs text-gray-400", children: act.userName ?? '—' }), _jsx("span", { className: "text-xs text-gray-400", children: formatDate(act.activityDate) })] }), act.description && (_jsx("p", { className: "mt-1 text-gray-700", children: act.description })), (act.attachments ?? []).length > 0 && (_jsx("div", { className: "mt-1.5 flex flex-wrap gap-1.5", children: act.attachments.map((att) => (_jsxs("button", { type: "button", onClick: () => downloadFile(att.key, att.name), className: "inline-flex items-center gap-1 rounded bg-primary-50 px-2 py-0.5 text-xs text-primary-600 hover:text-primary-800", children: [_jsx("svg", { className: "h-3 w-3", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" }) }), att.name] }, att.key))) }))] }) }, act.id))) }))] }), showEdit && (_jsx(Modal, { title: "\u7F16\u8F91\u5BA2\u6237\u4FE1\u606F", onClose: () => setShowEdit(false), footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", onClick: () => setShowEdit(false), children: "\u53D6\u6D88" }), _jsx(Button, { loading: updateClient.isPending, onClick: editForm.handleSubmit((d) => updateClient.mutate(d)), children: "\u4FDD\u5B58" })] }), children: _jsxs("div", { className: "space-y-3", children: [_jsx(Input, { label: "\u7535\u8BDD", ...editForm.register('phone') }), _jsx(Input, { label: "\u90AE\u7BB1", type: "email", ...editForm.register('email') }), _jsxs("div", { children: [_jsx("p", { className: "mb-1.5 text-sm font-medium text-gray-700", children: "\u670D\u52A1\u5957\u9910" }), _jsx("div", { className: "flex flex-wrap gap-2", children: serviceOptions.map((svc) => (_jsx("button", { type: "button", onClick: () => togglePlan(svc.name), className: `rounded-full px-3 py-1 text-sm font-medium border transition-colors ${selectedPlans.includes(svc.name)
                                            ? 'bg-primary-600 text-white border-primary-600'
                                            : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400'}`, children: svc.name }, svc.id))) })] }), _jsx(Select, { label: "\u5408\u540C\u72B6\u6001", options: toSelectOptions(contractStatusOpts), placeholder: "\u8BF7\u9009\u62E9...", ...editForm.register('contractStatus') })] }) })), showActivity && (_jsx(ActivityModal, { title: "\u6DFB\u52A0\u8DDF\u8FDB\u8BB0\u5F55", onClose: () => setShowActivity(false), loading: addActivity.isPending, onSubmit: (d) => addActivity.mutate(d) }))] }));
}
