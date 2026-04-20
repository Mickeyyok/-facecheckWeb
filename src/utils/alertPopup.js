import Swal from 'sweetalert2';

// ธีมสีสำหรับปุ่มให้เข้ากับเว็บไซต์
const themeColors = {
  confirmButtonColor: '#2563eb', // blue-600
  cancelButtonColor: '#cbd5e1', // slate-300
};

/**
 * แสดง Popup สำเร็จ (Success)
 * @param {string} title หัวข้อ
 * @param {string} text รายละเอียด (ถ้ามี)
 */
export const showSuccess = (title, text = '') => {
  return Swal.fire({
    title,
    text,
    icon: 'success',
    confirmButtonText: 'ตกลง',
    confirmButtonColor: themeColors.confirmButtonColor,
    customClass: {
      popup: 'rounded-2xl',
      title: 'text-slate-800 font-bold',
      confirmButton: 'px-6 py-2.5 rounded-xl font-bold text-sm shadow-md'
    }
  });
};

/**
 * แสดง Popup แจ้งเตือนข้อผิดพลาด (Error)
 * @param {string} title หัวข้อ
 * @param {string} text รายละเอียด
 */
export const showError = (title, text = '') => {
  return Swal.fire({
    title,
    text,
    icon: 'error',
    confirmButtonText: 'ตกลง',
    confirmButtonColor: '#ef4444', // red-500
    customClass: {
      popup: 'rounded-2xl',
      title: 'text-slate-800 font-bold',
      confirmButton: 'px-6 py-2.5 rounded-xl font-bold text-sm shadow-md'
    }
  });
};

/**
 * แสดง Popup แจ้งเตือนข้อมูลทั่วไป (Info / Warning)
 * @param {string} title หัวข้อ
 * @param {string} text รายละเอียด
 * @param {'info' | 'warning'} icon ประเภทไอคอน
 */
export const showAlert = (title, text = '', icon = 'warning') => {
  return Swal.fire({
    title,
    text,
    icon,
    confirmButtonText: 'ตกลง',
    confirmButtonColor: themeColors.confirmButtonColor,
    customClass: {
      popup: 'rounded-2xl',
      title: 'text-slate-800 font-bold',
      confirmButton: 'px-6 py-2.5 rounded-xl font-bold text-sm shadow-md'
    }
  });
};

/**
 * แสดง Popup ยืนยันการกระทำ (Confirm)
 * @param {string} title หัวข้อ
 * @param {string} text รายละเอียด
 * @param {string} confirmText ข้อความปุ่มยืนยัน
 * @param {string} cancelText ข้อความปุ่มยกเลิก
 */
export const showConfirm = async (title, text = '', confirmText = 'ยืนยัน', cancelText = 'ยกเลิก') => {
  const result = await Swal.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: themeColors.confirmButtonColor,
    cancelButtonColor: themeColors.cancelButtonColor,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    reverseButtons: true,
    customClass: {
      popup: 'rounded-2xl',
      title: 'text-slate-800 font-bold',
      confirmButton: 'px-6 py-2.5 rounded-xl font-bold text-sm shadow-md ml-3',
      cancelButton: 'px-6 py-2.5 rounded-xl font-bold text-sm text-slate-700 bg-slate-200 hover:bg-slate-300 transition'
    }
  });
  return result.isConfirmed;
};

// เผื่อใช้เรียกแจ้งเตือนแบบเล็กๆ ที่มุมจอ (Toast)
export const showToast = (title, icon = 'success') => {
  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.addEventListener('mouseenter', Swal.stopTimer)
      toast.addEventListener('mouseleave', Swal.resumeTimer)
    }
  });

  return Toast.fire({
    icon,
    title
  });
};
