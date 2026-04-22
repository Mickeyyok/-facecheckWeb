import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { classService } from '../../services/classService';
import { Clock, Calendar, XCircle, Filter, ChevronDown, CheckCircle2 } from 'lucide-react';

export default function StudentHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState('all');

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

  // Extract unique subjects for filter
  const subjects = useMemo(() => {
    const subjectMap = new Map();
    history.forEach(item => {
      if (!subjectMap.has(item.subjectCode)) {
        subjectMap.set(item.subjectCode, item.subjectName);
      }
    });
    return Array.from(subjectMap.entries()).map(([code, name]) => ({ code, name }));
  }, [history]);

  // Filtered history
  const filteredHistory = useMemo(() => {
    if (selectedSubject === 'all') return history;
    return history.filter(item => item.subjectCode === selectedSubject);
  }, [history, selectedSubject]);

  const getStatusStyle = (rawStatus) => {
    const status = rawStatus?.toLowerCase()?.trim();
    if (status === 'on_time' || status === 'present') return 'bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm shadow-emerald-100';
    if (status === 'late') return 'bg-amber-100 text-amber-700 border border-amber-200 shadow-sm shadow-amber-100';
    if (status === 'absent') return 'bg-rose-100 text-rose-700 border border-rose-200 shadow-sm shadow-rose-100';
    if (status === 'leave') return 'bg-orange-100 text-orange-700 border border-orange-200 shadow-sm shadow-orange-100';
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
    <div className="p-4 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6 bg-white p-6 rounded-3xl shadow-sm border border-slate-200/60">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            ประวัติการเข้าเรียน
            <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold border border-indigo-100 uppercase tracking-wider">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              {history.length} รายการ
            </div>
          </h2>
          <p className="text-slate-400 text-sm font-medium mt-1">ตรวจสอบและติดตามการเช็คชื่อย้อนหลังของคุณ</p>
        </div>

        {/* Filter Dropdown */}
        <div className="flex items-center gap-3">
          <div className="relative group">
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="px-6 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-700 font-bold text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all appearance-none cursor-pointer min-w-[220px]"
            >
              <option value="all">ทุกวิชาเรียน</option>
              {subjects.map((subject) => (
                <option key={subject.code} value={subject.code}>
                  {subject.code} - {subject.name}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:rotate-180 transition-transform">
              <ChevronDown size={18} />
            </div>
          </div>
        </div>
      </div>
      
      {isLoading ? (
         <div className="bg-white rounded-[32px] shadow-sm border border-slate-200/60 p-24 flex flex-col items-center justify-center space-y-6">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-indigo-100 rounded-full border-t-indigo-600 animate-spin"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-indigo-50 rounded-full flex items-center justify-center">
                <Clock size={16} className="text-indigo-600 animate-pulse" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-slate-800 font-black text-xl">กำลังประมวลผลข้อมูล...</p>
              <p className="text-slate-400 text-sm mt-1 font-medium italic">กรุณารอสักครู่ ระบบกำลังจัดเตรียมประวัติของคุณ</p>
            </div>
         </div>
      ) : history.length === 0 ? (
        <div className="bg-white rounded-[32px] shadow-sm border border-slate-200/60 p-24 text-center">
          <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-indigo-50/50">
            <Clock size={40} className="text-indigo-500" />
          </div>
          <h3 className="text-2xl font-black text-slate-800 mb-2">ยังไม่มีประวัติการเข้าเรียน</h3>
          <p className="text-slate-400 font-bold max-w-md mx-auto leading-relaxed">
            คุณยังไม่เคยเช็คชื่อในระบบเลย เมื่อมีการเช็คชื่อเกิดขึ้น ข้อมูลจะมาปรากฏที่หน้านี้โดยอัตโนมัติ
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-[32px] shadow-sm border border-slate-200/60 overflow-hidden ring-1 ring-slate-100">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/80 border-b border-slate-100">
                <tr>
                  <th className="p-6 font-black text-[13px] uppercase tracking-widest text-slate-500 w-1/3">ข้อมูลวิชาเรียน</th>
                  <th className="p-6 font-black text-[13px] uppercase tracking-widest text-slate-500 w-1/3 text-center">วันที่และเวลา</th>
                  <th className="p-6 font-black text-[13px] uppercase tracking-widest text-slate-500 text-center w-1/3">สถานะการเข้าเรียน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredHistory.length > 0 ? (
                  filteredHistory.map((item) => (
                    <tr
                      key={item.id}
                      className={`transition-all duration-300 group ${
                        isAbsent(item) 
                          ? 'bg-rose-50/10 hover:bg-rose-50/30' 
                          : item.status?.toLowerCase() === 'leave' 
                            ? 'bg-orange-50/10 hover:bg-orange-50/30' 
                            : 'hover:bg-indigo-50/20'
                      }`}
                    >
                      <td className="p-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 transition-transform group-hover:scale-110 ${
                            isAbsent(item) 
                              ? 'bg-rose-100 text-rose-600' 
                              : item.status?.toLowerCase() === 'leave'
                                ? 'bg-orange-100 text-orange-600'
                                : 'bg-indigo-100 text-indigo-600'
                          }`}>
                            {item.subjectCode.substring(0, 5)}
                          </div>
                          <div>
                            <div className={`font-black text-[16px] mb-0.5 transition-colors ${isAbsent(item) ? 'text-rose-700' : 'text-slate-800 group-hover:text-indigo-600'}`}>
                              {item.subjectCode}
                            </div>
                            <div className="text-[13px] text-slate-500 font-bold opacity-80 uppercase tracking-tight">
                              {item.subjectName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="inline-flex flex-col items-center">
                          <div className="flex items-center text-sm font-black text-slate-700 bg-slate-100/50 px-3 py-1.5 rounded-xl border border-slate-200/40">
                            <Calendar size={14} className="mr-2 text-indigo-500" />
                            {new Date(item.checkedAt).toLocaleDateString('th-TH', {
                              year: 'numeric', month: 'short', day: 'numeric'
                            })}
                          </div>
                          {!isAbsent(item) && (
                            <div className="flex items-center text-[12px] text-slate-400 font-bold mt-2 tracking-wide">
                              <Clock size={13} className="mr-1.5" />
                              {new Date(item.checkedAt).toLocaleTimeString('th-TH', {
                                hour: '2-digit', minute: '2-digit'
                              })} น.
                            </div>
                          )}
                          {isAbsent(item) && (
                            <div className="flex items-center text-[12px] text-rose-400 font-bold mt-2 tracking-wide uppercase">
                              <XCircle size={13} className="mr-1.5" />
                              ไม่ได้เข้าเรียน
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <span className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-2xl text-[12px] font-black tracking-widest uppercase transition-all group-hover:scale-105 ${getStatusStyle(item.status)}`}>
                          {(item.status?.toLowerCase() === 'on_time' || item.status?.toLowerCase() === 'present') && <CheckCircle2 size={14} />}
                          {getStatusText(item.status)}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="p-20 text-center">
                      <div className="bg-slate-50 rounded-3xl p-10 inline-block border border-dashed border-slate-300">
                        <Filter size={32} className="text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500 font-black text-lg">ไม่พบประวัติสำหรับวิชานี้</p>
                        <p className="text-slate-400 text-sm font-bold mt-1">ลองเปลี่ยนวิชาหรือเลือกแสดงทั้งหมด</p>
                        <button 
                          onClick={() => setSelectedSubject('all')}
                          className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                        >
                          แสดงทั้งหมด
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}