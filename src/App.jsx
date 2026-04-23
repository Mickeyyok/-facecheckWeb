import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import Login from './pages/auth/Login';
import StudentDashboard from './pages/student/StudentDashboard';
import StudentCourses from './pages/student/StudentCourses';
import StudentHistory from './pages/student/StudentHistory';
import FaceRegistration from './pages/student/FaceRegistration';

// ใช้ชื่อ Component ใหม่ที่สื่อถึง Teacher
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import TeacherCourseDetail from './pages/teacher/TeacherCourseDetail';
import LeaveRequests from './pages/teacher/LeaveRequests';

import Notifications from './pages/Notifications';
import ProtectedRoute from './components/common/ProtectedRoute'; 

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/register-face" element={<FaceRegistration />} />

      {/* กลุ่มหน้าของ นักศึกษา */}
      <Route element={<ProtectedRoute allowedRole="student" />}>
        <Route path="/student" element={<MainLayout role="student" />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="courses" element={<StudentCourses />} />
          <Route path="history" element={<StudentHistory />} />
          <Route path="notifications" element={<Notifications role="student" />} />
        </Route>
      </Route>

      {/* กลุ่มหน้าของ อาจารย์ (เปลี่ยนเป็น teacher ทั้งหมด) */}
      <Route element={<ProtectedRoute allowedRole="teacher" />}>
        <Route path="/teacher" element={<MainLayout role="teacher" />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<TeacherDashboard />} />
          <Route path="course/:courseId" element={<TeacherCourseDetail />} />
          <Route path="notifications" element={<Notifications role="teacher" />} />
          <Route path="leave-requests" element={<LeaveRequests />} />
        </Route>
      </Route>
      
      {/* Alias: กันเหนียวถ้าหลุดไป /instructor ให้ดีดกลับมา /teacher */}
      <Route path="/instructor" element={<Navigate to="/teacher" replace />} />
      <Route path="/instructor/*" element={<Navigate to="/teacher" replace />} />

      {/* Catch-all: ถ้าไปหน้ามั่วๆ ให้เด้งกลับ Login */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}