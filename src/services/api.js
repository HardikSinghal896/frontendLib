import axios from 'axios'

// const API = axios.create({
//   baseURL: 'http://10.14.155.240:8080',
// })
const API = axios.create({
  baseURL: 'https://backendlibsystem-5.onrender.com',
})
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers['X-Session-Token'] = token
  return config
})

API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.clear()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default API
