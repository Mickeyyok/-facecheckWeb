import React, { useState, useEffect } from 'react';
import { History, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { attendanceService } from '../../services/attendanceService';

// Component ป้ายสถานะ เล็กๆ สำหรับใช้ในหน้านี้ (ปรับให้รองรับตัวพิมพ์ใหญ่จาก Database)
const StatusBadge = ({ status }) => {
  const s = status?.toUpperCase();
  if (s === 'PRESENT') return <span className="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-700 border border-green-200">✅ ตรงเวลา</span>;
  if (s === 'LATE') return <span className="px-2 py-1 rounded text-xs font-semibold bg-yellow-100 text-yellow-700 border border-yellow-200">⚠️ สาย</span>;
  if (s === 'ABSENT') return <span className="px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-700 border border-red-200">❌ ขาดเรียน</span>;
  return <span className="px-2 py-1 rounded text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">- รอดำเนินการ</span>;
};

export default function StudentHistory() {
  const { user } = useAuth();
  
  // States สำหรับเก็บข้อมูลและสถานะการโหลด
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterCourse, setFilterCourse] = useState('ทุกวิชา');

  // ดึงข้อมูลประวัติจาก Backend
  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        if (user?.id) {
          const data = await attendanceService.getHistoryByStudent(user.id);
          setHistory(data);
        }
      } catch (error) {
        console.error('โหลดประวัติไม่สำเร็จ:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [user]);

  // สร้างรายชื่อวิชาแบบไม่ซ้ำกัน สำหรับแสดงใน Dropdown
  const uniqueCourses = ['ทุกวิชา', ...new Set(history.map(item => item.subjectName).filter(Boolean))];

  // กรองข้อมูลตามวิชาที่เลือกใน Dropdown
  const filteredHistory = filterCourse === 'ทุกวิชา' 
    ? history 
    : history.filter(item => item.subjectName === filterCourse);

  // ฟังก์ชันแปลงวันที่และเวลาให้อ่านง่าย
  const formatDate = (isoString) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatTime = (isoString) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="p-8 lg:p-10 space-y-8 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h3 className="text-[28px] font-extrabold text-slate-800 tracking-tight">ประวัติการเข้าเรียน</h3>
      </div>
      
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="p-7 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-extrabold text-lg text-slate-800 flex items-center">
            <History className="mr-3 text-blue-600" size={24}/> ประวัติการเข้าเรียนทั้งหมด
          </h3>
          <div className="flex space-x-3">
            {/* Dropdown ที่ดึงชื่อวิชาจากข้อมูลจริงมาแสดง */}
            <select 
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
              className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
            >
              {uniqueCourses.map((course, idx) => (
                <option key={idx} value={course}>{course}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto p-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 className="animate-spin mb-4" size={32} />
              <p className="font-medium text-sm">กำลังโหลดประวัติ...</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <p className="font-medium text-sm">ไม่มีประวัติการเช็คชื่อ</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                  <th className="py-4 px-7">รายวิชา</th>
                  <th className="py-4 px-7">วันที่</th>
                  <th className="py-4 px-7">เวลา</th>
                  <th className="py-4 px-7">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map(item => (
                  <tr key={item.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td className="py-4.5 px-7 font-bold text-slate-800">
                      {item.subjectName} <span className="text-xs font-medium text-slate-400 ml-1">({item.subjectCode})</span>
                    </td>
                    <td className="py-4.5 px-7 text-slate-500 font-medium text-sm">{formatDate(item.checkedAt)}</td>
                    <td className="py-4.5 px-7 text-slate-500 font-medium text-sm">{formatTime(item.checkedAt)} น.</td>
                    <td className="py-4.5 px-7"><StatusBadge status={item.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Pagination (อัปเดตตัวเลขให้ตรงกับจำนวนข้อมูลจริง) */}
        {!isLoading && filteredHistory.length > 0 && (
          <div className="p-6 border-t border-slate-100 flex justify-between items-center text-sm text-slate-500 font-medium bg-white">
            <span>แสดงทั้งหมด {filteredHistory.length} รายการ</span>
            <div className="flex space-x-2">
              <button disabled className="px-4 py-2 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors">ก่อนหน้า</button>
              <button className="px-4 py-2 bg-[#2b4cdd] text-white rounded-lg shadow-sm font-bold">1</button>
              <button disabled className="px-4 py-2 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors">ถัดไป</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}