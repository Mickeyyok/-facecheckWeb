import React, { createContext, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';

// สร้าง Context
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // null = ยังไม่ล็อกอิน, ถ้าล็อกอินจะเป็น { role: 'student' หรือ 'instructor', name: '...' }
  const navigate = useNavigate();

  // ฟังก์ชันล็อกอิน
  const login = (role, userData) => {
    // Normalize: แปลง role จาก Backend ให้ตรงกับที่ Frontend ใช้
    // เช่น 'teacher' → 'instructor', 'STUDENT' → 'student'
    const roleMap = {
      teacher: 'instructor',
      TEACHER: 'instructor',
      INSTRUCTOR: 'instructor',
      STUDENT: 'student',
    };
    const normalizedRole = roleMap[role] ?? role; // ถ้าไม่มีใน Map ให้ใช้ค่าเดิม

    setUser({ role: normalizedRole, ...userData });
    navigate(`/${normalizedRole}/dashboard`);
  };

  // ฟังก์ชันออกจากระบบ
  const logout = () => {
    setUser(null);
    navigate('/'); // เด้งกลับหน้า Login
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom Hook สำหรับเรียกใช้ข้อมูลคนล็อกอินได้ง่ายๆ
export const useAuth = () => useContext(AuthContext);
