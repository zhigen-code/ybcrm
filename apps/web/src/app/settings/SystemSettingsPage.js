import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import { crmApi } from '@/shared/utils/request';
import { Input } from '@/shared/components/Input';
import { Button } from '@/shared/components/Button';
import { Select } from '@/shared/components/Select';
const schema = z.object({
    system_name: z.string().min(1, '请填写系统名称'),
    smtp_host: z.string(),
    smtp_port: z.string(),
    smtp_secure: z.string(),
    smtp_user: z.string(),
    smtp_password: z.string(),
    smtp_from_email: z.string(),
    smtp_from_name: z.string(),
});
export default function SystemSettingsPage() {
    const queryClient = useQueryClient();
    const [saved, setSaved] = useState(false);
    const { data, isLoading } = useQuery({
        queryKey: ['system-settings'],
        queryFn: () => crmApi.get('/admin/settings').then((r) => r.data.data),
    });
    const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            system_name: '', smtp_host: '', smtp_port: '465',
            smtp_secure: 'true', smtp_user: '', smtp_password: '', smtp_from_email: '', smtp_from_name: '',
        },
    });
    useEffect(() => {
        if (data)
            reset(data);
    }, [data, reset]);
    const saveMutation = useMutation({
        mutationFn: (body) => crmApi.put('/admin/settings', body),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['system-settings'] });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        },
    });
    if (isLoading)
        return _jsx("div", { className: "p-6 text-sm text-gray-500", children: "\u52A0\u8F7D\u4E2D..." });
    return (_jsxs("div", { className: "p-4 sm:p-6 max-w-2xl", children: [_jsx("h1", { className: "text-lg sm:text-xl font-semibold text-gray-900 mb-6", children: "\u7CFB\u7EDF\u7BA1\u7406" }), _jsxs("form", { onSubmit: handleSubmit((d) => saveMutation.mutate(d)), className: "space-y-6", children: [_jsxs("div", { className: "rounded-lg border bg-white p-4 sm:p-6", children: [_jsx("h2", { className: "font-medium text-gray-900 mb-4", children: "\u57FA\u672C\u914D\u7F6E" }), _jsx("div", { className: "space-y-3", children: _jsx(Input, { label: "\u7CFB\u7EDF\u540D\u79F0", error: errors.system_name?.message, ...register('system_name') }) })] }), _jsxs("div", { className: "rounded-lg border bg-white p-4 sm:p-6", children: [_jsx("h2", { className: "font-medium text-gray-900 mb-1", children: "\u90AE\u4EF6\u670D\u52A1\u5668\u914D\u7F6E" }), _jsx("p", { className: "text-xs text-gray-500 mb-4", children: "\u7528\u4E8E\u53D1\u9001\u901A\u77E5\u90AE\u4EF6\u3001\u9B54\u6CD5\u94FE\u63A5\u7B49\u7CFB\u7EDF\u90AE\u4EF6" }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-3", children: [_jsx("div", { className: "sm:col-span-2", children: _jsx(Input, { label: "SMTP \u670D\u52A1\u5668", placeholder: "smtp.example.com", ...register('smtp_host') }) }), _jsx(Input, { label: "\u7AEF\u53E3", placeholder: "465", ...register('smtp_port') })] }), _jsx(Select, { label: "\u52A0\u5BC6\u65B9\u5F0F", options: [
                                            { value: 'true', label: 'SSL/TLS（推荐）' },
                                            { value: 'false', label: '不加密' },
                                        ], ...register('smtp_secure') }), _jsx(Input, { label: "\u8D26\u53F7\uFF08\u7528\u6237\u540D\uFF09", placeholder: "your@email.com", ...register('smtp_user') }), _jsx(Input, { label: "\u5BC6\u7801 / \u6388\u6743\u7801", type: "password", autoComplete: "new-password", placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", ...register('smtp_password') }), _jsx(Input, { label: "\u53D1\u4EF6\u4EBA\u90AE\u7BB1", placeholder: "noreply@example.com", ...register('smtp_from_email') }), _jsx(Input, { label: "\u53D1\u4EF6\u4EBA\u540D\u79F0", placeholder: "\u8F85\u52A9\u751F\u6B96 CRM", ...register('smtp_from_name') })] })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Button, { type: "submit", loading: isSubmitting || saveMutation.isPending, children: "\u4FDD\u5B58\u8BBE\u7F6E" }), saved && _jsx("span", { className: "text-sm text-green-600", children: "\u5DF2\u4FDD\u5B58" })] })] })] }));
}
