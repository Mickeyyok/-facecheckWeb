// กำหนด URL ของ Spring Boot Backend
const API_URL = 'http://localhost:8080/api/auth';

export const authService = {
  // ฟังก์ชันสำหรับ Login
  login: async (loginData) => {
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData), // ส่งไปทั้งก้อนแบบยืดหยุ่น
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

  // ฟังก์ชัน Register (สำหรับตอนสมัครสมาชิก)
  register: async (userData) => {
    try {
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData), // ส่งก้อนข้อมูลทั้งหมดไป (ชื่อ, รหัส, descriptor)
      });

      // ถ้า Backend ตอบกลับมาเป็น String หรือ Object
      let data;
      const text = await response.text();
      try { data = JSON.parse(text); } catch (e) { data = { message: text }; }

      if (!response.ok) {
        throw new Error(data.message || 'สมัครสมาชิกไม่สำเร็จ');
      }

      return data;
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  }

  // (เดี๋ยวเราค่อยมาเพิ่มฟังก์ชัน Logout หรืออื่นๆ ทีหลัง)
};
