import api from './api';

export const authService = {
  /**
   * Login
   * - ส่ง { username, password }
   * - นักศึกษาใช้รหัสนักศึกษาเป็น username
   */
  login: async (loginData) => {
    try {
      const response = await api.post('/auth/login', loginData);
      return response.data;
    } catch (error) {
      const message =
        error.response?.data?.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
      throw new Error(message);
    }
  },

  /**
   * Register
   * - ส่ง { role, username, password, fullName, faceDescriptor }
   */
  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      const message =
        error.response?.data?.message || 'สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่';
      throw new Error(message);
    }
  },
};
