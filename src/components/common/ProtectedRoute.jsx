import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ allowedRole }) {
  const { user } = useAuth();
  const token = localStorage.getItem('token');

  // 1. ไม่มี user หรือไม่มี token → กลับ login
  if (!user || !token) {
    return <Navigate to="/" replace />;
  }

  // 2. เข้า role ที่ไม่ใช่ตัวเอง → เด้งไปหน้าของตัวเอง
  if (allowedRole && user.role !== allowedRole) {
    const home = user.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard';
    return <Navigate to={home} replace />;
  }

  // 3. ผ่านทุกเงื่อนไข
  return <Outlet />;
}
