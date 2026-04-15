import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// phone / email 已独立为表单字段，这里只管理微信/WhatsApp/其他
const TYPE_OPTIONS = [
    { value: 'wechat', label: '微信', placeholder: '微信号', icon: '💬' },
    { value: 'whatsapp', label: 'WhatsApp', placeholder: 'WhatsApp', icon: '📲' },
    { value: 'other', label: '其他', placeholder: '联系方式', icon: '📌' },
];
export function getTypeLabel(type) {
    return TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}
export function getTypeIcon(type) {
    return TYPE_OPTIONS.find((o) => o.value === type)?.icon ?? '📌';
}
export function ContactMethodsEditor({ value, onChange, error }) {
    const add = () => onChange([...value, { type: 'wechat', value: '' }]);
    const remove = (i) => onChange(value.filter((_, idx) => idx !== i));
    const update = (i, field, v) => onChange(value.map((m, idx) => idx === i ? { ...m, [field]: v } : m));
    return (_jsxs("div", { children: [value.length > 0 && (_jsx("div", { className: "space-y-1.5 mb-1.5", children: value.map((method, i) => {
                    const opt = TYPE_OPTIONS.find((o) => o.value === method.type);
                    return (_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("select", { value: method.type, onChange: (e) => update(i, 'type', e.target.value), className: "w-20 shrink-0 rounded-md border border-gray-300 bg-white px-1.5 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500", children: TYPE_OPTIONS.map((o) => (_jsx("option", { value: o.value, children: o.label }, o.value))) }), _jsx("input", { type: "text", value: method.value, onChange: (e) => update(i, 'value', e.target.value), placeholder: opt?.placeholder ?? '联系方式', className: "min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" }), _jsx("button", { type: "button", onClick: () => remove(i), className: "shrink-0 text-gray-400 hover:text-red-500 text-xl leading-none px-1", title: "\u5220\u9664", children: "\u00D7" })] }, i));
                }) })), _jsx("button", { type: "button", onClick: add, className: "text-sm text-primary-600 hover:text-primary-800 font-medium", children: "+ \u6DFB\u52A0\u5FAE\u4FE1 / WhatsApp / \u5176\u4ED6" }), error && _jsx("p", { className: "mt-1 text-xs text-red-500", children: error })] }));
}
/** 只读展示微信/WhatsApp/其他联系方式 badge */
export function ContactMethodsDisplay({ methods, fallback }) {
    if (!methods || methods.length === 0) {
        return fallback ? _jsx("span", { className: "text-gray-500", children: fallback }) : null;
    }
    return (_jsx(_Fragment, { children: methods.map((m, i) => (_jsxs("span", { className: "inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs text-gray-700", children: [_jsx("span", { children: getTypeIcon(m.type) }), _jsx("span", { className: "text-gray-400", children: getTypeLabel(m.type) }), _jsx("span", { className: "font-medium", children: m.value })] }, i))) }));
}
