import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

// 内部 CRM API 客户端
export const crmApi = axios.create({
  baseURL: `${API_BASE}/api`,
})

// 客户门户 API 客户端
export const portalApi = axios.create({
  baseURL: `${API_BASE}/api/client`,
})

function attachTokenInterceptor(
  instance: typeof crmApi,
  getToken: () => string | null,
  onUnauthorized: () => void,
) {
  instance.interceptors.request.use((config) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })

  instance.interceptors.response.use(
    (res) => res,
    (err) => {
      if (err.response?.status === 401) {
        onUnauthorized()
      }
      return Promise.reject(err)
    },
  )
}

export { attachTokenInterceptor }
