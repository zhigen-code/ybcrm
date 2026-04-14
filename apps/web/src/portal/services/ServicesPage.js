import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from '@tanstack/react-query';
import { portalApi } from '@/shared/utils/request';
import { Badge } from '@/shared/components/Badge';
export default function PortalServicesPage() {
    const { data, isLoading } = useQuery({
        queryKey: ['portal', 'services'],
        queryFn: () => portalApi.get('/services').then((r) => r.data.data),
    });
    if (isLoading)
        return _jsx("div", { className: "text-sm text-gray-500", children: "\u52A0\u8F7D\u4E2D..." });
    if (!data?.length) {
        return (_jsxs("div", { className: "max-w-xl", children: [_jsx("h1", { className: "text-xl font-semibold text-gray-900 mb-6", children: "\u670D\u52A1\u8FDB\u5EA6" }), _jsx("div", { className: "rounded-xl border bg-white p-12 text-center text-sm text-gray-500", children: "\u6682\u65E0\u670D\u52A1\u8BB0\u5F55\uFF0C\u8BF7\u8054\u7CFB\u60A8\u7684\u987E\u95EE\u4E86\u89E3\u8BE6\u60C5" })] }));
    }
    return (_jsxs("div", { className: "max-w-2xl", children: [_jsx("h1", { className: "text-xl font-semibold text-gray-900 mb-6", children: "\u670D\u52A1\u8FDB\u5EA6" }), data.map((service) => {
                const steps = (() => {
                    try {
                        return JSON.parse(service.process_steps);
                    }
                    catch {
                        return [];
                    }
                })();
                return (_jsxs("div", { className: "rounded-xl border bg-white p-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900", children: service.name }), service.contractStatus && (_jsxs(Badge, { variant: service.contractStatus === '已签署' ? 'green' : 'yellow', children: ["\u5408\u540C", service.contractStatus] }))] }), service.description && (_jsx("p", { className: "mt-2 text-sm text-gray-500", children: service.description })), steps.length > 0 && (_jsxs("div", { className: "mt-6", children: [_jsx("p", { className: "text-xs font-medium text-gray-500 mb-3", children: "\u670D\u52A1\u6D41\u7A0B" }), _jsx("ol", { className: "relative border-l border-gray-200 space-y-4 ml-3", children: steps.map((step, i) => (_jsxs("li", { className: "ml-4", children: [_jsx("span", { className: "absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700", children: i + 1 }), _jsx("p", { className: "text-sm text-gray-700", children: step })] }, i))) })] }))] }, service.id));
            })] }));
}
