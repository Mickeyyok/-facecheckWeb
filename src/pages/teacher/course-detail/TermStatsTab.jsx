import React from 'react';
import { BarChart2, CheckCircle } from 'lucide-react';

export default function TermStatsTab({
  loadingTerm,
  termGrade,
  termColor,
  avgAttendance,
  termStats
}) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* === สรุปภาพรวม (Rule-based) === */}
      <div className="bg-gradient-to-r from-indigo-50 to-slate-50 rounded-2xl border border-indigo-100 p-4 sm:p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500 opacity-5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-indigo-200/50 pb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="bg-white p-2 sm:p-2.5 rounded-xl text-indigo-600 shadow-sm border border-indigo-100 shrink-0">
              <BarChart2 size={18} className="text-indigo-600" />
            </div>
            <h4 className="text-base sm:text-xl font-extrabold text-indigo-950">สรุปภาพรวมทั้งเทอม</h4>
          </div>
        </div>
        {loadingTerm ? (
          <p className="text-indigo-600 text-sm font-medium animate-pulse">กำลังคำนวณข้อมูล...</p>
        ) : (
          <p className="text-indigo-900/80 text-sm sm:text-[15px] relative z-10 leading-relaxed font-medium">
            นักศึกษามีความรับผิดชอบในเกณฑ์ <span className={`font-extrabold px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg shadow-sm border mx-1 text-sm sm:text-base ${termColor}`}>{termGrade}</span> ค่าเฉลี่ยการเข้าเรียนตลอดเทอมอยู่ที่ {avgAttendance}%
          </p>
        )}
      </div>

      {/* === ตารางขาดเรียนสะสมสูงสุด === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm">
          <h4 className="font-bold text-slate-800 flex items-center mb-4"><BarChart2 size={18} className="mr-2 text-indigo-600" /> นักศึกษาที่ขาดเรียนสะสมสูงสุด</h4>
          {loadingTerm ? (
            <p className="text-sm text-slate-500 mt-4">กำลังโหลดข้อมูล...</p>
          ) : (
            <div className="space-y-4 mt-4">
              {termStats.filter(s => s.absentCount > 0).sort((a, b) => b.absentCount - a.absentCount).slice(0, 5).map((s, idx) => (
                <div key={s.id} className="flex justify-between items-center border-b border-slate-50 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 font-bold w-4">{idx + 1}.</span>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{s.name}</p>
                      <p className="text-xs text-slate-500">{s.studentId}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-red-600 font-bold text-xs bg-red-50 px-2 py-1 rounded block mb-1">ขาดเรียนสะสม {s.absentCount} ครั้ง</span>
                    <span className="text-slate-500 text-[10px]">อัตราเข้าเรียน {s.attendancePercent}%</span>
                  </div>
                </div>
              ))}
              {termStats.filter(s => s.absentCount > 0).length === 0 && (
                <div className="text-center py-6">
                  <CheckCircle size={32} className="mx-auto text-emerald-400 mb-2" />
                  <p className="text-slate-600 font-bold">ไม่มีนักศึกษาที่ขาดเรียน</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
