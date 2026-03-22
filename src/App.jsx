import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import Login from './pages/auth/Login';
import StudentDashboard from './pages/student/StudentDashboard';
import StudentCourses from './pages/student/StudentCourses';
import StudentHistory from './pages/student/StudentHistory';
import InstructorDashboard from './pages/instructor/InstructorDashboard';
import InstructorCourseDetail from './pages/instructor/InstructorCourseDetail';
import Notifications from './pages/Notifications';

// Import ProtectedRoute ที่เราเพิ่งสร้าง
import ProtectedRoute from './components/common/ProtectedRoute'; 

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />

      {/* กลุ่มหน้าของ นักศึกษา (โดนล็อกด้วย ProtectedRoute) */}
      <Route element={<ProtectedRoute allowedRole="student" />}>
        <Route path="/student" element={<MainLayout role="student" />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="courses" element={<StudentCourses />} />
          <Route path="history" element={<StudentHistory />} />
          <Route path="notifications" element={<Notifications role="student" />} />
        </Route>
      </Route>

      {/* กลุ่มหน้าของ อาจารย์ (โดนล็อกด้วย ProtectedRoute) */}
      <Route element={<ProtectedRoute allowedRole="instructor" />}>
        <Route path="/instructor" element={<MainLayout role="instructor" />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<InstructorDashboard />} />
          <Route path="course/:courseId" element={<InstructorCourseDetail />} />
          <Route path="notifications" element={<Notifications role="instructor" />} />
        </Route>
      </Route>
      {/* Alias: ถ้า Spring Boot ส่ง role='teacher' กลับมา ให้ Redirect ไปหน้าอาจารย์ */}
      <Route path="/teacher" element={<Navigate to="/instructor" replace />} />
      <Route path="/teacher/*" element={<Navigate to="/instructor" replace />} />

      {/* Catch-all: URL ใดๆ ที่ไม่มีอยู่จริง ให้เด้งกลับหน้า Login */}
      <Route path="*" element={<Navigate to="/" replace />} />
      
    </Routes>
  );
}
