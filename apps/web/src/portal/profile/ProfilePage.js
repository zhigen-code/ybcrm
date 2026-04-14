import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { portalApi } from '@/shared/utils/request';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Badge } from '@/shared/components/Badge';
import { formatDate } from '@/shared/utils/format';
const nameSchema = z.object({ name: z.string().min(1, '请填写姓名') });
const phoneSchema = z.object({ phone: z.string().nullable().optional() });
const passwordSchema = z.object({
    currentPassword: z.string().min(1, '请输入当前密码'),
    newPassword: z.string().min(8, '新密码至少 8 位'),
    confirmPassword: z.string().min(1, '请确认新密码'),
}).refine((d) => d.newPassword === d.confirmPassword, {
    message: '两次密码不一致',
    path: ['confirmPassword'],
});
export default function ProfilePage() {
    const queryClient = useQueryClient();
    const [nameSaved, setNameSaved] = useState(false);
    const [pwSaved, setPwSaved] = useState(false);
    const { data: profile, isLoading } = useQuery({
        queryKey: ['portal', 'profile'],
        queryFn: () => portalApi.get('/profile').then((r) => r.data.data),
    });
    const nameForm = useForm({
        resolver: zodResolver(nameSchema),
        values: { name: profile?.name ?? '' },
    });
    const phoneForm = useForm({
        resolver: zodResolver(phoneSchema),
        values: { phone: profile?.phone ?? '' },
    });
    const passwordForm = useForm({
        resolver: zodResolver(passwordSchema),
    });
    const updateName = useMutation({
        mutationFn: (body) => portalApi.put('/profile', body),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['portal', 'profile'] });
            setNameSaved(true);
            setTimeout(() => setNameSaved(false), 3000);
        },
        onError: (err) => {
            const msg = err?.response?.data?.message ?? '操作失败';
            nameForm.setError('name', { message: msg });
        },
    });
    const updatePhone = useMutation({
        mutationFn: (body) => portalApi.put('/profile', body),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['portal', 'profile'] }),
    });
    const updatePassword = useMutation({
        mutationFn: ({ currentPassword, newPassword }) => portalApi.put('/profile', { currentPassword, newPassword }),
        onSuccess: () => {
            passwordForm.reset();
            setPwSaved(true);
            setTimeout(() => setPwSaved(false), 3000);
        },
        onError: (err) => {
            const msg = err?.response?.data?.message ?? '操作失败';
            passwordForm.setError('currentPassword', { message: msg });
        },
    });
    if (isLoading)
        return _jsx("div", { className: "text-sm text-gray-500", children: "\u52A0\u8F7D\u4E2D..." });
    if (!profile)
        return null;
    return (_jsxs("div", { className: "max-w-xl space-y-6", children: [_jsx("h1", { className: "text-xl font-semibold text-gray-900", children: "\u4E2A\u4EBA\u8D44\u6599" }), _jsxs("div", { className: "rounded-xl border bg-white p-6 space-y-5", children: [profile.email && (_jsxs("div", { children: [_jsx("p", { className: "text-xs font-medium text-gray-500 uppercase tracking-wide", children: "\u90AE\u7BB1" }), _jsx("p", { className: "mt-1 text-gray-900", children: profile.email })] })), _jsxs("div", { children: [_jsx("p", { className: "text-xs font-medium text-gray-500 uppercase tracking-wide", children: "\u670D\u52A1\u5957\u9910" }), _jsx("div", { className: "mt-1 flex flex-wrap gap-1", children: (profile.servicePlans ?? []).length > 0
                                    ? (profile.servicePlans ?? []).map((p) => _jsx(Badge, { variant: "blue", children: p }, p))
                                    : _jsx("span", { className: "text-gray-400 text-sm", children: "\u6682\u65E0" }) })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs font-medium text-gray-500 uppercase tracking-wide", children: "\u5408\u540C\u72B6\u6001" }), _jsx("p", { className: "mt-1", children: profile.contractStatus ? (_jsx(Badge, { variant: profile.contractStatus === '已签署' ? 'green' : 'yellow', children: profile.contractStatus })) : (_jsx("span", { className: "text-gray-400 text-sm", children: "\u2014" })) })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs font-medium text-gray-500 uppercase tracking-wide", children: "\u6CE8\u518C\u65F6\u95F4" }), _jsx("p", { className: "mt-1 text-gray-600 text-sm", children: formatDate(profile.createdAt) })] })] }), _jsxs("div", { className: "rounded-xl border bg-white p-6", children: [_jsx("h2", { className: "font-medium text-gray-900 mb-4", children: "\u4FEE\u6539\u59D3\u540D" }), _jsxs("form", { onSubmit: nameForm.handleSubmit((d) => updateName.mutate(d)), className: "space-y-3", children: [_jsx(Input, { label: "\u663E\u793A\u59D3\u540D", error: nameForm.formState.errors.name?.message, ...nameForm.register('name') }), _jsxs("div", { className: "flex items-center gap-3 pt-1", children: [_jsx(Button, { type: "submit", size: "sm", loading: updateName.isPending, children: "\u4FDD\u5B58\u59D3\u540D" }), nameSaved && _jsx("span", { className: "text-sm text-green-600", children: "\u5DF2\u4FDD\u5B58" })] })] })] }), _jsxs("div", { className: "rounded-xl border bg-white p-6", children: [_jsx("h2", { className: "font-medium text-gray-900 mb-4", children: "\u66F4\u65B0\u8054\u7CFB\u7535\u8BDD" }), _jsxs("form", { onSubmit: phoneForm.handleSubmit((d) => updatePhone.mutate(d)), className: "flex gap-3", children: [_jsx("div", { className: "flex-1", children: _jsx(Input, { placeholder: "\u8BF7\u8F93\u5165\u624B\u673A\u53F7\u7801", ...phoneForm.register('phone') }) }), _jsx(Button, { type: "submit", loading: updatePhone.isPending, children: "\u4FDD\u5B58" })] }), updatePhone.isSuccess && (_jsx("p", { className: "mt-2 text-sm text-green-600", children: "\u5DF2\u66F4\u65B0" }))] }), _jsxs("div", { className: "rounded-xl border bg-white p-6", children: [_jsx("h2", { className: "font-medium text-gray-900 mb-4", children: "\u4FEE\u6539\u5BC6\u7801" }), _jsxs("form", { onSubmit: passwordForm.handleSubmit((d) => updatePassword.mutate(d)), className: "space-y-3", children: [_jsx(Input, { label: "\u5F53\u524D\u5BC6\u7801", type: "password", autoComplete: "current-password", error: passwordForm.formState.errors.currentPassword?.message, ...passwordForm.register('currentPassword') }), _jsx(Input, { label: "\u65B0\u5BC6\u7801", type: "password", autoComplete: "new-password", error: passwordForm.formState.errors.newPassword?.message, ...passwordForm.register('newPassword') }), _jsx(Input, { label: "\u786E\u8BA4\u65B0\u5BC6\u7801", type: "password", autoComplete: "new-password", error: passwordForm.formState.errors.confirmPassword?.message, ...passwordForm.register('confirmPassword') }), _jsxs("div", { className: "flex items-center gap-3 pt-1", children: [_jsx(Button, { type: "submit", size: "sm", loading: updatePassword.isPending, children: "\u4FEE\u6539\u5BC6\u7801" }), pwSaved && _jsx("span", { className: "text-sm text-green-600", children: "\u5BC6\u7801\u5DF2\u4FEE\u6539" })] })] })] })] }));
}
