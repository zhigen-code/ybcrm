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
import { useOptionGroup, toSelectOptions, getOptionColor, getOptionLabel } from '@/shared/hooks/useOptions';
const schema = z.object({
    name: z.string().min(1, '请填写名称'),
    type: z.string().min(1, '请选择类型'),
    contactPerson: z.string().nullable().optional(),
    contactInfo: z.string().nullable().optional(),
    serviceScope: z.string().optional(),
});
export default function PartnersPage() {
    const queryClient = useQueryClient();
    const [editTarget, setEditTarget] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const { options: partnerTypeOpts } = useOptionGroup('partner_type');
    const { data, isLoading } = useQuery({
        queryKey: ['partners'],
        queryFn: () => crmApi.get('/partners').then((r) => r.data),
    });
    const form = useForm({ resolver: zodResolver(schema) });
    const openCreate = () => {
        form.reset({ name: '', type: partnerTypeOpts[0]?.value ?? '', contactPerson: '', contactInfo: '', serviceScope: '' });
        setEditTarget(null);
        setShowForm(true);
    };
    const openEdit = (p) => {
        form.reset({
            name: p.name,
            type: p.type,
            contactPerson: p.contactPerson,
            contactInfo: p.contactInfo,
            serviceScope: (p.serviceScope ?? []).join('、'),
        });
        setEditTarget(p);
        setShowForm(true);
    };
    const saveMutation = useMutation({
        mutationFn: (body) => {
            const payload = {
                ...body,
                serviceScope: body.serviceScope
                    ? body.serviceScope.split(/[、,，]/).map((s) => s.trim()).filter(Boolean)
                    : [],
            };
            return editTarget
                ? crmApi.put(`/partners/${editTarget.id}`, payload)
                : crmApi.post('/partners', payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['partners'] });
            setShowForm(false);
        },
    });
    return (_jsxs("div", { className: "p-6", children: [_jsxs("div", { className: "mb-6 flex items-center justify-between", children: [_jsx("h1", { className: "text-xl font-semibold text-gray-900", children: "\u5408\u4F5C\u4F19\u4F34" }), _jsx(Button, { onClick: openCreate, children: "\u65B0\u5EFA\u5408\u4F5C\u4F19\u4F34" })] }), isLoading ? (_jsx("div", { className: "text-sm text-gray-500", children: "\u52A0\u8F7D\u4E2D..." })) : (_jsx("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3", children: (data?.data ?? []).map((partner) => (_jsxs("div", { className: "rounded-lg border bg-white p-5", children: [_jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: "flex items-center gap-2", children: _jsx(Badge, { variant: getOptionColor(partnerTypeOpts, partner.type), children: getOptionLabel(partnerTypeOpts, partner.type) }) }), _jsx("h2", { className: "mt-1.5 font-semibold text-gray-900 truncate", children: partner.name })] }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => openEdit(partner), children: "\u7F16\u8F91" })] }), (partner.contactPerson || partner.contactInfo) && (_jsxs("div", { className: "mt-3 text-sm text-gray-600", children: [partner.contactPerson && _jsxs("p", { children: ["\u8054\u7CFB\u4EBA\uFF1A", partner.contactPerson] }), partner.contactInfo && _jsx("p", { className: "text-gray-500", children: partner.contactInfo })] })), (partner.serviceScope ?? []).length > 0 && (_jsx("div", { className: "mt-2 flex flex-wrap gap-1", children: (partner.serviceScope ?? []).map((s) => (_jsx("span", { className: "rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600", children: s }, s))) }))] }, partner.id))) })), showForm && (_jsx(Modal, { title: editTarget ? '编辑合作伙伴' : '新建合作伙伴', onClose: () => setShowForm(false), footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", onClick: () => setShowForm(false), children: "\u53D6\u6D88" }), _jsx(Button, { loading: saveMutation.isPending, onClick: form.handleSubmit((d) => saveMutation.mutate(d)), children: "\u4FDD\u5B58" })] }), children: _jsxs("div", { className: "space-y-3", children: [_jsx(Input, { label: "\u540D\u79F0", error: form.formState.errors.name?.message, ...form.register('name') }), _jsx(Select, { label: "\u7C7B\u578B", options: toSelectOptions(partnerTypeOpts), ...form.register('type') }), _jsx(Input, { label: "\u8054\u7CFB\u4EBA", ...form.register('contactPerson') }), _jsx(Input, { label: "\u8054\u7CFB\u65B9\u5F0F", placeholder: "\u7535\u8BDD\u3001\u90AE\u7BB1\u7B49", ...form.register('contactInfo') }), _jsx(Input, { label: "\u670D\u52A1\u8303\u56F4", placeholder: "\u7528\u9017\u53F7\u6216\u987F\u53F7\u5206\u9694\uFF0C\u5982\uFF1A\u8D74\u7F8E\u8BD5\u7BA1\u3001\u4EE3\u5B55", ...form.register('serviceScope') })] }) }))] }));
}
