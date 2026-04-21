import api from './api';

export const authService = {
  /**
   * Login
   * - นักศึกษา: ส่ง { studentId, password }
   * - อาจารย์: ส่ง { email, password }
   */
  login: async (loginData) => {
    try {
      const response = await api.post('/auth/login', loginData);
      return response.data;
    } catch (error) {
      const message =
        error.response?.data?.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
      throw new Error(message);
    }
  },

  /**
   * Register
   * - ส่ง { role, email, studentId, password, fullName, faceDescriptor }
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
