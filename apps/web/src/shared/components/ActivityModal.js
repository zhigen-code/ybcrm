import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { crmApi } from '@/shared/utils/request';
import { Modal } from './Modal';
import { Button } from './Button';
import { Textarea } from './Textarea';
import { Input } from './Input';
import { useOptionGroup, useOptions, toSelectOptions } from '@/shared/hooks/useOptions';
const schema = z.object({
    activityType: z.string().min(1, '请选择跟进类型'),
    description: z.string().optional(),
    activityDate: z.string().min(1, '请选择时间'),
});
function formatSize(bytes) {
    if (bytes < 1024)
        return `${bytes} B`;
    if (bytes < 1024 * 1024)
        return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
export function ActivityModal({ title, onClose, onSubmit, loading, policyConfig, initialPolicyValues, serverError, }) {
    const { options: allActivityTypeOpts } = useOptionGroup('activity_type');
    const activityTypeOpts = allActivityTypeOpts.filter((o) => o.value !== 'System');
    const { data: allOptions } = useOptions();
    const hasServicesField = policyConfig?.requiredFields?.some((f) => f.type === 'services') ?? false;
    const { data: servicesData } = useQuery({
        queryKey: ['services'],
        queryFn: () => crmApi.get('/services').then((r) => r.data),
        enabled: hasServicesField,
        staleTime: 1000 * 60 * 5,
    });
    const services = servicesData?.data ?? [];
    const [policyFields, setPolicyFields] = useState(initialPolicyValues ?? {});
    const [policyError, setPolicyError] = useState('');
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const fileInputRef = useRef(null);
    const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            activityType: activityTypeOpts[0]?.value ?? '',
            activityDate: new Date().toISOString().slice(0, 16),
        },
    });
    const description = watch('description');
    const setPolicyField = (field, value) => {
        setPolicyFields((prev) => ({ ...prev, [field]: value }));
        setPolicyError('');
    };
    const addFiles = (incoming) => {
        if (!incoming)
            return;
        setFiles((prev) => [...prev, ...Array.from(incoming)]);
        setUploadError('');
    };
    const removeFile = (idx) => {
        setFiles((prev) => prev.filter((_, i) => i !== idx));
    };
    const handleSave = handleSubmit(async (formData) => {
        // 校验策略必填字段
        if (policyConfig?.activityContentRequired && !formData.description?.trim()) {
            setPolicyError('请填写跟进内容');
            return;
        }
        for (const rf of policyConfig?.requiredFields ?? []) {
            const val = policyFields[rf.field];
            if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
                setPolicyError(`请填写${rf.label}`);
                return;
            }
        }
        setUploadError('');
        let attachmentKeys = [];
        if (files.length > 0) {
            setUploading(true);
            try {
                const results = await Promise.all(files.map(async (file) => {
                    const fd = new FormData();
                    fd.append('file', file);
                    const res = await crmApi.post('/upload/internal', fd);
                    return res.data.data;
                }));
                attachmentKeys = results;
            }
            catch {
                setUploadError('文件上传失败，请重试');
                setUploading(false);
                return;
            }
            setUploading(false);
        }
        onSubmit({
            ...formData,
            attachmentKeys,
            policyFields: Object.keys(policyFields).length > 0 ? policyFields : undefined,
        });
    });
    const busy = uploading || loading;
    return (_jsx(Modal, { title: title, onClose: onClose, footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", onClick: onClose, disabled: busy, children: "\u53D6\u6D88" }), _jsx(Button, { loading: busy, onClick: handleSave, children: uploading ? '上传中...' : '保存' })] }), children: _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs text-gray-500 mb-1", children: "\u8DDF\u8FDB\u7C7B\u578B" }), _jsx("select", { className: "w-full h-8 rounded-md border border-gray-300 bg-white px-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500", ...register('activityType'), children: toSelectOptions(activityTypeOpts).map((o) => (_jsx("option", { value: o.value, children: o.label }, o.value))) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs text-gray-500 mb-1", children: "\u65F6\u95F4" }), _jsx("input", { type: "datetime-local", className: "w-full h-8 rounded-md border border-gray-300 px-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500", ...register('activityDate') }), errors.activityDate?.message && (_jsx("p", { className: "mt-0.5 text-xs text-red-600", children: errors.activityDate.message }))] })] }), (policyConfig?.contentPresets?.length ?? 0) > 0 && (_jsxs("div", { children: [_jsx("p", { className: "mb-1.5 text-xs text-gray-500", children: "\u5FEB\u901F\u9009\u62E9" }), _jsx("div", { className: "flex flex-wrap gap-1.5", children: policyConfig.contentPresets.map((preset) => (_jsx("button", { type: "button", onClick: () => setValue('description', preset), className: `rounded-full px-3 py-1 text-xs font-medium border transition-colors ${description === preset
                                    ? 'bg-primary-600 text-white border-primary-600'
                                    : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400'}`, children: preset }, preset))) })] })), _jsx(Textarea, { label: policyConfig?.activityContentRequired ? '内容（必填）' : '内容', placeholder: "\u8BB0\u5F55\u672C\u6B21\u8DDF\u8FDB\u7684\u8981\u70B9...", ...register('description') }), (policyConfig?.requiredFields?.length ?? 0) > 0 && (_jsxs("div", { className: "border-t pt-3 space-y-3", children: [_jsx("p", { className: "text-xs font-medium text-gray-500 uppercase tracking-wide", children: "\u5FC5\u586B\u4FE1\u606F" }), policyConfig.requiredFields.map((rf) => {
                            if (rf.type === 'select' && rf.optionGroup) {
                                const opts = allOptions?.[rf.optionGroup] ?? [];
                                return (_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: rf.label }), _jsxs("select", { className: "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500", value: policyFields[rf.field] ?? '', onChange: (e) => setPolicyField(rf.field, e.target.value), children: [_jsx("option", { value: "", children: "\u8BF7\u9009\u62E9..." }), toSelectOptions(opts).map((o) => (_jsx("option", { value: o.value, children: o.label }, o.value)))] })] }, rf.field));
                            }
                            if (rf.type === 'datetime') {
                                return (_jsx(Input, { type: "datetime-local", label: rf.label, value: policyFields[rf.field] ?? '', onChange: (e) => setPolicyField(rf.field, e.target.value) }, rf.field));
                            }
                            if (rf.type === 'services') {
                                const selected = policyFields[rf.field] ?? [];
                                return (_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-700 mb-1.5", children: rf.label }), _jsx("div", { className: "flex flex-wrap gap-2", children: services.map((svc) => (_jsx("button", { type: "button", onClick: () => {
                                                    const next = selected.includes(svc.name)
                                                        ? selected.filter((s) => s !== svc.name)
                                                        : [...selected, svc.name];
                                                    setPolicyField(rf.field, next);
                                                }, className: `rounded-full px-3 py-1 text-sm font-medium border transition-colors ${selected.includes(svc.name)
                                                    ? 'bg-primary-600 text-white border-primary-600'
                                                    : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400'}`, children: svc.name }, svc.id))) })] }, rf.field));
                            }
                            return null;
                        })] })), (policyError || serverError) && (_jsx("p", { className: "text-sm text-red-500", children: policyError || serverError })), _jsxs("div", { children: [_jsx("p", { className: "mb-1.5 text-sm font-medium text-gray-700", children: "\u9644\u4EF6\uFF08\u53EF\u9009\uFF09" }), _jsx("input", { ref: fileInputRef, type: "file", multiple: true, className: "hidden", onChange: (e) => addFiles(e.target.files) }), _jsxs("button", { type: "button", onClick: () => fileInputRef.current?.click(), className: "inline-flex items-center gap-1.5 rounded-md border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-600 hover:border-primary-400 hover:text-primary-600 transition-colors", children: [_jsx("svg", { className: "h-4 w-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" }) }), "\u9009\u62E9\u6587\u4EF6"] }), files.length > 0 && (_jsx("ul", { className: "mt-2 space-y-1.5", children: files.map((f, i) => (_jsxs("li", { className: "flex items-center gap-2 rounded-md bg-gray-50 px-3 py-1.5 text-sm", children: [_jsx("svg", { className: "h-4 w-4 flex-shrink-0 text-gray-400", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" }) }), _jsx("span", { className: "flex-1 truncate text-gray-700", children: f.name }), _jsx("span", { className: "flex-shrink-0 text-xs text-gray-400", children: formatSize(f.size) }), _jsx("button", { type: "button", onClick: () => removeFile(i), className: "flex-shrink-0 text-gray-400 hover:text-red-500", children: _jsx("svg", { className: "h-4 w-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) }) })] }, i))) })), uploadError && _jsx("p", { className: "mt-1 text-xs text-red-500", children: uploadError })] })] }) }));
}
