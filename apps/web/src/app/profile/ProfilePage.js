import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { crmApi } from '@/shared/utils/request';
import { useCrmAuth } from '@/app/auth/CrmAuthContext';
import { Input } from '@/shared/components/Input';
import { Button } from '@/shared/components/Button';
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
export default function ProfilePage() {
    const { user, updateUser } = useCrmAuth();
    const [nameSaved, setNameSaved] = useState(false);
    const [pwSaved, setPwSaved] = useState(false);
    const nameForm = useForm({
        resolver: zodResolver(nameSchema),
        defaultValues: { name: user?.name ?? '' },
    });
    const passwordForm = useForm({
        resolver: zodResolver(passwordSchema),
    });
    const updateName = useMutation({
        mutationFn: (body) => crmApi.put('/auth/profile', body),
        onSuccess: (res) => {
            updateUser({ name: res.data.data.name });
            setNameSaved(true);
            setTimeout(() => setNameSaved(false), 3000);
        },
        onError: (err) => {
            const msg = err?.response?.data?.message ?? '操作失败';
            nameForm.setError('name', { message: msg });
        },
    });
    const updatePassword = useMutation({
        mutationFn: ({ currentPassword, newPassword }) => crmApi.put('/auth/profile', { currentPassword, newPassword }),
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
    return (_jsxs("div", { className: "p-4 sm:p-6 max-w-xl", children: [_jsx("h1", { className: "text-lg sm:text-xl font-semibold text-gray-900 mb-6", children: "\u4E2A\u4EBA\u8BBE\u7F6E" }), _jsxs("div", { className: "rounded-lg border bg-white p-4 sm:p-6 mb-6", children: [_jsx("h2", { className: "font-medium text-gray-900 mb-4", children: "\u57FA\u672C\u4FE1\u606F" }), _jsxs("div", { className: "mb-3 text-sm text-gray-500", children: ["\u90AE\u7BB1\uFF1A", _jsx("span", { className: "text-gray-700", children: user?.email })] }), _jsxs("form", { onSubmit: nameForm.handleSubmit((d) => updateName.mutate(d)), className: "space-y-3", children: [_jsx(Input, { label: "\u663E\u793A\u59D3\u540D", error: nameForm.formState.errors.name?.message, ...nameForm.register('name') }), _jsxs("div", { className: "flex items-center gap-3 pt-1", children: [_jsx(Button, { type: "submit", size: "sm", loading: updateName.isPending, children: "\u4FDD\u5B58\u59D3\u540D" }), nameSaved && _jsx("span", { className: "text-sm text-green-600", children: "\u5DF2\u4FDD\u5B58" })] })] })] }), _jsxs("div", { className: "rounded-lg border bg-white p-4 sm:p-6", children: [_jsx("h2", { className: "font-medium text-gray-900 mb-4", children: "\u4FEE\u6539\u5BC6\u7801" }), _jsxs("form", { onSubmit: passwordForm.handleSubmit((d) => updatePassword.mutate(d)), className: "space-y-3", children: [_jsx(Input, { label: "\u5F53\u524D\u5BC6\u7801", type: "password", autoComplete: "current-password", error: passwordForm.formState.errors.currentPassword?.message, ...passwordForm.register('currentPassword') }), _jsx(Input, { label: "\u65B0\u5BC6\u7801", type: "password", autoComplete: "new-password", error: passwordForm.formState.errors.newPassword?.message, ...passwordForm.register('newPassword') }), _jsx(Input, { label: "\u786E\u8BA4\u65B0\u5BC6\u7801", type: "password", autoComplete: "new-password", error: passwordForm.formState.errors.confirmPassword?.message, ...passwordForm.register('confirmPassword') }), _jsxs("div", { className: "flex items-center gap-3 pt-1", children: [_jsx(Button, { type: "submit", size: "sm", loading: updatePassword.isPending, children: "\u4FEE\u6539\u5BC6\u7801" }), pwSaved && _jsx("span", { className: "text-sm text-green-600", children: "\u5BC6\u7801\u5DF2\u4FEE\u6539" })] })] })] })] }));
}
