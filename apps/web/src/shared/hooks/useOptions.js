import { useQuery } from '@tanstack/react-query';
import { crmApi } from '@/shared/utils/request';
export function useOptions() {
    return useQuery({
        queryKey: ['options'],
        queryFn: () => crmApi.get('/options').then((r) => r.data.data),
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 30,
    });
}
export function useOptionGroup(groupKey) {
    const { data, ...rest } = useOptions();
    return { options: data?.[groupKey] ?? [], ...rest };
}
export function toSelectOptions(items) {
    return items.map((i) => ({ value: i.value, label: i.label }));
}
/** 根据 value 查找对应的 color，找不到时返回 'gray' */
export function getOptionColor(items, value) {
    return items.find((o) => o.value === value)?.color ?? 'gray';
}
/** 根据 value 查找对应的 label，找不到时返回 value 本身 */
export function getOptionLabel(items, value) {
    return items.find((o) => o.value === value)?.label ?? value;
}
