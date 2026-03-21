import React, { useState } from 'react';
import { Plus, BookOpen, Trash2, Calendar, MapPin, User, XCircle } from 'lucide-react';

export default function StudentCourses() {
  const [studentCourses, setStudentCourses] = useState([
    { id: 'SP344', name: 'Software Engineering', room: '21509', time: 'วันจันทร์ 09:00 - 12:00 น.', instructor: 'อ. น้ำฝน อัศวเมฆิน' },
    { id: 'IT201', name: 'Database System', room: '21302', time: 'วันอังคาร 13:00 - 16:00 น.', instructor: 'อ. สมเกียรติ ใจดี' },
  ]);
  
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState(null);

  const confirmDelete = () => {
    setStudentCourses(studentCourses.filter(c => c.id !== courseToDelete.id));
    setCourseToDelete(null);
  };

  return (
    <div className="p-8 lg:p-10 space-y-6 max-w-6xl mx-auto animate-in fade-in duration-300">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-2xl font-bold text-slate-800">รายวิชาที่ลงทะเบียน</h3>
        <button onClick={() => setShowAddCourseModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center space-x-2 hover:bg-blue-700 transition shadow-sm">
          <Plus size={18} /><span>เพิ่มรายวิชา</span>
        </button>
      </div>

      {studentCourses.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center flex flex-col items-center justify-center shadow-sm">
          <BookOpen size={48} className="text-slate-300 mb-4" />
          <p className="text-lg font-bold text-slate-700">ยังไม่มีรายวิชาที่ลงทะเบียน</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {studentCourses.map(course => (
            <div key={course.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition relative flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">{course.id}</span>
                  <h4 className="text-[18px] font-bold text-slate-800 leading-tight mt-2">{course.name}</h4>
                </div>
                <button 
                  onClick={() => setCourseToDelete(course)}
                  className="text-slate-400 hover:text-red-500 transition p-2 hover:bg-red-50 rounded-lg"
                  title="ลบรายวิชา"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              
              <div className="mt-auto space-y-2 text-sm text-slate-600 pt-4 border-t border-slate-100">
                <div className="flex items-center"><Calendar size={16} className="mr-2 text-slate-400" /><span>{course.time}</span></div>
                <div className="flex items-center"><MapPin size={16} className="mr-2 text-slate-400" /><span>ห้องเรียน {course.room}</span></div>
                <div className="flex items-center"><User size={16} className="mr-2 text-slate-400" /><span>{course.instructor}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- Modals --- */}
      
      {/* Modal Add Course */}
      {showAddCourseModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl relative animate-in zoom-in-95">
            <button onClick={() => setShowAddCourseModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 z-10"><XCircle size={24} /></button>
            <div className="p-6">
              <h3 className="text-xl font-bold text-center mb-2 text-slate-800">เพิ่มรายวิชา</h3>
              <p className="text-center text-slate-500 text-sm mb-6">กรอกรหัสวิชาที่ได้รับจากอาจารย์</p>
              <input type="text" placeholder="เช่น SP344" className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none text-center font-bold uppercase mb-4" />
              <button onClick={() => { alert("ลงทะเบียนวิชาสำเร็จ!"); setShowAddCourseModal(false); }} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition">เข้าร่วมวิชา</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal ยืนยันการลบ */}
      {courseToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-xs overflow-hidden shadow-xl relative p-6 text-center animate-in zoom-in-95">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">ยืนยันการลบ?</h3>
            <p className="text-slate-500 text-sm mb-6">คุณต้องการลบรายวิชา {courseToDelete.name} ใช่หรือไม่?</p>
            <div className="flex space-x-3">
              <button onClick={() => setCourseToDelete(null)} className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-lg font-bold hover:bg-slate-200">ยกเลิก</button>
              <button onClick={confirmDelete} className="flex-1 bg-red-500 text-white py-2.5 rounded-lg font-bold hover:bg-red-600">ยืนยันลบ</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
