import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCrmAuth } from './CrmAuthContext';
import { crmApi } from '@/shared/utils/request';
import { Input } from '@/shared/components/Input';
import { Button } from '@/shared/components/Button';
import { useState, useEffect } from 'react';
const schema = z.object({
    email: z.string().email('请输入有效邮箱'),
    password: z.string().min(6, '密码至少 6 位'),
});
export default function CrmLoginPage() {
    const { login } = useCrmAuth();
    const navigate = useNavigate();
    const [serverError, setServerError] = useState('');
    const { data: publicSettings } = useQuery({
        queryKey: ['public-settings'],
        queryFn: () => crmApi.get('/public/settings').then((r) => r.data.data),
        staleTime: 1000 * 60 * 60,
    });
    const systemName = publicSettings?.systemName ?? 'CRM';
    useEffect(() => { document.title = systemName; }, [systemName]);
    const { register, handleSubmit, formState: { errors, isSubmitting }, } = useForm({ resolver: zodResolver(schema) });
    const onSubmit = async (data) => {
        setServerError('');
        try {
            await login(data.email, data.password);
            navigate('/app/leads', { replace: true });
        }
        catch {
            setServerError('邮箱或密码错误，请重试');
        }
    };
    return (_jsx("div", { className: "flex min-h-screen items-center justify-center bg-gray-50", children: _jsxs("div", { className: "w-full max-w-sm rounded-xl bg-white p-8 shadow-md", children: [_jsxs("div", { className: "mb-8 text-center", children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: systemName }), _jsx("p", { className: "mt-1 text-sm text-gray-500", children: "\u5185\u90E8\u7BA1\u7406\u7CFB\u7EDF" })] }), _jsxs("form", { onSubmit: handleSubmit(onSubmit), className: "space-y-4", children: [_jsx(Input, { id: "email", label: "\u90AE\u7BB1", type: "email", autoComplete: "username", placeholder: "you@company.com", error: errors.email?.message, ...register('email') }), _jsx(Input, { id: "password", label: "\u5BC6\u7801", type: "password", autoComplete: "current-password", placeholder: "\u8BF7\u8F93\u5165\u5BC6\u7801", error: errors.password?.message, ...register('password') }), serverError && (_jsx("p", { className: "rounded-md bg-red-50 px-3 py-2 text-sm text-red-600", children: serverError })), _jsx(Button, { type: "submit", className: "w-full", size: "lg", loading: isSubmitting, children: "\u767B\u5F55" })] })] }) }));
}
