import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { crmApi } from '@/shared/utils/request';
import { Badge } from '@/shared/components/Badge';
import { formatDate } from '@/shared/utils/format';
const typeConfig = {
    Call: { label: '电话', variant: 'blue' },
    Meeting: { label: '会面', variant: 'green' },
    Email: { label: '邮件', variant: 'yellow' },
    Note: { label: '备注', variant: 'gray' },
};
export default function ActivitiesPage() {
    const { data, isLoading } = useQuery({
        queryKey: ['activities'],
        queryFn: () => crmApi.get('/activities').then((r) => r.data),
    });
    return (_jsxs("div", { className: "p-6", children: [_jsxs("div", { className: "mb-6", children: [_jsx("h1", { className: "text-xl font-semibold text-gray-900", children: "\u9500\u552E\u6D3B\u52A8" }), _jsx("p", { className: "mt-0.5 text-sm text-gray-500", children: "\u6240\u6709\u8DDF\u8FDB\u8BB0\u5F55\u6C47\u603B" })] }), isLoading ? (_jsx("div", { className: "text-sm text-gray-500", children: "\u52A0\u8F7D\u4E2D..." })) : !data?.data.length ? (_jsx("div", { className: "py-12 text-center text-sm text-gray-500", children: "\u6682\u65E0\u6D3B\u52A8\u8BB0\u5F55" })) : (_jsx("div", { className: "rounded-lg border bg-white overflow-hidden", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-gray-50 border-b", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "\u7C7B\u578B" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "\u5185\u5BB9" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "\u5173\u8054\u5BF9\u8C61" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "\u65F6\u95F4" })] }) }), _jsx("tbody", { className: "divide-y divide-gray-100", children: data.data.map((act) => {
                                const cfg = typeConfig[act.activityType] ?? typeConfig['Note'];
                                return (_jsxs("tr", { className: "hover:bg-gray-50", children: [_jsx("td", { className: "px-4 py-3", children: _jsx(Badge, { variant: cfg.variant, children: cfg.label }) }), _jsx("td", { className: "px-4 py-3 text-gray-700 max-w-xs truncate", children: act.description ?? '—' }), _jsxs("td", { className: "px-4 py-3 text-gray-500", children: [act.clientId && (_jsx(Link, { to: `/app/clients/${act.clientId}`, className: "text-primary-600 hover:underline", children: "\u5BA2\u6237" })), act.leadId && (_jsx(Link, { to: `/app/leads/${act.leadId}`, className: "text-primary-600 hover:underline", children: "\u7EBF\u7D22" })), !act.clientId && !act.leadId && '—'] }), _jsx("td", { className: "px-4 py-3 text-gray-500", children: formatDate(act.activityDate) })] }, act.id));
                            }) })] }) }))] }));
}
