import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { crmApi } from '@/shared/utils/request';
function getFileType(name) {
    const ext = name.split('.').pop()?.toLowerCase() ?? '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext))
        return 'image';
    if (ext === 'pdf')
        return 'pdf';
    if (['mp3', 'wav', 'm4a', 'ogg', 'aac', 'flac', 'mp4', 'webm'].includes(ext))
        return 'audio';
    return 'other';
}
const FILE_ICONS = {
    image: '🖼',
    pdf: '📄',
    audio: '🎵',
    other: '📎',
};
function PreviewModal({ state, onClose }) {
    const fileType = getFileType(state.att.name);
    const handleDownload = () => {
        if (!state.objectUrl)
            return;
        const a = document.createElement('a');
        a.href = state.objectUrl;
        a.download = state.att.name;
        a.click();
    };
    return (_jsxs("div", { className: "fixed inset-0 z-50 flex flex-col bg-black/80", onClick: (e) => { if (e.target === e.currentTarget)
            onClose(); }, children: [_jsxs("div", { className: "flex shrink-0 items-center justify-between gap-4 px-4 py-3 text-white", children: [_jsx("span", { className: "truncate text-sm font-medium", children: state.att.name }), _jsxs("div", { className: "flex shrink-0 items-center gap-2", children: [_jsx("button", { onClick: handleDownload, disabled: !state.objectUrl, className: "rounded bg-white/10 px-3 py-1.5 text-xs hover:bg-white/20 disabled:opacity-40", children: "\u4E0B\u8F7D" }), _jsx("button", { onClick: onClose, className: "flex h-8 w-8 items-center justify-center rounded-full text-gray-300 hover:bg-white/10 text-xl", children: "\u00D7" })] })] }), _jsxs("div", { className: "flex flex-1 items-center justify-center overflow-hidden px-4 pb-4", children: [state.loading && (_jsx("div", { className: "text-sm text-gray-400", children: "\u52A0\u8F7D\u4E2D..." })), state.error && (_jsx("div", { className: "text-sm text-red-400", children: "\u6587\u4EF6\u52A0\u8F7D\u5931\u8D25" })), !state.loading && !state.error && state.objectUrl && (_jsxs(_Fragment, { children: [fileType === 'image' && (_jsx("img", { src: state.objectUrl, alt: state.att.name, className: "max-h-full max-w-full rounded object-contain" })), fileType === 'pdf' && (_jsx("iframe", { src: state.objectUrl, title: state.att.name, className: "h-full w-full rounded bg-white" })), fileType === 'audio' && (_jsxs("div", { className: "rounded-xl bg-white/10 p-8 text-center", children: [_jsx("div", { className: "mb-4 text-5xl", children: "\uD83C\uDFB5" }), _jsx("p", { className: "mb-4 text-sm text-gray-300 truncate max-w-xs", children: state.att.name }), _jsx("audio", { controls: true, src: state.objectUrl, className: "w-72 max-w-full" })] })), fileType === 'other' && (_jsxs("div", { className: "rounded-xl bg-white/10 p-8 text-center", children: [_jsx("div", { className: "mb-4 text-5xl", children: "\uD83D\uDCCE" }), _jsx("p", { className: "mb-4 text-sm text-gray-300", children: state.att.name }), _jsx("button", { onClick: handleDownload, className: "rounded bg-white/20 px-4 py-2 text-sm text-white hover:bg-white/30", children: "\u70B9\u51FB\u4E0B\u8F7D" })] }))] }))] })] }));
}
export function AttachmentList({ attachments }) {
    const [preview, setPreview] = useState(null);
    // 打开预览：先展示 loading，再异步拉取 blob
    const openPreview = async (att) => {
        const fileType = getFileType(att.name);
        setPreview({ att, objectUrl: null, loading: true, error: false });
        try {
            const res = await crmApi.get(`/upload/file?key=${encodeURIComponent(att.key)}`, {
                responseType: 'blob',
            });
            const url = URL.createObjectURL(res.data);
            setPreview({ att, objectUrl: url, loading: false, error: false });
            // 不支持预览的直接触发下载
            if (fileType === 'other') {
                const a = document.createElement('a');
                a.href = url;
                a.download = att.name;
                a.click();
                URL.revokeObjectURL(url);
                setPreview(null);
            }
        }
        catch {
            setPreview({ att, objectUrl: null, loading: false, error: true });
        }
    };
    const closePreview = () => {
        if (preview?.objectUrl)
            URL.revokeObjectURL(preview.objectUrl);
        setPreview(null);
    };
    // 组件卸载时释放 URL
    useEffect(() => {
        return () => {
            if (preview?.objectUrl)
                URL.revokeObjectURL(preview.objectUrl);
        };
    }, [preview?.objectUrl]);
    if (!attachments || attachments.length === 0)
        return null;
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: "mt-2 flex flex-wrap gap-1.5", children: attachments.map((att) => {
                    const fileType = getFileType(att.name);
                    return (_jsxs("button", { type: "button", onClick: () => openPreview(att), className: "inline-flex items-center gap-1 rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-100 hover:text-primary-600 transition-colors", title: att.name, children: [_jsx("span", { children: FILE_ICONS[fileType] }), _jsx("span", { className: "max-w-[120px] truncate", children: att.name })] }, att.key));
                }) }), preview && _jsx(PreviewModal, { state: preview, onClose: closePreview })] }));
}
