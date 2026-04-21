import api from './api';

export const leaveRequestService = {
  // นักศึกษาส่งใบลา
  createLeaveRequest: async (data) => {
    const response = await api.post('/leave-requests', data);
    return response.data;
  },

  // อาจารย์ดูใบลาทั้งหมด
  getByTeacher: async (teacherId) => {
    const response = await api.get(`/leave-requests/teacher/${teacherId}`);
    return response.data;
  },

  // อาจารย์ดูใบลาที่รออนุมัติ
  getPendingByTeacher: async (teacherId) => {
    const response = await api.get(`/leave-requests/teacher/${teacherId}/pending`);
    return response.data;
  },

  // ดูใบลาตามวิชา
  getByClass: async (classId) => {
    const response = await api.get(`/leave-requests/class/${classId}`);
    return response.data;
  },

  // นักศึกษาดูใบลาของตัวเอง
  getByStudent: async (studentId) => {
    const response = await api.get(`/leave-requests/student/${studentId}`);
    return response.data;
  },

  // อนุมัติ
  approve: async (id) => {
    const response = await api.put(`/leave-requests/${id}/approve`);
    return response.data;
  },

  // ปฏิเสธ
  reject: async (id) => {
    const response = await api.put(`/leave-requests/${id}/reject`);
    return response.data;
  },

  // ลบ
  delete: async (id) => {
    const response = await api.delete(`/leave-requests/${id}`);
    return response.data;
  },
};
