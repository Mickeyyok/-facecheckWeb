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
  },

  // ฟังก์ชันดึงรายงานสถิติรายวัน
  getDailyAttendance: async (classId, date) => {
    try {
      // ลองเรียก API สำหรับสถิติรายวัน
      const response = await api.get(`/attendance/class/${classId}/daily`, { params: { date } });
      return response.data;
    } catch (error) {
      console.error('Get daily attendance error:', error);
      // ถ้า Backend ยังไม่ได้สร้าง endpoint นี้ ให้คืนค่าชั่วคราว
      return null;
    }
  },

  // ✅ เพิ่มฟังก์ชันใหม่: ดึงประวัติการเข้าเรียนของนักศึกษา
  getHistoryByStudent: async (studentId) => {
    try {
      const response = await api.get(`/attendance/student/${studentId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching attendance history:', error);
      throw error.response?.data || { message: 'ไม่สามารถดึงประวัติการเข้าเรียนได้' };
    }
  }
};