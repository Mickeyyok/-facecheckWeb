import React, { createContext, useState, useContext } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (error) {
      return null;
    }
  });

  const login = (userData, tokenData) => {
    // 1. 💡 ป้องกัน Local Storage พัง: คัดลอกข้อมูล User และลบ faceDescriptor ทิ้งก่อนเซฟ
    const { faceDescriptor, ...cleanUserData } = userData;

    // 2. เซฟข้อมูลที่สะอาดแล้วลง State และ LocalStorage
    setUser(cleanUserData);
    localStorage.setItem('user', JSON.stringify(cleanUserData));
    
    // 3. สร้าง Token จำลองเพื่อให้ App.jsx ยอมให้ผ่าน
    localStorage.setItem('token', tokenData || 'dummy-auth-token');
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = '/login'; 
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);