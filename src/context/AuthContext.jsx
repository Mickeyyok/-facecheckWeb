import React, { createContext, useState, useContext } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  /**
   * login(userData, tokenData)
   * - รองรับ backend ที่ส่ง token มาใน field ชื่อ 'token' หรือ 'accessToken'
   * - ตัด faceDescriptor ออกก่อนเซฟ (ป้องกัน localStorage เกิน 5MB)
   */
  const login = (userData, tokenData) => {
    const { faceDescriptor, ...cleanUserData } = userData;

    setUser(cleanUserData);
    localStorage.setItem('user', JSON.stringify(cleanUserData));

    // รองรับทั้ง field 'token' และ 'accessToken' จาก backend
    const resolvedToken =
      tokenData?.token || tokenData?.accessToken || tokenData;

    if (resolvedToken && resolvedToken !== 'undefined') {
      localStorage.setItem('token', resolvedToken);
    } else {
      // ไม่มี token จริง → ลบทิ้งเพื่อไม่ให้ส่ง header ผิด
      localStorage.removeItem('token');
      console.warn('[AuthContext] ไม่พบ JWT token จาก backend');
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  const isAuthenticated = !!user && !!localStorage.getItem('token');

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);