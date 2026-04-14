import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from 'react';
import { cn } from '@/shared/utils/cn';
export const Select = forwardRef(({ className, label, error, id, options, placeholder, ...props }, ref) => {
    return (_jsxs("div", { className: "flex flex-col gap-1", children: [label && (_jsx("label", { htmlFor: id, className: "text-sm font-medium text-gray-700", children: label })), _jsxs("select", { ref: ref, id: id, className: cn('rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-50', error && 'border-red-500 focus:border-red-500 focus:ring-red-500', className), ...props, children: [placeholder && _jsx("option", { value: "", children: placeholder }), options.map((o) => (_jsx("option", { value: o.value, children: o.label }, o.value)))] }), error && _jsx("p", { className: "text-xs text-red-600", children: error })] }));
});
Select.displayName = 'Select';
