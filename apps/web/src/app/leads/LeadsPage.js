import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { crmApi } from '@/shared/utils/request';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Badge } from '@/shared/components/Badge';
import { Modal } from '@/shared/components/Modal';
import { Textarea } from '@/shared/components/Textarea';
import { formatDate } from '@/shared/utils/format';
import { SERVICE_OPTIONS } from '@/shared/types';
const statusVariant = {
    New: 'blue',
    Contacted: 'yellow',
    Qualified: 'gray',
    Converted: 'green',
    Lost: 'red',
};
const statusLabel = {
    New: '新线索',
    Contacted: '已联系',
    Qualified: '已确认',
    Converted: '已转化',
    Lost: '已丢失',
};
const createSchema = z.object({
    source: z.string().min(1, '请填写来源'),
    name: z.string().min(1, '请填写姓名'),
    contactInfo: z.string().min(1, '请填写联系方式'),
    intendedServices: z.array(z.enum(['赴美试管', '代孕', '供精', '供卵'])).min(1, '请至少选择一个意向服务'),
    notes: z.string().optional(),
});
const statusFilterOptions = [
    { value: '', label: '全部' },
    { value: 'New', label: '新线索' },
    { value: 'Contacted', label: '已联系' },
    { value: 'Qualified', label: '已确认' },
    { value: 'Converted', label: '已转化' },
    { value: 'Lost', label: '已丢失' },
];
export default function LeadsPage() {
    const queryClient = useQueryClient();
    const [showCreate, setShowCreate] = useState(false);
    const [statusFilter, setStatusFilter] = useState('');
    const { data, isLoading } = useQuery({
        queryKey: ['leads', statusFilter],
        queryFn: () => crmApi
            .get('/leads', { params: { status: statusFilter || undefined } })
            .then((r) => r.data),
    });
    const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting }, } = useForm({
        resolver: zodResolver(createSchema),
        defaultValues: { intendedServices: [] },
    });
    const selectedServices = watch('intendedServices') ?? [];
    const toggleService = (svc) => {
        const next = selectedServices.includes(svc)
            ? selectedServices.filter((s) => s !== svc)
            : [...selectedServices, svc];
        setValue('intendedServices', next, { shouldValidate: true });
    };
    const createMutation = useMutation({
        mutationFn: (body) => crmApi.post('/leads', body),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leads'] });
            setShowCreate(false);
            reset();
        },
    });
    return (_jsxs("div", { className: "p-4 sm:p-6", children: [_jsxs("div", { className: "mb-4 flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-lg sm:text-xl font-semibold text-gray-900", children: "\u7EBF\u7D22\u7BA1\u7406" }), _jsxs("p", { className: "mt-0.5 text-xs sm:text-sm text-gray-500", children: ["\u5171 ", data?.total ?? 0, " \u6761\u7EBF\u7D22"] })] }), _jsx(Button, { onClick: () => setShowCreate(true), size: "sm", children: "\u65B0\u5EFA\u7EBF\u7D22" })] }), _jsx("div", { className: "mb-4 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none", children: statusFilterOptions.map(({ value, label }) => (_jsx("button", { onClick: () => setStatusFilter(value), className: `flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${statusFilter === value
                        ? 'bg-primary-600 text-white'
                        : 'bg-white text-gray-600 border hover:bg-gray-50'}`, children: label }, value))) }), isLoading ? (_jsx("div", { className: "py-12 text-center text-sm text-gray-500", children: "\u52A0\u8F7D\u4E2D..." })) : !data?.data.length ? (_jsx("div", { className: "py-12 text-center text-sm text-gray-500", children: "\u6682\u65E0\u7EBF\u7D22" })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "hidden sm:block rounded-lg border bg-white overflow-hidden", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-gray-50 border-b", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "\u59D3\u540D" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "\u610F\u5411\u670D\u52A1" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "\u72B6\u6001" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "\u6765\u6E90" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "\u521B\u5EFA\u4EBA" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "\u521B\u5EFA\u65F6\u95F4" }), _jsx("th", { className: "px-4 py-3" })] }) }), _jsx("tbody", { className: "divide-y divide-gray-100", children: data.data.map((lead) => (_jsxs("tr", { className: "hover:bg-gray-50", children: [_jsx("td", { className: "px-4 py-3 font-medium text-gray-900", children: lead.name }), _jsx("td", { className: "px-4 py-3", children: _jsx("div", { className: "flex flex-wrap gap-1", children: (lead.intendedServices ?? []).map((svc) => (_jsx(Badge, { variant: "blue", children: svc }, svc))) }) }), _jsx("td", { className: "px-4 py-3", children: _jsx(Badge, { variant: statusVariant[lead.status], children: statusLabel[lead.status] }) }), _jsx("td", { className: "px-4 py-3 text-gray-600", children: lead.source }), _jsx("td", { className: "px-4 py-3 text-gray-600", children: lead.createdByName ?? '—' }), _jsx("td", { className: "px-4 py-3 text-gray-500", children: formatDate(lead.createdAt) }), _jsx("td", { className: "px-4 py-3", children: _jsx(Link, { to: `/app/leads/${lead.id}`, className: "text-primary-600 hover:underline", children: "\u67E5\u770B" }) })] }, lead.id))) })] }) }), _jsx("div", { className: "sm:hidden space-y-3", children: data.data.map((lead) => (_jsxs(Link, { to: `/app/leads/${lead.id}`, className: "block rounded-lg border bg-white p-4 hover:shadow-sm transition-shadow", children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "font-medium text-gray-900 truncate", children: lead.name }), _jsx("p", { className: "mt-0.5 text-xs text-gray-500 truncate", children: lead.contactInfo })] }), _jsx(Badge, { variant: statusVariant[lead.status], className: "flex-shrink-0", children: statusLabel[lead.status] })] }), _jsx("div", { className: "mt-2 flex flex-wrap gap-1", children: (lead.intendedServices ?? []).map((svc) => (_jsx(Badge, { variant: "blue", children: svc }, svc))) }), _jsxs("div", { className: "mt-2 flex items-center gap-3 text-xs text-gray-500", children: [_jsx("span", { children: lead.source }), lead.createdByName && _jsxs("span", { children: ["\u00B7 ", lead.createdByName] }), _jsx("span", { className: "ml-auto", children: formatDate(lead.createdAt) })] })] }, lead.id))) })] })), showCreate && (_jsx(Modal, { title: "\u65B0\u5EFA\u7EBF\u7D22", onClose: () => { setShowCreate(false); reset(); }, children: _jsxs("form", { onSubmit: handleSubmit((d) => createMutation.mutate(d)), className: "space-y-3", children: [_jsx(Input, { label: "\u6765\u6E90", error: errors.source?.message, ...register('source') }), _jsx(Input, { label: "\u59D3\u540D", error: errors.name?.message, ...register('name') }), _jsx(Input, { label: "\u8054\u7CFB\u65B9\u5F0F", error: errors.contactInfo?.message, ...register('contactInfo') }), _jsxs("div", { children: [_jsx("p", { className: "mb-1.5 text-sm font-medium text-gray-700", children: "\u610F\u5411\u670D\u52A1" }), _jsx("div", { className: "flex flex-wrap gap-2", children: SERVICE_OPTIONS.map((svc) => (_jsx("button", { type: "button", onClick: () => toggleService(svc), className: `rounded-full px-3 py-1 text-sm font-medium border transition-colors ${selectedServices.includes(svc)
                                            ? 'bg-primary-600 text-white border-primary-600'
                                            : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400'}`, children: svc }, svc))) }), errors.intendedServices && (_jsx("p", { className: "mt-1 text-xs text-red-500", children: errors.intendedServices.message }))] }), _jsx(Textarea, { label: "\u5907\u6CE8", ...register('notes') }), _jsxs("div", { className: "flex justify-end gap-2 pt-1", children: [_jsx(Button, { variant: "secondary", type: "button", onClick: () => { setShowCreate(false); reset(); }, children: "\u53D6\u6D88" }), _jsx(Button, { type: "submit", loading: isSubmitting || createMutation.isPending, children: "\u521B\u5EFA" })] })] }) }))] }));
}
