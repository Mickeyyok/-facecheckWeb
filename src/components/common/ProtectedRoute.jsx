import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ allowedRole }) {
  const { user } = useAuth();

  // 1. ถ้ายังไม่ล็อกอิน ให้เด้งกลับไปหน้าแรก (Login)
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // 2. ถ้าล็อกอินแล้ว แต่พยายามเข้าหน้าของ Role อื่น (เช่น นักศึกษาพยายามเข้าหน้าอาจารย์)
  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to={`/${user.role}/dashboard`} replace />; // เด้งกลับไปหน้าตัวเอง
  }

  // 3. ผ่านด่านทั้งหมด ให้แสดงหน้าเว็บนั้นได้ตามปกติ
  return <Outlet />;
}
