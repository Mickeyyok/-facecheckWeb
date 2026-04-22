import React from 'react';
import { Calendar, RefreshCw, Download, ChevronLeft, ChevronRight, Users, Filter } from 'lucide-react';

const StatusBadge = ({ status }) => {
  if (status === 'present' || status === 'on_time') return <span className="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-700 border border-green-200">ตรงเวลา</span>;
  if (status === 'late') return <span className="px-2 py-1 rounded text-xs font-semibold bg-yellow-100 text-yellow-700 border border-yellow-200">สาย</span>;
  if (status === 'absent') return <span className="px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-700 border border-red-200">❌ขาดเรียน</span>;
  if (status === 'leave') return <span className="px-2 py-1 rounded text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200">ลา</span>;
  return <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-500 border border-gray-200">- รอดำเนินการ</span>;
};

export default function DailyStatsTab({
  scheduledDates,
  setCourseSubTab,
  selectedDate,
  todayStr,
  scheduledDateList,
  selectedDateIndex,
  fetchDailyAttendance,
  exportDailyCSV,
  goPrevDate,
  hasPrevDate,
  goNextDate,
  hasNextDate,
  setSelectedDate,
  formatThaiDate,
  loadingDaily,
  dailyStats,
  checkedCount,
  checkedPercent,
  dailyStudentRows,
  dailyFilter,
  setDailyFilter,
  filteredDailyRows
}) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {scheduledDates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center">
          <Calendar size={36} className="mx-auto text-slate-300 mb-3 sm:mb-4" />
          <p className="font-bold text-slate-600 text-base sm:text-lg">ยังไม่มีวันที่เปิดให้เช็คชื่อ</p>
          <p className="text-slate-500 text-xs sm:text-sm mt-2">ไปที่ Tab <span className="font-bold text-indigo-600">"ข้อมูลวิชา"</span> แล้วกด "สร้างตารางอัตโนมัติ" เพื่อกำหนดวันเช็คชื่อก่อน</p>
          <button onClick={() => setCourseSubTab('info')} className="mt-4 sm:mt-5 bg-indigo-600 text-white font-bold px-5 sm:px-6 py-2.5 rounded-xl hover:bg-indigo-700 transition shadow-sm text-sm">ไปกำหนดวันเช็คชื่อ</button>
        </div>
      ) : (
        <>
          <div className="bg-slate-50 p-3 sm:p-5 rounded-xl border border-slate-200">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div>
                <h4 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  รายงานสถิติประจำวัน
                  {selectedDate === todayStr && scheduledDateList.includes(todayStr) && (
                    <span className="flex items-center gap-1.5 text-xs bg-emerald-500 text-white font-bold px-2.5 py-1 rounded-full"><span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span> LIVE</span>
                  )}
                </h4>
                <p className="text-sm text-slate-500 mt-0.5">{selectedDate === todayStr ? 'กำลังแสดงผลวันนี้' : `วันที่ ${formatThaiDate(selectedDate)}`} {selectedDateIndex >= 0 && <span className="ml-2 text-indigo-600 font-bold">ครั้งที่ {selectedDateIndex + 1}/{scheduledDateList.length}</span>}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                {selectedDate === todayStr && (
                  <button onClick={() => fetchDailyAttendance(selectedDate)} className="text-sm bg-white text-slate-600 border border-slate-300 font-bold px-3 py-2 rounded-lg hover:bg-slate-50 transition flex items-center"><RefreshCw size={14} className="mr-1.5" /> รีเฟรช</button>
                )}
                <button onClick={exportDailyCSV} className="text-sm bg-emerald-600 text-white font-bold px-3.5 py-2 rounded-lg hover:bg-emerald-700 transition shadow-sm flex items-center"><Download size={14} className="mr-1.5" /> ส่งออก CSV</button>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-200">
              <button onClick={goPrevDate} disabled={!hasPrevDate} className={`p-1.5 sm:p-2 rounded-lg border transition shrink-0 ${hasPrevDate ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 shadow-sm' : 'text-slate-300 border-slate-100 cursor-not-allowed'}`}><ChevronLeft size={16} className="sm:hidden" /><ChevronLeft size={18} className="hidden sm:block" /></button>
              <div className="flex-1 flex items-center justify-center min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 bg-white border border-indigo-200 rounded-xl px-2.5 sm:px-5 py-2 sm:py-2.5 shadow-sm w-full max-w-xs sm:max-w-none sm:w-auto">
                  <Calendar size={14} className="text-indigo-500 shrink-0 sm:hidden" />
                  <Calendar size={16} className="text-indigo-500 shrink-0 hidden sm:block" />
                  <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="text-xs sm:text-sm font-bold text-slate-800 outline-none bg-transparent cursor-pointer pr-1 sm:pr-2 w-full sm:w-auto">
                    {scheduledDateList.map((d, i) => <option key={d} value={d}>{formatThaiDate(d)}{d === todayStr ? ' (วันนี้)' : ''} — ครั้งที่ {i + 1}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={goNextDate} disabled={!hasNextDate} className={`p-1.5 sm:p-2 rounded-lg border transition shrink-0 ${hasNextDate ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 shadow-sm' : 'text-slate-300 border-slate-100 cursor-not-allowed'}`}><ChevronRight size={16} className="sm:hidden" /><ChevronRight size={18} className="hidden sm:block" /></button>
            </div>
          </div>

          {!loadingDaily && dailyStats.total > 0 && (
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-2.5">
                <p className="text-sm font-bold text-slate-700">ความคืบหน้าการเช็คชื่อ</p>
                <p className="text-sm font-bold text-slate-800">{checkedCount}/{dailyStats.total} คน <span className={`ml-1 ${checkedPercent === 100 ? 'text-emerald-600' : 'text-slate-500'}`}>({checkedPercent}%)</span></p>
              </div>
              <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex">
                {dailyStats.present > 0 && <div className="bg-green-500 h-full transition-all duration-500 relative group" style={{ width: `${(dailyStats.present / dailyStats.total) * 100}%` }}><span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-bold opacity-0 group-hover:opacity-100 transition">{dailyStats.present}</span></div>}
                {dailyStats.late > 0 && <div className="bg-yellow-400 h-full transition-all duration-500 relative group" style={{ width: `${(dailyStats.late / dailyStats.total) * 100}%` }}><span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-bold opacity-0 group-hover:opacity-100 transition">{dailyStats.late}</span></div>}
                {dailyStats.absent > 0 && <div className="bg-red-400 h-full transition-all duration-500 relative group" style={{ width: `${(dailyStats.absent / dailyStats.total) * 100}%` }}><span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-bold opacity-0 group-hover:opacity-100 transition">{dailyStats.absent}</span></div>}
                {dailyStats.leave > 0 && <div className="bg-orange-400 h-full transition-all duration-500 relative group" style={{ width: `${(dailyStats.leave / dailyStats.total) * 100}%` }}><span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-bold opacity-0 group-hover:opacity-100 transition">{dailyStats.leave}</span></div>}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-5 gap-y-1.5 mt-2.5 text-[10px] sm:text-xs font-medium text-slate-500">
                <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded"></div> ตรงเวลา ({dailyStats.present})</span>
                <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-yellow-400 rounded"></div> สาย ({dailyStats.late})</span>
                <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-red-400 rounded"></div> ขาดเรียน ({dailyStats.absent})</span>
                <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-orange-400 rounded"></div> ลา ({dailyStats.leave})</span>
                <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-slate-200 rounded border border-slate-300"></div> รอ ({dailyStats.pending})</span>
              </div>
            </div>
          )}

          {loadingDaily ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 text-center animate-pulse"><div className="h-3 w-20 bg-slate-100 rounded mx-auto mb-3"></div><div className="h-8 w-12 bg-slate-100 rounded mx-auto"></div></div>)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-4">
              <div className="bg-white p-3 sm:p-5 rounded-xl border border-slate-200 text-center"><p className="text-slate-500 text-[10px] sm:text-xs font-bold uppercase mb-1">ทั้งหมด</p><p className="text-2xl sm:text-3xl font-bold text-slate-800">{dailyStats.total}</p></div>
              <div className="bg-white p-3 sm:p-5 rounded-xl border border-slate-200 border-b-4 border-b-green-500 text-center"><p className="text-green-600 text-[10px] sm:text-xs font-bold uppercase mb-1">ตรงเวลา</p><p className="text-2xl sm:text-3xl font-bold text-green-600">{dailyStats.present}</p></div>
              <div className="bg-white p-3 sm:p-5 rounded-xl border border-slate-200 border-b-4 border-b-yellow-500 text-center"><p className="text-yellow-600 text-[10px] sm:text-xs font-bold uppercase mb-1">มาสาย</p><p className="text-2xl sm:text-3xl font-bold text-yellow-600">{dailyStats.late}</p></div>
              <div className="bg-white p-3 sm:p-5 rounded-xl border border-slate-200 border-b-4 border-b-red-500 text-center"><p className="text-red-500 text-[10px] sm:text-xs font-bold uppercase mb-1">ขาดเรียน</p><p className="text-2xl sm:text-3xl font-bold text-red-500">{dailyStats.absent}</p></div>
              <div className="bg-white p-3 sm:p-5 rounded-xl border border-slate-200 border-b-4 border-b-orange-500 text-center"><p className="text-orange-500 text-[10px] sm:text-xs font-bold uppercase mb-1">การลา</p><p className="text-2xl sm:text-3xl font-bold text-orange-500">{dailyStats.leave}</p></div>
            </div>
          )}

          {loadingDaily ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center"><div className="animate-spin w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full mx-auto"></div><p className="text-slate-500 text-sm mt-3 font-medium">กำลังโหลดข้อมูล...</p></div>
          ) : dailyStudentRows.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center"><Users size={32} className="mx-auto text-slate-300 mb-3" /><p className="font-bold text-slate-500">ยังไม่มีนักศึกษาในคลาสนี้</p></div>
          ) : (
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Filter size={14} className="text-slate-400" />
                {[
                  { key: 'all', label: 'ทั้งหมด', count: dailyStudentRows.length },
                  { key: 'present', label: 'ตรงเวลา', count: dailyStats.present, color: 'green' },
                  { key: 'late', label: 'สาย', count: dailyStats.late, color: 'yellow' },
                  { key: 'absent', label: 'ขาดเรียน', count: dailyStats.absent, color: 'red' },
                  { key: 'leave', label: 'ลา', count: dailyStats.leave, color: 'orange' },
                  { key: 'pending', label: 'รอดำเนินการ', count: dailyStats.pending, color: 'gray' },
                ].map(f => (
                  <button key={f.key} onClick={() => setDailyFilter(f.key)} className={`text-xs font-bold px-3.5 py-2 rounded-lg transition border ${dailyFilter === f.key ? f.color === 'green' ? 'bg-green-50 text-green-700 border-green-300' : f.color === 'yellow' ? 'bg-yellow-50 text-yellow-700 border-yellow-300' : f.color === 'red' ? 'bg-red-50 text-red-600 border-red-300' : f.color === 'orange' ? 'bg-orange-50 text-orange-600 border-orange-300' : f.color === 'gray' ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-indigo-50 text-indigo-700 border-indigo-300' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                    {f.label} <span className="ml-1 opacity-70">({f.count})</span>
                  </button>
                ))}
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl -mx-4 sm:mx-0">
                <table className="w-full text-left text-sm min-w-[520px]">
                  <thead className="text-slate-500 bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 sm:py-3 px-3 sm:px-4 font-semibold w-10 sm:w-16 text-center text-xs sm:text-sm">#</th>
                      <th className="py-2.5 sm:py-3 px-3 sm:px-4 font-semibold w-32 sm:w-40 text-xs sm:text-sm">รหัส นศ.</th>
                      <th className="py-2.5 sm:py-3 px-3 sm:px-4 font-semibold text-xs sm:text-sm">ชื่อ-สกุล</th>
                      <th className="py-2.5 sm:py-3 px-3 sm:px-4 font-semibold text-center text-xs sm:text-sm">เวลา</th>
                      <th className="py-2.5 sm:py-3 px-3 sm:px-4 font-semibold text-center text-xs sm:text-sm">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDailyRows.map((row, idx) => (
                      <tr key={row.id || idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-center text-slate-400 text-xs font-bold">{idx + 1}</td>
                        <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-slate-600 font-mono text-[11px] sm:text-xs">{row.studentId || '-'}</td>
                        <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-slate-800 font-medium text-xs sm:text-sm">{row.name}</td>
                        <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-center text-slate-600 text-xs sm:text-sm font-medium">{row.checkedTime}</td>
                        <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-center"><StatusBadge status={row.attendanceStatus} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {dailyFilter !== 'all' && <p className="text-xs text-slate-500 font-medium mt-2">แสดง {filteredDailyRows.length} จาก {dailyStudentRows.length} คน</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
