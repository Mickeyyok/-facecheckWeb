import React from 'react';
import { Users, Plus, Upload, Trash2 } from 'lucide-react';

export default function StudentListTab({
  studentList,
  setAddStudentId,
  setAddStudentError,
  setAddStudentSuccess,
  setShowAddStudentModal,
  resetCsvModal,
  setShowCsvModal,
  setStudentToDelete
}) {
  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-6">
        <div><h4 className="font-bold text-slate-800 text-base sm:text-lg">รายชื่อนักศึกษาทั้งหมด</h4><p className="text-xs sm:text-sm text-slate-500 mt-1">จำนวน {studentList.length} คน</p></div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button onClick={() => { setAddStudentId(''); setAddStudentError(''); setAddStudentSuccess(''); setShowAddStudentModal(true); }} className="text-sm bg-indigo-600 text-white font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 shrink-0 flex-1 sm:flex-none flex items-center justify-center gap-1.5"><Plus size={15} /> เพิ่มรายชื่อ</button>
          <button onClick={() => { resetCsvModal(); setShowCsvModal(true); }} className="text-sm bg-emerald-600 text-white font-medium px-4 py-2 rounded-lg hover:bg-emerald-700 shrink-0 flex-1 sm:flex-none flex items-center justify-center gap-1.5"><Upload size={15} /> นำเข้า CSV</button>
        </div>
      </div>

      {studentList.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200">
          <Users size={36} className="mx-auto text-slate-300 mb-3" />
          <p className="font-bold text-slate-500">ยังไม่มีนักศึกษาในคลาสนี้</p>
          <p className="text-slate-400 text-sm mt-1">กดปุ่ม "+ เพิ่มรายชื่อ" เพื่อเพิ่มนักศึกษา</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-xl -mx-4 sm:mx-0">
          <table className="w-full text-left text-sm min-w-[400px]">
            <thead className="text-slate-500 bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="py-2.5 sm:py-3 px-3 sm:px-4 font-semibold w-32 sm:w-40 text-xs sm:text-sm">รหัสนักศึกษา</th>
                <th className="py-2.5 sm:py-3 px-3 sm:px-4 font-semibold text-xs sm:text-sm">ชื่อ-สกุล</th>
                <th className="py-2.5 sm:py-3 px-3 sm:px-4 font-semibold text-center w-16 sm:w-24 text-xs sm:text-sm">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {studentList.map(student => (
                <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-slate-600 font-mono text-[11px] sm:text-xs">{student.studentId || '-'}</td>
                  <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-slate-800 font-medium text-xs sm:text-sm">{student.name}</td>
                  <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-center">
                    <button onClick={() => setStudentToDelete(student)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 sm:p-2 rounded-lg transition" title="ลบรายชื่อนศ."><Trash2 size={14} className="sm:hidden" /><Trash2 size={16} className="hidden sm:block" /></button>
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
