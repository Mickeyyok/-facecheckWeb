import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Trash2, Calendar, MapPin, Users, ChevronRight, XCircle } from 'lucide-react';

export default function InstructorDashboard() {
  const navigate = useNavigate();

  // ข้อมูลจำลองรายวิชาของอาจารย์
  const [instructorCourses, setInstructorCourses] = useState([
    { id: 'SP344', name: 'Software Engineering', room: '21509', time: '09:00 - 12:00', students: 30, status: 'active' },
    { id: 'IT201', name: 'Database System', room: '21302', time: '13:00 - 16:00', students: 45, status: 'upcoming' },
  ]);

  // State สำหรับ Modals
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [classToDelete, setClassToDelete] = useState(null);

  const confirmDelete = () => {
    setInstructorCourses(instructorCourses.filter(c => c.id !== classToDelete.id));
    setClassToDelete(null);
  };

  return (
    <div className="p-8 lg:p-10 space-y-6 max-w-6xl mx-auto animate-in fade-in duration-300">
      
      {/* Header: ค้นหา & สร้างคลาส */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h3 className="text-2xl font-bold text-slate-800">คลาสของฉัน (My Classes)</h3>
          <p className="text-slate-500 mt-1 text-sm">จัดการรายวิชาและเวลาเช็คชื่อ</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="ค้นหารายวิชา..." className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm" />
          </div>
          <button onClick={() => setShowCreateClassModal(true)} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium flex justify-center items-center space-x-2 hover:bg-purple-700 transition shadow-sm">
            <Plus size={18} /><span>สร้างคลาส</span>
          </button>
        </div>
      </div>

      {/* Grid คลาสเรียน */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {instructorCourses.map(course => (
          <div key={course.id} className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition overflow-hidden flex flex-col">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex flex-col items-start">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md mb-2 uppercase border ${course.status === 'active' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                      {course.status === 'active' ? 'กำลังเรียนวันนี้' : 'รอการเรียนการสอน'}
                    </span>
                    <h4 className="text-xl font-bold text-slate-800 leading-tight">{course.name}</h4>
                    <span className="text-sm font-semibold text-purple-600 mt-1">รหัสวิชา: {course.id}</span>
                </div>
                <button onClick={() => setClassToDelete(course)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition" title="ลบคลาส"><Trash2 size={18}/></button>
              </div>
              
              <div className="space-y-2 text-sm text-slate-600 mt-6 border-t border-slate-100 pt-4">
                <div className="flex items-center"><Calendar size={16} className="mr-2 text-slate-400"/> {course.time}</div>
                <div className="flex items-center"><MapPin size={16} className="mr-2 text-slate-400"/> ห้อง {course.room}</div>
                <div className="flex items-center"><Users size={16} className="mr-2 text-slate-400"/> นักศึกษาลงทะเบียน {course.students} คน</div>
              </div>
            </div>
            
            <div className="mt-auto bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-between items-center">
              <span className="text-xs text-slate-500 font-medium bg-white px-2 py-1 border border-slate-200 rounded">เกณฑ์: สายหลัง 15 นาที</span>
              {/* กดปุ่มแล้วไปหน้า CourseDetail */}
              <button 
                onClick={() => navigate(`/instructor/course/${course.id}`)} 
                className="text-purple-600 text-sm font-bold flex items-center hover:text-purple-800 transition"
              >
                จัดการคลาส <ChevronRight size={16} className="ml-1"/>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* --- Modals --- */}
      
      {/* Modal Create Class */}
      {showCreateClassModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl relative p-6 animate-in zoom-in-95">
            <button onClick={() => setShowCreateClassModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 z-10"><XCircle size={24} /></button>
            <h3 className="text-xl font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">สร้างคลาสใหม่</h3>
            <div className="space-y-3 mb-6">
              <input type="text" placeholder="รหัสวิชา" className="w-full px-4 py-2 border rounded-lg bg-slate-50 text-sm" />
              <input type="text" placeholder="ชื่อวิชา" className="w-full px-4 py-2 border rounded-lg bg-slate-50 text-sm" />
              <input type="text" placeholder="ห้องเรียน" className="w-full px-4 py-2 border rounded-lg bg-slate-50 text-sm" />
            </div>
            <button onClick={() => { alert("สร้างคลาสสำเร็จ!"); setShowCreateClassModal(false); }} className="w-full bg-purple-600 text-white py-2.5 rounded-lg font-bold hover:bg-purple-700">ยืนยัน</button>
          </div>
        </div>
      )}

      {/* Modal ยืนยันการลบ */}
      {classToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-xs overflow-hidden shadow-xl relative p-6 text-center animate-in zoom-in-95">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">ยืนยันการลบ?</h3>
            <p className="text-slate-500 text-sm mb-6">คลาสและข้อมูลเช็กชื่อทั้งหมดในวิชานี้จะถูกลบ</p>
            <div className="flex space-x-3">
              <button onClick={() => setClassToDelete(null)} className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-lg font-bold hover:bg-slate-200">ยกเลิก</button>
              <button onClick={confirmDelete} className="flex-1 bg-red-500 text-white py-2.5 rounded-lg font-bold hover:bg-red-600">ยืนยันลบ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
