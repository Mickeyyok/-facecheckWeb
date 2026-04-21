import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { classService } from '../../services/classService';
import { Clock, Calendar, XCircle } from 'lucide-react';

export default function StudentHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHistoryData = async () => {
      try {
        setIsLoading(true);
        
        const [historyRes, activeRes] = await Promise.all([
          api.get(`/attendance/student/${user.id}`),
          classService.getClassesByStudent(user.id)
        ]);

        const historyData = Array.isArray(historyRes.data) ? historyRes.data : [];
        const activeData = Array.isArray(activeRes) ? activeRes : (activeRes.data || []);

        // Map ข้อมูล — ใช้ subjectCode/Name จาก backend (ซึ่งรวม absent แล้ว) เป็นหลัก
        const processedHistory = historyData.map(item => {
          const itemClassId = item.classId || item.class_id;
          const matchedClass = activeData.find(c => c.id === itemClassId);
          return {
            ...item,
            subjectCode: item.subjectCode || (matchedClass ? matchedClass.subjectCode : 'N/A'),
            subjectName: item.subjectName || (matchedClass ? matchedClass.subjectName : 'วิชาที่ถูกลบ/ไม่มีในระบบ'),
          };
        });

        // เรียงลำดับจากล่าสุดไปเก่าสุด
        processedHistory.sort((a, b) => new Date(b.checkedAt) - new Date(a.checkedAt));

        setHistory(processedHistory);
      } catch (err) {
        console.error("ดึงประวัติไม่สำเร็จ", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (user?.id) fetchHistoryData();
  }, [user]);

  const getStatusStyle = (rawStatus) => {
    const status = rawStatus?.toLowerCase()?.trim();
    if (status === 'on_time' || status === 'present') return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
    if (status === 'late') return 'bg-amber-100 text-amber-700 border border-amber-200';
    if (status === 'absent') return 'bg-rose-100 text-rose-700 border border-rose-200';
    if (status === 'leave') return 'bg-orange-100 text-orange-700 border border-orange-200';
    return 'bg-slate-100 text-slate-700 border border-slate-200';
  };

  const getStatusText = (rawStatus) => {
    const status = rawStatus?.toLowerCase()?.trim();
    if (status === 'on_time' || status === 'present') return 'ตรงเวลา';
    if (status === 'late') return 'สาย';
    if (status === 'absent') return 'ขาดเรียน';
    if (status === 'leave') return 'ลา';
    return 'ไม่ทราบสถานะ';
  };

  const isAbsent = (item) => item.status?.toLowerCase() === 'absent';

  return (
    <div className="p-6 animate-in fade-in duration-300 max-w-6xl mx-auto">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          ประวัติการเข้าเรียน
          <span className="text-sm bg-slate-100 text-slate-500 px-3 py-1 rounded-full font-medium border border-slate-200">
            {history.length} รายการทั้งหมด
          </span>
        </h2>
      </div>
      
      {isLoading ? (
         <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-16 flex flex-col items-center justify-center space-y-4">
           <div className="w-8 h-8 border-4 border-blue-200 border-t-[#2b4cdd] rounded-full animate-spin"></div>
           <p className="text-slate-500 font-bold">กำลังซิงค์ข้อมูล...</p>
         </div>
      ) : history.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-16 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock size={28} className="text-slate-400" />
          </div>
          <p className="text-slate-600 font-bold text-lg mb-1">ยังไม่มีประวัติการเช็คชื่อ</p>
          <p className="text-sm text-slate-400 font-medium">คุณยังไม่เคยเช็คชื่อในระบบเลย</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-[13px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="p-5 font-extrabold w-1/3">วิชาเรียน</th>
                  <th className="p-5 font-extrabold w-1/3">วันที่ / เวลาเช็คชื่อ</th>
                  <th className="p-5 font-extrabold text-center w-1/3">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((item) => (
                  <tr
                    key={item.id}
                    className={`transition-colors group ${isAbsent(item) ? 'bg-rose-50/30 hover:bg-rose-50/60' : item.status?.toLowerCase() === 'leave' ? 'bg-orange-50/30 hover:bg-orange-50/60' : 'hover:bg-slate-50/50'}`}
                  >
                    <td className="p-5">
                      <div className={`font-extrabold text-[15px] mb-0.5 transition-colors ${isAbsent(item) ? 'text-rose-700' : 'text-slate-800 group-hover:text-[#2b4cdd]'}`}>
                        {item.subjectCode}
                      </div>
                      <div className="text-[13px] text-slate-500 font-medium">
                        {item.subjectName}
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center text-sm font-bold text-slate-700">
                        <Calendar size={15} className="mr-2 text-slate-400" />
                        {new Date(item.checkedAt).toLocaleDateString('th-TH', {
                          year: 'numeric', month: 'short', day: 'numeric'
                        })}
                      </div>
                      {!isAbsent(item) && (
                        <div className="flex items-center text-[13px] text-slate-500 font-medium mt-1">
                          <Clock size={14} className="mr-2 text-slate-400" />
                          {new Date(item.checkedAt).toLocaleTimeString('th-TH', {
                            hour: '2-digit', minute: '2-digit'
                          })} น.
                        </div>
                      )}
                      {isAbsent(item) && (
                        <div className="flex items-center text-[13px] text-rose-400 font-medium mt-1">
                          <XCircle size={14} className="mr-2" />
                          ไม่ได้เข้าเรียน
                        </div>
                      )}
                    </td>
                    <td className="p-5 text-center">
                      <span className={`inline-flex items-center justify-center px-3.5 py-1.5 rounded-full text-[12px] font-extrabold tracking-wide ${getStatusStyle(item.status)}`}>
                        {getStatusText(item.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}