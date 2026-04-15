import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { crmApi } from '@/shared/utils/request';
import { Badge } from '@/shared/components/Badge';
import { Input } from '@/shared/components/Input';
import { Button } from '@/shared/components/Button';
import { AttachmentList } from '@/shared/components/AttachmentList';
import { formatDate } from '@/shared/utils/format';
const typeConfig = {
    Call: { label: '电话', variant: 'blue' },
    Meeting: { label: '会面', variant: 'green' },
    Email: { label: '邮件', variant: 'yellow' },
    Note: { label: '备注', variant: 'gray' },
};
const PAGE_SIZE = 20;
function RelatedLink({ act }) {
    if (act.clientId) {
        return (_jsx(Link, { to: `/app/clients/${act.clientId}`, className: "text-primary-600 hover:underline", children: act.clientName ?? '客户' }));
    }
    if (act.leadId) {
        return (_jsx(Link, { to: `/app/leads/${act.leadId}`, className: "text-primary-600 hover:underline", children: act.leadName ?? '线索' }));
    }
    return _jsx("span", { className: "text-gray-400", children: "\u2014" });
}
export default function ActivitiesPage() {
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);
    const { data, isLoading } = useQuery({
        queryKey: ['activities', { search: debouncedSearch, page }],
        queryFn: () => {
            const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
            if (debouncedSearch)
                params.set('search', debouncedSearch);
            return crmApi
                .get(`/activities?${params}`)
                .then((r) => r.data);
        },
    });
    const activities = data?.data ?? [];
    const total = data?.total ?? 0;
    const totalPages = Math.ceil(total / PAGE_SIZE);
    return (_jsxs("div", { className: "p-4 sm:p-6", children: [_jsxs("div", { className: "mb-4 sm:mb-6", children: [_jsx("h1", { className: "text-xl font-semibold text-gray-900", children: "\u9500\u552E\u6D3B\u52A8" }), _jsx("p", { className: "mt-0.5 text-sm text-gray-500", children: "\u6240\u6709\u8DDF\u8FDB\u8BB0\u5F55\u6C47\u603B" })] }), _jsx("div", { className: "mb-4", children: _jsx(Input, { placeholder: "\u641C\u7D22\u5185\u5BB9\u3001\u5173\u8054\u5BA2\u6237/\u7EBF\u7D22\u540D\u79F0\u3001\u8DDF\u8FDB\u4EBA...", value: search, onChange: (e) => setSearch(e.target.value) }) }), isLoading ? (_jsx("div", { className: "py-12 text-center text-sm text-gray-500", children: "\u52A0\u8F7D\u4E2D..." })) : activities.length === 0 ? (_jsx("div", { className: "py-12 text-center text-sm text-gray-500", children: debouncedSearch ? '未找到匹配记录' : '暂无活动记录' })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "space-y-3 sm:hidden", children: activities.map((act) => {
                            const cfg = typeConfig[act.activityType] ?? typeConfig['Note'];
                            return (_jsxs("div", { className: "rounded-lg border bg-white p-4", children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx(Badge, { variant: cfg.variant, children: cfg.label }), _jsx("span", { className: "text-xs text-gray-400", children: formatDate(act.activityDate) })] }), _jsx("p", { className: "text-sm text-gray-700 line-clamp-3", children: act.description ?? '—' }), _jsx(AttachmentList, { attachments: act.attachments }), _jsxs("div", { className: "flex items-center justify-between text-xs text-gray-500 mt-2", children: [_jsxs("span", { children: ["\u5173\u8054\uFF1A", _jsx(RelatedLink, { act: act })] }), act.userName && _jsx("span", { children: act.userName })] })] }, act.id));
                        }) }), _jsx("div", { className: "hidden sm:block rounded-lg border bg-white overflow-hidden", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-gray-50 border-b", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "\u7C7B\u578B" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "\u5185\u5BB9" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "\u5173\u8054\u5BF9\u8C61" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "\u8DDF\u8FDB\u4EBA" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "\u65F6\u95F4" })] }) }), _jsx("tbody", { className: "divide-y divide-gray-100", children: activities.map((act) => {
                                        const cfg = typeConfig[act.activityType] ?? typeConfig['Note'];
                                        return (_jsxs("tr", { className: "hover:bg-gray-50", children: [_jsx("td", { className: "px-4 py-3", children: _jsx(Badge, { variant: cfg.variant, children: cfg.label }) }), _jsxs("td", { className: "px-4 py-3 text-gray-700 max-w-xs", children: [_jsx("div", { className: "truncate", children: act.description ?? '—' }), _jsx(AttachmentList, { attachments: act.attachments })] }), _jsx("td", { className: "px-4 py-3 text-gray-500", children: _jsx(RelatedLink, { act: act }) }), _jsx("td", { className: "px-4 py-3 text-gray-500", children: act.userName ?? '—' }), _jsx("td", { className: "px-4 py-3 text-gray-500", children: formatDate(act.activityDate) })] }, act.id));
                                    }) })] }) }), totalPages > 1 && (_jsxs("div", { className: "mt-4 flex items-center justify-between text-sm text-gray-600", children: [_jsxs("span", { children: ["\u5171 ", total, " \u6761\uFF0C\u7B2C ", page, " / ", totalPages, " \u9875"] }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { variant: "secondary", size: "sm", disabled: page <= 1, onClick: () => setPage((p) => p - 1), children: "\u4E0A\u4E00\u9875" }), _jsx(Button, { variant: "secondary", size: "sm", disabled: page >= totalPages, onClick: () => setPage((p) => p + 1), children: "\u4E0B\u4E00\u9875" })] })] }))] }))] }));
}
