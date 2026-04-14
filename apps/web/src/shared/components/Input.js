import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from 'react';
import { cn } from '@/shared/utils/cn';
export const Input = forwardRef(({ className, label, error, id, ...props }, ref) => {
    return (_jsxs("div", { className: "flex flex-col gap-1", children: [label && (_jsx("label", { htmlFor: id, className: "text-sm font-medium text-gray-700", children: label })), _jsx("input", { ref: ref, id: id, className: cn('rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-500', error && 'border-red-500 focus:border-red-500 focus:ring-red-500', className), ...props }), error && _jsx("p", { className: "text-xs text-red-600", children: error })] }));
});
Input.displayName = 'Input';
