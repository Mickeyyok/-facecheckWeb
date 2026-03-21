import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import Login from './pages/auth/Login';
import StudentDashboard from './pages/student/StudentDashboard';
import StudentHistory from './pages/student/StudentHistory';
import StudentCourses from './pages/student/StudentCourses';
import InstructorDashboard from './pages/instructor/InstructorDashboard';
import InstructorCourseDetail from './pages/instructor/InstructorCourseDetail';
import Notifications from './pages/Notifications';

export default function App() {
  return (
    <Routes>
      {/* หน้า Login (ไม่มี Sidebar) */}
      <Route path="/" element={<Login />} />

      {/* กลุ่มหน้าของ นักศึกษา (มี Sidebar) */}
      <Route path="/student" element={<MainLayout role="student" />}>
        {/* เมื่อเข้ามา /student ให้ Redirect ไปที่ dashboard */}
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="courses" element={<StudentCourses />} />
        <Route path="history" element={<StudentHistory />} />
        <Route path="notifications" element={<Notifications role="student" />} />
      </Route>

      {/* กลุ่มหน้าของ อาจารย์ (มี Sidebar) */}
      <Route path="/instructor" element={<MainLayout role="instructor" />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<InstructorDashboard />} />
        <Route path="course/:courseId" element={<InstructorCourseDetail />} />
        <Route path="notifications" element={<Notifications role="instructor" />} />
      </Route>
    </Routes>
  );
}
