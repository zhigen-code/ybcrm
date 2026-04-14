import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { crmApi } from '@/shared/utils/request';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Modal } from '@/shared/components/Modal';
import { Badge } from '@/shared/components/Badge';
const VALID_COLORS = ['gray', 'blue', 'green', 'yellow', 'red', 'purple'];
const COLOR_CLASS = {
    gray: 'bg-gray-200',
    blue: 'bg-blue-400',
    green: 'bg-green-400',
    yellow: 'bg-yellow-400',
    red: 'bg-red-400',
    purple: 'bg-purple-400',
};
const GROUPS = [
    { key: 'lead_status', label: '线索状态', noAdd: true },
    { key: 'contract_status', label: '合同状态', noAdd: false },
    { key: 'activity_type', label: '跟进类型', noAdd: false },
    { key: 'partner_type', label: '合作伙伴类型', noAdd: false },
];
const itemSchema = z.object({
    value: z.string().min(1, '请填写值'),
    label: z.string().min(1, '请填写标签'),
    color: z.enum(VALID_COLORS).default('gray'),
});
function ColorPicker({ value, onChange }) {
    return (_jsx("div", { className: "flex gap-2 flex-wrap", children: VALID_COLORS.map((c) => (_jsx("button", { type: "button", onClick: () => onChange(c), className: `w-6 h-6 rounded-full ${COLOR_CLASS[c]} ${value === c ? 'ring-2 ring-offset-1 ring-primary-600' : 'opacity-70 hover:opacity-100'}`, title: c }, c))) }));
}
function OptionGroupPanel({ groupKey, noAdd }) {
    const queryClient = useQueryClient();
    const [editTarget, setEditTarget] = useState(null);
    const [showAdd, setShowAdd] = useState(false);
    const [editColor, setEditColor] = useState('gray');
    const [addColor, setAddColor] = useState('gray');
    const { data, isLoading } = useQuery({
        queryKey: ['admin-options', groupKey],
        queryFn: () => crmApi.get('/admin/options/items', { params: { groupKey } })
            .then((r) => r.data.data),
    });
    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['admin-options', groupKey] });
        queryClient.invalidateQueries({ queryKey: ['options'] });
    };
    const editForm = useForm({ resolver: zodResolver(itemSchema) });
    const addForm = useForm({ resolver: zodResolver(itemSchema), defaultValues: { color: 'gray' } });
    const updateMutation = useMutation({
        mutationFn: ({ id, ...body }) => crmApi.put(`/admin/options/items/${id}`, body),
        onSuccess: () => { setEditTarget(null); invalidate(); },
    });
    const addMutation = useMutation({
        mutationFn: (body) => crmApi.post('/admin/options/items', { ...body, groupKey }),
        onSuccess: () => { setShowAdd(false); addForm.reset(); setAddColor('gray'); invalidate(); },
    });
    const toggleActive = useMutation({
        mutationFn: ({ id, isActive }) => crmApi.put(`/admin/options/items/${id}`, { isActive }),
        onSuccess: invalidate,
    });
    const deleteMutation = useMutation({
        mutationFn: (id) => crmApi.delete(`/admin/options/items/${id}`),
        onSuccess: invalidate,
    });
    const openEdit = (item) => {
        setEditTarget(item);
        setEditColor(item.color);
        editForm.reset({ value: item.value, label: item.label, color: item.color });
    };
    if (isLoading)
        return _jsx("div", { className: "py-8 text-center text-sm text-gray-400", children: "\u52A0\u8F7D\u4E2D..." });
    return (_jsxs("div", { children: [_jsx("div", { className: "rounded-lg border bg-white overflow-hidden", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-gray-50 border-b", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700 w-8", children: "\u8272" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "\u503C" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "\u6807\u7B7E" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "\u72B6\u6001" }), _jsx("th", { className: "px-4 py-3" })] }) }), _jsx("tbody", { className: "divide-y divide-gray-100", children: data?.map((item) => (_jsxs("tr", { className: item.isActive ? '' : 'opacity-50', children: [_jsx("td", { className: "px-4 py-3", children: _jsx("span", { className: `inline-block w-4 h-4 rounded-full ${COLOR_CLASS[item.color] ?? 'bg-gray-200'}` }) }), _jsx("td", { className: "px-4 py-3 text-gray-500 font-mono text-xs", children: item.value }), _jsx("td", { className: "px-4 py-3 font-medium text-gray-900", children: item.label }), _jsx("td", { className: "px-4 py-3", children: _jsx(Badge, { variant: item.isActive ? 'green' : 'gray', children: item.isActive ? '启用' : '禁用' }) }), _jsx("td", { className: "px-4 py-3", children: _jsxs("div", { className: "flex items-center gap-2 justify-end", children: [_jsx("button", { onClick: () => openEdit(item), className: "text-xs text-primary-600 hover:text-primary-800", children: "\u7F16\u8F91" }), !item.isSystem && (_jsxs(_Fragment, { children: [_jsx("span", { className: "text-gray-300", children: "|" }), _jsx("button", { onClick: () => toggleActive.mutate({ id: item.id, isActive: !item.isActive }), className: "text-xs text-gray-500 hover:text-gray-700", children: item.isActive ? '禁用' : '启用' }), _jsx("span", { className: "text-gray-300", children: "|" }), _jsx("button", { onClick: () => {
                                                                if (confirm(`确认删除「${item.label}」？`))
                                                                    deleteMutation.mutate(item.id);
                                                            }, className: "text-xs text-red-500 hover:text-red-700", children: "\u5220\u9664" })] }))] }) })] }, item.id))) })] }) }), !noAdd && (_jsx("div", { className: "mt-3", children: _jsx(Button, { variant: "secondary", size: "sm", onClick: () => setShowAdd(true), children: "+ \u6DFB\u52A0\u9009\u9879" }) })), editTarget && (_jsx(Modal, { title: `编辑：${editTarget.label}`, onClose: () => setEditTarget(null), footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", onClick: () => setEditTarget(null), children: "\u53D6\u6D88" }), _jsx(Button, { loading: updateMutation.isPending, onClick: editForm.handleSubmit((d) => updateMutation.mutate({ id: editTarget.id, ...d, color: editColor })), children: "\u4FDD\u5B58" })] }), children: _jsxs("div", { className: "space-y-3", children: [editTarget.isSystem ? (_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-700 mb-1", children: "\u503C\uFF08\u7CFB\u7EDF\u56FA\u5B9A\uFF0C\u4E0D\u53EF\u4FEE\u6539\uFF09" }), _jsx("p", { className: "rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-500 font-mono", children: editTarget.value })] })) : (_jsx(Input, { label: "\u503C", error: editForm.formState.errors.value?.message, ...editForm.register('value') })), _jsx(Input, { label: "\u6807\u7B7E", error: editForm.formState.errors.label?.message, ...editForm.register('label') }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-700 mb-2", children: "\u989C\u8272" }), _jsx(ColorPicker, { value: editColor, onChange: setEditColor })] })] }) })), showAdd && (_jsx(Modal, { title: "\u6DFB\u52A0\u9009\u9879", onClose: () => { setShowAdd(false); addForm.reset(); setAddColor('gray'); }, footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", onClick: () => { setShowAdd(false); addForm.reset(); setAddColor('gray'); }, children: "\u53D6\u6D88" }), _jsx(Button, { loading: addMutation.isPending, onClick: addForm.handleSubmit((d) => addMutation.mutate({ ...d, color: addColor })), children: "\u6DFB\u52A0" })] }), children: _jsxs("div", { className: "space-y-3", children: [_jsx(Input, { label: "\u503C\uFF08\u552F\u4E00\u6807\u8BC6\uFF09", placeholder: "\u5982 InProgress", error: addForm.formState.errors.value?.message, ...addForm.register('value') }), _jsx(Input, { label: "\u6807\u7B7E\uFF08\u663E\u793A\u6587\u672C\uFF09", placeholder: "\u5982 \u8FDB\u884C\u4E2D", error: addForm.formState.errors.label?.message, ...addForm.register('label') }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-700 mb-2", children: "\u989C\u8272" }), _jsx(ColorPicker, { value: addColor, onChange: setAddColor })] })] }) }))] }));
}
export default function OptionsPage() {
    const [activeGroup, setActiveGroup] = useState(GROUPS[0].key);
    const current = GROUPS.find((g) => g.key === activeGroup) ?? GROUPS[0];
    return (_jsxs("div", { className: "p-4 sm:p-6", children: [_jsxs("div", { className: "mb-6", children: [_jsx("h1", { className: "text-lg sm:text-xl font-semibold text-gray-900", children: "\u9009\u9879\u914D\u7F6E" }), _jsx("p", { className: "mt-0.5 text-sm text-gray-500", children: "\u7BA1\u7406\u5404\u4E1A\u52A1\u6A21\u5757\u7684\u4E0B\u62C9\u9009\u9879\u3001\u72B6\u6001\u6807\u7B7E\u548C\u989C\u8272" })] }), _jsx("div", { className: "mb-4 flex gap-1 border-b", children: GROUPS.map((g) => (_jsx("button", { onClick: () => setActiveGroup(g.key), className: `px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${activeGroup === g.key
                        ? 'border-primary-600 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'}`, children: g.label }, g.key))) }), _jsx(OptionGroupPanel, { groupKey: activeGroup, noAdd: current.noAdd }, activeGroup)] }));
}
