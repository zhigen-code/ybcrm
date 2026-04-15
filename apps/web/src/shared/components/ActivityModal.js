import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { crmApi } from '@/shared/utils/request';
import { Modal } from './Modal';
import { Button } from './Button';
import { Select } from './Select';
import { Textarea } from './Textarea';
import { Input } from './Input';
import { useOptionGroup, toSelectOptions } from '@/shared/hooks/useOptions';
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
export function ActivityModal({ title, onClose, onSubmit, loading }) {
    const { options: activityTypeOpts } = useOptionGroup('activity_type');
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const fileInputRef = useRef(null);
    const { register, handleSubmit, formState: { errors } } = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            activityType: activityTypeOpts[0]?.value ?? '',
            activityDate: new Date().toISOString().slice(0, 16),
        },
    });
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
        onSubmit({ ...formData, attachmentKeys });
    });
    const busy = uploading || loading;
    return (_jsx(Modal, { title: title, onClose: onClose, footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", onClick: onClose, disabled: busy, children: "\u53D6\u6D88" }), _jsx(Button, { loading: busy, onClick: handleSave, children: uploading ? '上传中...' : '保存' })] }), children: _jsxs("div", { className: "space-y-3", children: [_jsx(Select, { label: "\u8DDF\u8FDB\u7C7B\u578B", options: toSelectOptions(activityTypeOpts), ...register('activityType') }), _jsx(Textarea, { label: "\u5185\u5BB9", placeholder: "\u8BB0\u5F55\u672C\u6B21\u8DDF\u8FDB\u7684\u8981\u70B9...", ...register('description') }), _jsx(Input, { type: "datetime-local", label: "\u65F6\u95F4", error: errors.activityDate?.message, ...register('activityDate') }), _jsxs("div", { children: [_jsx("p", { className: "mb-1.5 text-sm font-medium text-gray-700", children: "\u9644\u4EF6\uFF08\u53EF\u9009\uFF09" }), _jsx("input", { ref: fileInputRef, type: "file", multiple: true, className: "hidden", onChange: (e) => addFiles(e.target.files) }), _jsxs("button", { type: "button", onClick: () => fileInputRef.current?.click(), className: "inline-flex items-center gap-1.5 rounded-md border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-600 hover:border-primary-400 hover:text-primary-600 transition-colors", children: [_jsx("svg", { className: "h-4 w-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" }) }), "\u9009\u62E9\u6587\u4EF6"] }), files.length > 0 && (_jsx("ul", { className: "mt-2 space-y-1.5", children: files.map((f, i) => (_jsxs("li", { className: "flex items-center gap-2 rounded-md bg-gray-50 px-3 py-1.5 text-sm", children: [_jsx("svg", { className: "h-4 w-4 flex-shrink-0 text-gray-400", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" }) }), _jsx("span", { className: "flex-1 truncate text-gray-700", children: f.name }), _jsx("span", { className: "flex-shrink-0 text-xs text-gray-400", children: formatSize(f.size) }), _jsx("button", { type: "button", onClick: () => removeFile(i), className: "flex-shrink-0 text-gray-400 hover:text-red-500", children: _jsx("svg", { className: "h-4 w-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) }) })] }, i))) })), uploadError && _jsx("p", { className: "mt-1 text-xs text-red-500", children: uploadError })] })] }) }));
}
