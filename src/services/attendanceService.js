import api from './api';

export const attendanceService = {
  // ฟังก์ชันส่งข้อมูลเช็คชื่อไปที่ Backend
  checkIn: async (checkInData) => {
    try {
      // checkInData จะประกอบด้วย { classId, studentId, latitude, longitude, faceDescriptor }
      const response = await api.post('/attendance/check-in', checkInData);
      return response.data;
    } catch (error) {
      console.error('Check-in error:', error);
      // โยน error ออกไปให้หน้าเว็บแจ้งเตือนนักศึกษา
      throw error.response?.data || { message: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' };
    }
  }, // <--- สังเกตตรงนี้ครับ ต้องมีลูกน้ำ (comma) คั่นเสมอเมื่อขึ้นฟังก์ชันใหม่

  // ✅ เพิ่มฟังก์ชันใหม่: ดึงประวัติการเข้าเรียนของนักศึกษา
  getHistoryByStudent: async (studentId) => {
    try {
      const response = await api.get(`/attendance/student/${studentId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching attendance history:', error);
      throw error.response?.data || { message: 'ไม่สามารถดึงประวัติการเข้าเรียนได้' };
    }
  },

  // ดึงข้อมูลเช็คชื่อของคลาสตามวันที่ (สำหรับอาจารย์ดูสถิติรายวัน)
  getAttendanceByClass: async (classId, date) => {
    try {
      const params = date ? { date } : {};
      const response = await api.get(`/attendance/class/${classId}`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching class attendance:', error);
      throw error.response?.data || { message: 'ไม่สามารถดึงข้อมูลเช็คชื่อของคลาสได้' };
    }
  }
};