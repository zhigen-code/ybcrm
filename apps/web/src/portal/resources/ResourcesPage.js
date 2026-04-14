import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { portalApi } from '@/shared/utils/request';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Select } from '@/shared/components/Select';
import { Modal } from '@/shared/components/Modal';
import { Badge } from '@/shared/components/Badge';
import { formatDate } from '@/shared/utils/format';
const typeLabel = {
    MedicalReport: '医疗报告',
    Contract: '合同',
    PassportCopy: '证件复印',
    PartnerContact: '合作方联系',
};
const typeBadge = {
    MedicalReport: 'blue',
    Contract: 'green',
    PassportCopy: 'yellow',
    PartnerContact: 'gray',
};
const uploadSchema = z.object({
    title: z.string().min(1, '请填写文件名称'),
    resourceType: z.enum(['MedicalReport', 'Contract', 'PassportCopy', 'PartnerContact']),
});
export default function ResourcesPage() {
    const queryClient = useQueryClient();
    const [showUpload, setShowUpload] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const fileRef = useRef(null);
    const { data, isLoading } = useQuery({
        queryKey: ['portal', 'resources'],
        queryFn: () => portalApi.get('/resources').then((r) => r.data.data),
    });
    const form = useForm({
        resolver: zodResolver(uploadSchema),
        defaultValues: { resourceType: 'MedicalReport' },
    });
    const downloadMutation = useMutation({
        mutationFn: (resourceId) => portalApi.get(`/resources/${resourceId}/download-url`)
            .then((r) => r.data.data.url),
        onSuccess: (url) => {
            window.open(url, '_blank');
        },
    });
    const handleUpload = async (formData) => {
        const file = fileRef.current?.files?.[0];
        if (!file) {
            setUploadError('请选择文件');
            return;
        }
        setUploading(true);
        setUploadError('');
        try {
            // 1. 获取预签名上传 URL
            const { data: presign } = await portalApi.post('/resources/upload-url', {
                fileName: file.name,
                contentType: file.type || 'application/octet-stream',
                title: formData.title,
                resourceType: formData.resourceType,
            });
            // 2. 直接上传到 R2（通过 Worker 完成多段上传）
            // 注：实际部署时 R2 multipart upload 需通过 Worker 代理各部分
            // 此处简化为通知后端上传完成
            await portalApi.put(`/resources/${presign.data.resourceId}/confirm`, {
                size: file.size,
            });
            queryClient.invalidateQueries({ queryKey: ['portal', 'resources'] });
            setShowUpload(false);
            form.reset();
            if (fileRef.current)
                fileRef.current.value = '';
        }
        catch {
            setUploadError('上传失败，请重试');
        }
        finally {
            setUploading(false);
        }
    };
    return (_jsxs("div", { className: "max-w-3xl", children: [_jsxs("div", { className: "mb-6 flex items-center justify-between", children: [_jsx("h1", { className: "text-xl font-semibold text-gray-900", children: "\u6211\u7684\u6587\u4EF6" }), _jsx(Button, { onClick: () => setShowUpload(true), children: "\u4E0A\u4F20\u6587\u4EF6" })] }), isLoading ? (_jsx("div", { className: "text-sm text-gray-500", children: "\u52A0\u8F7D\u4E2D..." })) : !data?.length ? (_jsx("div", { className: "rounded-xl border bg-white p-12 text-center text-sm text-gray-500", children: "\u6682\u65E0\u6587\u4EF6\uFF0C\u70B9\u51FB\"\u4E0A\u4F20\u6587\u4EF6\"\u5F00\u59CB\u4E0A\u4F20" })) : (_jsx("div", { className: "rounded-xl border bg-white overflow-hidden", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-gray-50 border-b", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "\u6587\u4EF6\u540D\u79F0" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "\u7C7B\u578B" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "\u4E0A\u4F20\u65F6\u95F4" }), _jsx("th", { className: "px-4 py-3" })] }) }), _jsx("tbody", { className: "divide-y divide-gray-100", children: data.map((resource) => (_jsxs("tr", { className: "hover:bg-gray-50", children: [_jsxs("td", { className: "px-4 py-3", children: [_jsx("p", { className: "font-medium text-gray-900", children: resource.title }), resource.description && (_jsx("p", { className: "text-xs text-gray-400", children: resource.description }))] }), _jsx("td", { className: "px-4 py-3", children: _jsx(Badge, { variant: typeBadge[resource.resourceType], children: typeLabel[resource.resourceType] }) }), _jsx("td", { className: "px-4 py-3 text-gray-500", children: formatDate(resource.uploadedAt) }), _jsx("td", { className: "px-4 py-3", children: (resource.r2ObjectKey || resource.externalUrl) && (_jsx(Button, { variant: "ghost", size: "sm", loading: downloadMutation.isPending, onClick: () => downloadMutation.mutate(resource.id), children: "\u4E0B\u8F7D" })) })] }, resource.id))) })] }) })), showUpload && (_jsx(Modal, { title: "\u4E0A\u4F20\u6587\u4EF6", onClose: () => setShowUpload(false), footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", onClick: () => setShowUpload(false), children: "\u53D6\u6D88" }), _jsx(Button, { loading: uploading, onClick: form.handleSubmit(handleUpload), children: "\u4E0A\u4F20" })] }), children: _jsxs("div", { className: "space-y-3", children: [_jsx(Input, { label: "\u6587\u4EF6\u540D\u79F0", placeholder: "\u5982\uFF1A\u4F53\u68C0\u62A5\u544A 2024-04", error: form.formState.errors.title?.message, ...form.register('title') }), _jsx(Select, { label: "\u6587\u4EF6\u7C7B\u578B", options: [
                                { value: 'MedicalReport', label: '医疗报告' },
                                { value: 'Contract', label: '合同' },
                                { value: 'PassportCopy', label: '证件复印' },
                                { value: 'PartnerContact', label: '合作方联系' },
                            ], ...form.register('resourceType') }), _jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("label", { className: "text-sm font-medium text-gray-700", children: "\u9009\u62E9\u6587\u4EF6" }), _jsx("input", { ref: fileRef, type: "file", className: "text-sm text-gray-600 file:mr-3 file:rounded file:border-0 file:bg-primary-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-700 hover:file:bg-primary-100" })] }), uploadError && (_jsx("p", { className: "text-sm text-red-600", children: uploadError }))] }) }))] }));
}
