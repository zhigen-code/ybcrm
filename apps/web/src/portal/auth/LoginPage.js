import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { usePortalAuth } from './PortalAuthContext';
import { crmApi } from '@/shared/utils/request';
import { Input } from '@/shared/components/Input';
import { Button } from '@/shared/components/Button';
const passwordSchema = z.object({
    email: z.string().email('请输入有效邮箱'),
    password: z.string().min(6, '密码至少 6 位'),
});
const magicLinkSchema = z.object({
    email: z.string().email('请输入有效邮箱'),
});
export default function PortalLoginPage() {
    const { login, sendMagicLink, verifyMagicLink } = usePortalAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [mode, setMode] = useState('password');
    const [magicLinkSent, setMagicLinkSent] = useState(false);
    const [serverError, setServerError] = useState('');
    const { data: publicSettings } = useQuery({
        queryKey: ['public-settings'],
        queryFn: () => crmApi.get('/public/settings').then((r) => r.data.data),
        staleTime: 1000 * 60 * 60,
    });
    const systemName = publicSettings?.systemName ?? '客户服务门户';
    useEffect(() => { document.title = systemName; }, [systemName]);
    // 处理 Magic Link 回调
    useEffect(() => {
        const token = searchParams.get('token');
        if (token) {
            verifyMagicLink(token)
                .then(() => navigate('/portal/profile', { replace: true }))
                .catch(() => setServerError('链接已失效，请重新登录'));
        }
    }, [searchParams, verifyMagicLink, navigate]);
    const passwordForm = useForm({ resolver: zodResolver(passwordSchema) });
    const magicLinkForm = useForm({ resolver: zodResolver(magicLinkSchema) });
    const onPasswordSubmit = async (data) => {
        setServerError('');
        try {
            await login(data.email, data.password);
            navigate('/portal/profile', { replace: true });
        }
        catch {
            setServerError('邮箱或密码错误，请重试');
        }
    };
    const onMagicLinkSubmit = async (data) => {
        setServerError('');
        try {
            await sendMagicLink(data.email);
            setMagicLinkSent(true);
        }
        catch {
            setServerError('发送失败，请检查邮箱是否正确');
        }
    };
    return (_jsx("div", { className: "flex min-h-screen items-center justify-center bg-gray-50", children: _jsxs("div", { className: "w-full max-w-sm rounded-xl bg-white p-8 shadow-md", children: [_jsxs("div", { className: "mb-8 text-center", children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: systemName }), _jsx("p", { className: "mt-1 text-sm text-gray-500", children: "\u6B22\u8FCE\u56DE\u6765\uFF0C\u8BF7\u767B\u5F55\u67E5\u770B\u60A8\u7684\u670D\u52A1\u8FDB\u5EA6" })] }), _jsxs("div", { className: "mb-6 flex rounded-lg border p-1", children: [_jsx("button", { onClick: () => setMode('password'), className: `flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${mode === 'password' ? 'bg-primary-600 text-white' : 'text-gray-500 hover:text-gray-700'}`, children: "\u5BC6\u7801\u767B\u5F55" }), _jsx("button", { onClick: () => setMode('magiclink'), className: `flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${mode === 'magiclink' ? 'bg-primary-600 text-white' : 'text-gray-500 hover:text-gray-700'}`, children: "\u90AE\u4EF6\u4E00\u952E\u767B\u5F55" })] }), mode === 'password' ? (_jsxs("form", { onSubmit: passwordForm.handleSubmit(onPasswordSubmit), className: "space-y-4", children: [_jsx(Input, { id: "email", label: "\u90AE\u7BB1", type: "email", autoComplete: "username", placeholder: "your@email.com", error: passwordForm.formState.errors.email?.message, ...passwordForm.register('email') }), _jsx(Input, { id: "password", label: "\u5BC6\u7801", type: "password", autoComplete: "current-password", placeholder: "\u8BF7\u8F93\u5165\u5BC6\u7801", error: passwordForm.formState.errors.password?.message, ...passwordForm.register('password') }), serverError && (_jsx("p", { className: "rounded-md bg-red-50 px-3 py-2 text-sm text-red-600", children: serverError })), _jsx(Button, { type: "submit", className: "w-full", size: "lg", loading: passwordForm.formState.isSubmitting, children: "\u767B\u5F55" })] })) : magicLinkSent ? (_jsxs("div", { className: "rounded-lg bg-green-50 p-4 text-center text-sm text-green-700", children: [_jsx("p", { className: "font-medium", children: "\u767B\u5F55\u94FE\u63A5\u5DF2\u53D1\u9001\uFF01" }), _jsx("p", { className: "mt-1", children: "\u8BF7\u67E5\u6536\u90AE\u4EF6\u5E76\u70B9\u51FB\u94FE\u63A5\u5B8C\u6210\u767B\u5F55\u3002\u94FE\u63A5 15 \u5206\u949F\u5185\u6709\u6548\u3002" }), _jsx("button", { onClick: () => setMagicLinkSent(false), className: "mt-3 text-green-600 underline", children: "\u91CD\u65B0\u53D1\u9001" })] })) : (_jsxs("form", { onSubmit: magicLinkForm.handleSubmit(onMagicLinkSubmit), className: "space-y-4", children: [_jsx(Input, { id: "ml-email", label: "\u90AE\u7BB1", type: "email", placeholder: "your@email.com", error: magicLinkForm.formState.errors.email?.message, ...magicLinkForm.register('email') }), serverError && (_jsx("p", { className: "rounded-md bg-red-50 px-3 py-2 text-sm text-red-600", children: serverError })), _jsx(Button, { type: "submit", className: "w-full", size: "lg", loading: magicLinkForm.formState.isSubmitting, children: "\u53D1\u9001\u767B\u5F55\u94FE\u63A5" })] }))] }) }));
}
