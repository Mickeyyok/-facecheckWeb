import api from './api';

export const classService = {
  // สร้างคลาสใหม่
  createClass: async (classData) => {
    const response = await api.post('/classes', classData);
    return response.data;
  },

  // ดึงคลาสตาม ID
  getClassById: async (classId) => {
    const response = await api.get(`/classes/${classId}`);
    return response.data;
  },

  // อัปเดตคลาส
  updateClass: async (classId, classData) => {
    const response = await api.put(`/classes/${classId}`, classData);
    return response.data;
  },

  // ดึงคลาสทั้งหมดของอาจารย์
  getClassesByTeacher: async (teacherId) => {
    const response = await api.get(`/classes/teacher/${teacherId}`);
    return response.data;
  },

  // ==========================================
  // ✅ เพิ่มใหม่: อัปเดตคลาส (พิกัด, เวลา, ข้อมูลทั่วไป)
  // ==========================================
  updateClass: async (classId, classData) => {
    const response = await api.put(`/classes/${classId}`, classData);
    return response.data;
  },

  // ลบคลาส
  deleteClass: async (classId) => {
    const response = await api.delete(`/classes/${classId}`);
    return response.data;
  },

  // ==========================================
  // นักศึกษาในคลาส (class_students)
  // ==========================================

  // ดึงรายชื่อนักศึกษาในคลาส
  getStudentsByClass: async (classId) => {
    const response = await api.get(`/class-students/${classId}`);
    return response.data;
  },

  // เพิ่มนักศึกษาเข้าคลาส (ด้วยรหัสนักศึกษา)
  addStudentToClass: async (classId, studentId) => {
    const response = await api.post('/class-students', { classId, studentId });
    return response.data;
  },

  // ลบนักศึกษาออกจากคลาส
  removeStudentFromClass: async (classId, studentUserId) => {
    const response = await api.delete(`/class-students/${classId}/${studentUserId}`);
    return response.data;
  },

  // ==========================================
  // แจ้งเตือน (Notifications)
  // ==========================================

  // แจ้งเตือนยกคลาสเรียนให้นักศึกษาทั้งหมดในคลาส
  notifyCancelClass: async (classId) => {
    const response = await api.post(`/notifications/cancel-class/${classId}`);
    return response.data;
  },

  // ==========================================
  // ✅ เพิ่มใหม่: แจ้งเตือนเปิดระบบเช็คชื่อให้นักศึกษา
  // ==========================================
  notifyStartCheckIn: async (classId) => {
    const response = await api.post(`/notifications/start-checkin/${classId}`);
    return response.data;
  },

  // ดึงรายวิชาของนักศึกษาตาม User ID
  getClassesByStudent: async (studentId) => {
    try {
      // ใช้ api instance ที่มี baseURL เป็น /api เรียบร้อยแล้ว
      const response = await api.get(`/class-students/student/${studentId}`);
      return response.data;
    } catch (error) {
      console.error('ดึงข้อมูลคลาสของนักศึกษาไม่สำเร็จ:', error);
      throw error;
    }
  },

  // ==========================================
  // สำหรับให้นักศึกษากดเข้าร่วมคลาส
  // ==========================================
  joinClass: async (subjectCode, studentId) => {
    try {
      const response = await api.post('/class-students/join', { subjectCode, studentId });
      return response.data;
    } catch (error) {
      console.error('Join class error:', error);
      throw error.response?.data || { message: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' };
    }
  }
  
};