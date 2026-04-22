import api from './api';

/**
 * @fileoverview บริการสำหรับจัดการข้อมูลรายวิชา (Class/Course) ทั้งหมดในระบบ
 * ทำหน้าที่เชื่อมต่อกับ Backend API สำหรับการสร้าง ดึงข้อมูล แก้ไข และลบรายวิชา
 * รวมถึงการจัดการนักศึกษาในรายวิชา และการส่งแจ้งเตือนต่างๆ
 */
export const classService = {
  // ==========================================
  //  ส่วนจัดการข้อมูลคลาสเรียน (Class Management)
  // ==========================================

  /**
   * สร้างคลาสเรียนใหม่ (สำหรับอาจารย์)
   * @param {Object} classData - ข้อมูลคลาสเรียน (เช่น ชื่อวิชา, รหัสวิชา, วันเวลาเรียน)
   * @returns {Promise<Object>} ข้อมูลคลาสที่ถูกสร้างสำเร็จ
   */
  createClass: async (classData) => {
    const response = await api.post('/classes', classData);
    return response.data;
  },

  /**
   * ดึงข้อมูลคลาสเรียนตามรหัสอ้างอิง (Class ID)
   * @param {number|string} classId - รหัสอ้างอิงของคลาสในระบบฐานข้อมูล
   * @returns {Promise<Object>} รายละเอียดของคลาสเรียนนั้นๆ
   */
  getClassById: async (classId) => {
    const response = await api.get(`/classes/${classId}`);
    return response.data;
  },

  /**
   * ดึงรายการคลาสเรียนทั้งหมดที่อาจารย์คนนี้เป็นผู้สอน
   * @param {number|string} teacherId - รหัสอาจารย์ (User ID)
   * @returns {Promise<Array>} รายการคลาสเรียนของอาจารย์
   */
  getClassesByTeacher: async (teacherId) => {
    const response = await api.get(`/classes/teacher/${teacherId}`);
    return response.data;
  },

  /**
   * อัปเดตข้อมูลคลาสเรียน (เช่น พิกัด, เวลาเรียน, ข้อมูลทั่วไป)
   * @param {number|string} classId - รหัสอ้างอิงคลาส
   * @param {Object} classData - ข้อมูลที่ต้องการอัปเดต
   * @returns {Promise<Object>} ข้อมูลที่อัปเดตแล้ว
   */
  updateClass: async (classId, classData) => {
    const response = await api.put(`/classes/${classId}`, classData);
    return response.data;
  },

  /**
   * ลบคลาสเรียนออกจากระบบ
   * @param {number|string} classId - รหัสอ้างอิงคลาส
   * @returns {Promise<Object>} ผลลัพธ์การลบ
   */
  deleteClass: async (classId) => {
    const response = await api.delete(`/classes/${classId}`);
    return response.data;
  },

  // ==========================================
  // 👥 ส่วนจัดการนักศึกษาในคลาส (Class Enrollment)
  // ==========================================

  /**
   * ดึงรายชื่อนักศึกษาทั้งหมดที่ลงทะเบียนในคลาสนี้
   * @param {number|string} classId - รหัสอ้างอิงคลาส
   * @returns {Promise<Array>} รายชื่อนักศึกษา
   */
  getStudentsByClass: async (classId) => {
    const response = await api.get(`/class-students/${classId}`);
    return response.data;
  },

  /**
   * เพิ่มนักศึกษาเข้าคลาส (โดยตรงจากฝั่งอาจารย์หรือระบบ)
   * @param {number|string} classId - รหัสอ้างอิงคลาส
   * @param {string} studentId - รหัสนักศึกษา (เช่น 64XXXXXXX)
   * @returns {Promise<Object>} ข้อมูลการลงทะเบียน
   */
  addStudentToClass: async (classId, studentId) => {
    const response = await api.post('/class-students', { classId, studentId });
    return response.data;
  },

  /**
   * ถอดนักศึกษาออกจากคลาสเรียน
   * @param {number|string} classId - รหัสอ้างอิงคลาส
   * @param {number|string} studentUserId - รหัสผู้ใช้ของนักศึกษา (User ID)
   * @returns {Promise<Object>} ผลลัพธ์การลบ
   */
  removeStudentFromClass: async (classId, studentUserId) => {
    const response = await api.delete(`/class-students/${classId}/${studentUserId}`);
    return response.data;
  },

  /**
   * ให้นักศึกษากดเข้าร่วมคลาสเรียนด้วยตนเอง ผ่านรหัสวิชา
   * @param {string} subjectCode - รหัสวิชา (เช่น SP344)
   * @param {string} studentId - รหัสนักศึกษา
   * @returns {Promise<Object>} ข้อมูลการลงทะเบียนที่สำเร็จ
   */
  joinClass: async (subjectCode, studentId) => {
    try {
      const response = await api.post('/class-students/join', { subjectCode, studentId });
      return response.data;
    } catch (error) {
      console.error('Join class error:', error);
      throw error.response?.data || { message: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' };
    }
  },

  /**
   * ดึงรายการคลาสเรียนทั้งหมดที่นักศึกษาคนนี้ลงทะเบียนไว้
   * @param {number|string} studentId - รหัสผู้ใช้ของนักศึกษา (User ID) ไม่ใช่รหัสนักศึกษา
   * @returns {Promise<Array>} รายการวิชาเรียน
   */
  getClassesByStudent: async (studentId) => {
    try {
      const response = await api.get(`/class-students/student/${studentId}`);
      return response.data;
    } catch (error) {
      console.error('ดึงข้อมูลคลาสของนักศึกษาไม่สำเร็จ:', error);
      throw error;
    }
  },

  // ==========================================
  // 🔔 ส่วนการแจ้งเตือน (Notifications)
  // ==========================================

  /**
   * แจ้งเตือนแบบ Push: ส่งข้อความแจ้งยกเลิกคลาสเรียนให้นักศึกษาทุกคนทราบ
   * @param {number|string} classId - รหัสอ้างอิงคลาส
   * @returns {Promise<Object>} ผลลัพธ์การส่งแจ้งเตือน
   */
  notifyCancelClass: async (classId) => {
    const response = await api.post(`/notifications/cancel-class/${classId}`);
    return response.data;
  },

  /**
   * แจ้งเตือนแบบ Push: ส่งข้อความแจ้งเปิดระบบเช็คชื่อ (เพื่อให้ นศ. เตรียมสแกนหน้า)
   * @param {number|string} classId - รหัสอ้างอิงคลาส
   * @returns {Promise<Object>} ผลลัพธ์การส่งแจ้งเตือน
   */
  notifyStartCheckIn: async (classId) => {
    const response = await api.post(`/notifications/start-checkin/${classId}`);
    return response.data;
  }
};