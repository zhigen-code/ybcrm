import { format, formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
export function formatDate(date) {
    return format(new Date(date), 'yyyy-MM-dd HH:mm', { locale: zhCN });
}
export function formatRelativeTime(date) {
    return formatDistanceToNow(new Date(date), { locale: zhCN, addSuffix: true });
}
export function formatFileSize(bytes) {
    if (bytes < 1024)
        return `${bytes} B`;
    if (bytes < 1024 * 1024)
        return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
