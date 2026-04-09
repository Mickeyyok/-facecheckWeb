import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function StudentHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);

  useEffect(() => {
    // ดึงประวัติการเข้าเรียนจาก Backend
    const fetchHistory = async () => {
      try {
        const res = await api.get(`/attendance/student/${user.id}`);
        setHistory(res.data);
      } catch (err) {
        console.error("ดึงประวัติไม่สำเร็จ", err);
      }
    };
    if (user?.id) fetchHistory();
  }, [user]);

  // ✅ ฟังก์ชันกำหนดสีของสถานะ (รองรับทั้ง on_time และ present)
  const getStatusStyle = (status) => {
    if (status === 'on_time' || status === 'present') return 'bg-green-100 text-green-700';
    if (status === 'late') return 'bg-yellow-100 text-yellow-700';
    if (status === 'absent') return 'bg-red-100 text-red-700';
    return 'bg-slate-100 text-slate-700';
  };

  // ✅ ฟังก์ชันแปลงคำศัพท์ภาษาอังกฤษเป็นภาษาไทย
  const getStatusText = (status) => {
    if (status === 'on_time' || status === 'present') return 'ตรงเวลา';
    if (status === 'late') return 'สาย';
    if (status === 'absent') return 'ขาดเรียน';
    return 'ไม่ทราบสถานะ';
  };

  return (
    <div className="p-6 animate-in fade-in duration-300">
      <h2 className="text-2xl font-bold mb-6 text-slate-800">ประวัติการเข้าเรียน</h2>
      
      {/* เช็คว่ามีประวัติหรือไม่ */}
      {history.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center text-slate-500 font-medium">
          ยังไม่มีประวัติการเช็คชื่อ
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="p-4 font-bold">วิชา</th>
                <th className="p-4 font-bold">วันที่ / เวลาเช็คชื่อ</th>
                <th className="p-4 font-bold text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-slate-800">{item.subjectCode}</div>
                    <div className="text-sm text-slate-500">{item.subjectName}</div>
                  </td>
                  <td className="p-4 text-sm font-medium text-slate-600">
                    {new Date(item.checkedAt).toLocaleString('th-TH', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })} น.
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${getStatusStyle(item.status)}`}>
                      {getStatusText(item.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}