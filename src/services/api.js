import axios from 'axios';

// สร้างตัวแทน (Instance) สำหรับเรียก API ไปที่ Spring Boot
const api = axios.create({
  baseURL: 'http://localhost:8080/api', // URL เริ่มต้นของ Spring Boot
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor: ดักจับก่อนส่ง Request (เช่น เอาไว้แนบ Token ตอนทำระบบ Login จริงๆ)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
