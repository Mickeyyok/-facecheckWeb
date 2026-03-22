// กำหนด URL ของ Spring Boot Backend
const API_URL = 'http://localhost:8080/api/auth';

export const authService = {
  // ฟังก์ชันสำหรับ Login
  login: async (email, password) => {
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }), // ส่งอีเมลและรหัสผ่านไปเป็น JSON
      });

      const data = await response.json();

      // ถ้า Response ไม่ใช่ 200 OK (เช่น รหัสผิด)
      if (!response.ok) {
        throw new Error(data.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      }

      // ถ้าสำเร็จ ส่งข้อมูล user กลับไป
      return data; 
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  // (เดี๋ยวเราค่อยมาเพิ่มฟังก์ชัน Logout หรืออื่นๆ ทีหลัง)
};
