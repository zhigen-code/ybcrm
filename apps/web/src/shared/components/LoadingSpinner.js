import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from '@/shared/utils/cn';
export function LoadingSpinner({ fullScreen, size = 'md' }) {
    const sizeClass = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' }[size];
    const spinner = (_jsx("div", { className: cn('animate-spin rounded-full border-2 border-gray-300 border-t-primary-600', sizeClass) }));
    if (fullScreen) {
        return (_jsx("div", { className: "flex h-screen items-center justify-center", children: spinner }));
    }
    return spinner;
}
