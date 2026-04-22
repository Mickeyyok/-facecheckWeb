import api from './api';

/**
 * @fileoverview บริการสำหรับจัดการเรื่องการเช็คชื่อเข้าเรียน (Attendance)
 * ใช้สำหรับการบันทึกการเช็คชื่อด้วยใบหน้า ดึงประวัติการเข้าเรียน และสรุปสถิติสำหรับอาจารย์
 */
export const attendanceService = {
  
  /**
   * ส่งข้อมูลเช็คชื่อเข้าเรียนไปยัง Backend
   * ข้อมูลที่ส่งจะประกอบด้วยพิกัดตำแหน่ง (GPS) และข้อมูลรูปหน้า (Face Descriptor)
   * 
   * @param {Object} checkInData - ข้อมูลสำหรับเช็คชื่อ (เช่น { classId, studentId, latitude, longitude, faceDescriptor })
   * @returns {Promise<Object>} ผลลัพธ์การบันทึกข้อมูล (ข้อมูลเวลาเข้าเรียน)
   * @throws {Error} ถ้าข้อมูลไม่ถูกต้องหรือตรวจสอบใบหน้า/ตำแหน่งไม่ผ่าน ระบบจะโยน Error ไปแจ้งเตือนนักศึกษา
   */
  checkIn: async (checkInData) => {
    try {
      const response = await api.post('/attendance/check-in', checkInData);
      return response.data;
    } catch (error) {
      console.error('Check-in error:', error);
      throw error.response?.data || { message: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' };
    }
  },

  /**
   * ดึงประวัติการเข้าเรียนทั้งหมดของนักศึกษาคนใดคนหนึ่ง 
   * (ใช้สำหรับแสดงผลในหน้าเว็บ "ประวัติการเข้าเรียน" ของนักศึกษา)
   * 
   * @param {string|number} studentId - รหัสนักศึกษา / User ID
   * @returns {Promise<Array>} รายการประวัติการเข้าเรียนทั้งหมด
   */
  getHistoryByStudent: async (studentId) => {
    try {
      const response = await api.get(`/attendance/student/${studentId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching attendance history:', error);
      throw error.response?.data || { message: 'ไม่สามารถดึงประวัติการเข้าเรียนได้' };
    }
  },

  /**
   * ดึงสถิติ/รายชื่อการมาเรียนของคลาส (สำหรับฝั่งอาจารย์)
   * สามารถใช้ดูภาพรวมของคลาสว่ามีใครมาบ้าง โดยกรองตามวันที่ได้
   * 
   * @param {string|number} classId - รหัสอ้างอิงคลาสเรียน
   * @param {string} [date] - (Optional) วันที่ที่จัดการเรียนการสอน รูปแบบ : YYYY-MM-DD
   * @returns {Promise<Array>} รายการนักศึกษาที่เช็คชื่อเข้าเรียนแล้ว
   */
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