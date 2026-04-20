import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

export const crmApi = axios.create({ baseURL: `${API_BASE}/api` })
export const portalApi = axios.create({ baseURL: `${API_BASE}/api/client` })

// 模块初始化时立即挂上拦截器，避免首次渲染时 useEffect 还未执行导致 token 丢失
crmApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('crm_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
crmApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) window.dispatchEvent(new Event('crm:unauthorized'))
    return Promise.reject(err)
  },
)

portalApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('portal_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
portalApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) window.dispatchEvent(new Event('portal:unauthorized'))
    return Promise.reject(err)
  },
)

// 保留兼容旧调用，现在是空操作
export function attachTokenInterceptor(
  _instance: typeof crmApi,
  _getToken: () => string | null,
  _onUnauthorized: () => void,
) {}
