import api from './api';

export const notificationService = {
  // ดึงการแจ้งเตือนทั้งหมดของ user
  getUserNotifications: async (userId) => {
    const response = await api.get(`/notifications/user/${userId}`);
    return response.data;
  },

  // ขีดว่าอ่านแล้ว 1 รายการ
  markAsRead: async (notificationId) => {
    const response = await api.put(`/notifications/${notificationId}/read`);
    return response.data;
  },

  // ขีดว่าอ่านแล้วทั้งหมด
  markAllAsRead: async (userId) => {
    const response = await api.put(`/notifications/user/${userId}/read-all`);
    return response.data;
  },

  // ลบการแจ้งเตือน
  deleteNotification: async (notificationId) => {
    const response = await api.delete(`/notifications/${notificationId}`);
    return response.data;
  }
};
