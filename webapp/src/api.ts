import axios from 'axios'

export const API_BASE = 'http://192.168.0.28:5000/api'

// Las fotos son URLs públicas de MinIO — se usan directamente
export function photoUrl(key: string | null | undefined): string | null {
  if (!key) return null
  // Si ya es URL completa (nuevo formato MinIO) úsala directamente
  if (key.startsWith('http')) return key
  // Fallback para objectNames antiguos
  return `http://192.168.0.28:9000/biofield/${key}`
}

const api = axios.create({ baseURL: API_BASE })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry &&
        !error.config.url?.includes('/auth/refresh')) {
      error.config._retry = true
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) {
        try {
          const res = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken: refresh })
          localStorage.setItem('access_token', res.data.accessToken)
          localStorage.setItem('refresh_token', res.data.refreshToken)
          error.config.headers.Authorization = `Bearer ${res.data.accessToken}`
          return api(error.config)
        } catch {
          localStorage.clear()
          window.location.href = '/login'
        }
      } else {
        localStorage.clear()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
