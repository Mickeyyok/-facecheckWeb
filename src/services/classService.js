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

  // ดึงคลาสทั้งหมดของอาจารย์
  getClassesByTeacher: async (teacherId) => {
    const response = await api.get(`/classes/teacher/${teacherId}`);
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
};
