import React from 'react';
import { History } from 'lucide-react';
import { mockStudentData } from '../../data/mockData';

// Component ป้ายสถานะ เล็กๆ สำหรับใช้ในหน้านี้
const StatusBadge = ({ status }) => {
  if (status === 'present') return <span className="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-700 border border-green-200">✅ ตรงเวลา</span>;
  if (status === 'late') return <span className="px-2 py-1 rounded text-xs font-semibold bg-yellow-100 text-yellow-700 border border-yellow-200">⚠️ สาย</span>;
  if (status === 'absent') return <span className="px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-700 border border-red-200">❌ ขาดเรียน</span>;
  return <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-500 border border-gray-200">- รอดำเนินการ</span>;
};

export default function StudentHistory() {
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
            <select className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm">
              <option>ทุกวิชา</option>
              <option>Software Engineering</option>
              <option>Database System</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto p-2">
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
              {mockStudentData.history.map(item => (
                <tr key={item.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                  <td className="py-4.5 px-7 font-bold text-slate-800">{item.course}</td>
                  <td className="py-4.5 px-7 text-slate-500 font-medium text-sm">{item.date}</td>
                  <td className="py-4.5 px-7 text-slate-500 font-medium text-sm">{item.time} น.</td>
                  <td className="py-4.5 px-7"><StatusBadge status={item.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="p-6 border-t border-slate-100 flex justify-between items-center text-sm text-slate-500 font-medium bg-white">
          <span>แสดง 1 ถึง 2 จาก 2 รายการ</span>
          <div className="flex space-x-2">
            <button className="px-4 py-2 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors">ก่อนหน้า</button>
            <button className="px-4 py-2 bg-[#2b4cdd] text-white rounded-lg shadow-sm font-bold">1</button>
            <button className="px-4 py-2 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors">ถัดไป</button>
          </div>
        </div>
      </div>
    </div>
  );
}
