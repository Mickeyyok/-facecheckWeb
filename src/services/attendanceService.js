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
  }
};