import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { crmApi } from '@/shared/utils/request';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Textarea } from '@/shared/components/Textarea';
import { Modal } from '@/shared/components/Modal';
const schema = z.object({
    name: z.string().min(1, '请填写名称'),
    description: z.string().nullable().optional(),
    price: z.coerce.number().nullable().optional(),
    processSteps: z.string().optional(), // 换行分隔，提交时转数组
});
export default function ServicesPage() {
    const queryClient = useQueryClient();
    const [editTarget, setEditTarget] = useState(null);
    const [showCreate, setShowCreate] = useState(false);
    const { data, isLoading } = useQuery({
        queryKey: ['services'],
        queryFn: () => crmApi.get('/services').then((r) => r.data),
    });
    const form = useForm({ resolver: zodResolver(schema) });
    const openCreate = () => {
        form.reset({ name: '', description: '', price: null, processSteps: '' });
        setEditTarget(null);
        setShowCreate(true);
    };
    const openEdit = (s) => {
        form.reset({
            name: s.name,
            description: s.description,
            price: s.price,
            processSteps: s.processSteps.join('\n'),
        });
        setEditTarget(s);
        setShowCreate(true);
    };
    const saveMutation = useMutation({
        mutationFn: (body) => {
            const payload = {
                ...body,
                processSteps: body.processSteps
                    ? body.processSteps.split('\n').map((s) => s.trim()).filter(Boolean)
                    : [],
            };
            return editTarget
                ? crmApi.put(`/services/${editTarget.id}`, payload)
                : crmApi.post('/services', payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['services'] });
            setShowCreate(false);
        },
    });
    return (_jsxs("div", { className: "p-6", children: [_jsxs("div", { className: "mb-6 flex items-center justify-between", children: [_jsx("h1", { className: "text-xl font-semibold text-gray-900", children: "\u670D\u52A1\u7BA1\u7406" }), _jsx(Button, { onClick: openCreate, children: "\u65B0\u5EFA\u670D\u52A1" })] }), isLoading ? (_jsx("div", { className: "text-sm text-gray-500", children: "\u52A0\u8F7D\u4E2D..." })) : (_jsx("div", { className: "grid gap-4 sm:grid-cols-2", children: data?.data.map((service) => (_jsxs("div", { className: "rounded-lg border bg-white p-5", children: [_jsxs("div", { className: "flex items-start justify-between", children: [_jsx("h2", { className: "font-semibold text-gray-900", children: service.name }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => openEdit(service), children: "\u7F16\u8F91" })] }), service.description && (_jsx("p", { className: "mt-1 text-sm text-gray-500", children: service.description })), service.price != null && (_jsxs("p", { className: "mt-2 text-sm font-medium text-primary-600", children: ["\u00A5", service.price.toLocaleString()] })), service.processSteps.length > 0 && (_jsxs("div", { className: "mt-3", children: [_jsx("p", { className: "text-xs font-medium text-gray-500 mb-1", children: "\u670D\u52A1\u6D41\u7A0B" }), _jsx("ol", { className: "space-y-1", children: service.processSteps.map((step, i) => (_jsxs("li", { className: "flex gap-2 text-xs text-gray-600", children: [_jsx("span", { className: "flex-shrink-0 w-4 h-4 rounded-full bg-primary-100 text-primary-700 text-center leading-4 font-medium", children: i + 1 }), step] }, i))) })] }))] }, service.id))) })), showCreate && (_jsx(Modal, { title: editTarget ? '编辑服务' : '新建服务', onClose: () => setShowCreate(false), footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", onClick: () => setShowCreate(false), children: "\u53D6\u6D88" }), _jsx(Button, { loading: saveMutation.isPending, onClick: form.handleSubmit((d) => saveMutation.mutate(d)), children: "\u4FDD\u5B58" })] }), children: _jsxs("div", { className: "space-y-3", children: [_jsx(Input, { label: "\u540D\u79F0", error: form.formState.errors.name?.message, ...form.register('name') }), _jsx(Textarea, { label: "\u63CF\u8FF0", ...form.register('description') }), _jsx(Input, { label: "\u4EF7\u683C\uFF08\u5143\uFF09", type: "number", ...form.register('price') }), _jsx(Textarea, { label: "\u670D\u52A1\u6D41\u7A0B\uFF08\u6BCF\u884C\u4E00\u4E2A\u6B65\u9AA4\uFF09", rows: 5, placeholder: "\u521D\u6B65\u54A8\u8BE2\n\u533B\u7597\u8BC4\u4F30\n\u65B9\u6848\u5236\u5B9A", ...form.register('processSteps') })] }) }))] }));
}
