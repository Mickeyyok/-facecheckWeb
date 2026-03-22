import React, { createContext, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';

// สร้าง Context
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // null = ยังไม่ล็อกอิน, ถ้าล็อกอินจะเป็น { role: 'student' หรือ 'instructor', name: '...' }
  const navigate = useNavigate();

  // ฟังก์ชันล็อกอิน
  const login = (role, userData) => {
    setUser({ role, ...userData });
    navigate(`/${role}/dashboard`); // ล็อกอินสำเร็จให้เด้งไปหน้า Dashboard ของ Role นั้น
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
