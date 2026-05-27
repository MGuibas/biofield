import axios from 'axios'

const isLocal = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || 
   window.location.hostname === '127.0.0.1' || 
   window.location.hostname.startsWith('192.168.'));

export const API_BASE = isLocal 
  ? `http://${window.location.hostname}:5000/api` 
  : 'https://api.guibas.es/api';

export function photoUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  if (key.startsWith('http')) return key;
  
  if (isLocal) {
    return `http://${window.location.hostname}:9000/biofield/${key}`;
  }
  return `https://fotos.guibas.es/biofield/${key}`;
}

export function getAvatarUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  let cleanUrl = url;
  if (cleanUrl.startsWith('/avatars/')) {
    cleanUrl = `/api${cleanUrl}`;
  }
  const cleanApiBase = API_BASE.replace('/api', '');
  return `${cleanApiBase}${cleanUrl}`;
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
