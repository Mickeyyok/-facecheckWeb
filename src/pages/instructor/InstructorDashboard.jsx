import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Trash2, Calendar, MapPin, Users, ChevronRight, XCircle, Clock, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { classService } from '../../services/classService';

export default function InstructorDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // State สำหรับรายวิชาจาก API
  const [instructorCourses, setInstructorCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // State สำหรับ Modals
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [classToDelete, setClassToDelete] = useState(null);
  const [saving, setSaving] = useState(false);

  // State สำหรับ Form สร้างคลาส
  const [newClass, setNewClass] = useState({
    subjectCode: '',
    subjectName: '',
    room: '',
    scheduleDay: 'จันทร์',
    startTime: '09:00',
    endTime: '12:00',
    lateThresholdMinutes: 15,
  });

  // ============================================
  // ดึงคลาสจาก API ตอนเปิดหน้า
  // ============================================
  useEffect(() => {
    if (user?.id) {
      fetchClasses();
    }
  }, [user]);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const data = await classService.getClassesByTeacher(user.id);
      setInstructorCourses(data);
    } catch (error) {
      console.error('ดึงข้อมูลคลาสไม่สำเร็จ:', error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // สร้างคลาสใหม่
  // ============================================
  const handleCreateClass = async () => {
    // Validation
    if (!newClass.subjectCode.trim() || !newClass.subjectName.trim()) {
      alert('กรุณากรอกรหัสวิชาและชื่อวิชา');
      return;
    }

    try {
      setSaving(true);
      await classService.createClass({
        teacherId: user.id,
        subjectName: newClass.subjectName,
        subjectCode: newClass.subjectCode,
        room: newClass.room,
        scheduleDay: newClass.scheduleDay,
        startTime: newClass.startTime,
        endTime: newClass.endTime,
        lateThresholdMinutes: newClass.lateThresholdMinutes,
      });

      // รีเซ็ตฟอร์มและปิด Modal
      setNewClass({
        subjectCode: '',
        subjectName: '',
        room: '',
        scheduleDay: 'จันทร์',
        startTime: '09:00',
        endTime: '12:00',
        lateThresholdMinutes: 15,
      });
      setShowCreateClassModal(false);

      // โหลดข้อมูลใหม่
      await fetchClasses();
    } catch (error) {
      console.error('สร้างคลาสไม่สำเร็จ:', error);
      alert('สร้างคลาสไม่สำเร็จ: ' + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // ลบคลาส
  // ============================================
  const confirmDelete = async () => {
    try {
      setSaving(true);
      await classService.deleteClass(classToDelete.id);
      setClassToDelete(null);
      await fetchClasses();
    } catch (error) {
      console.error('ลบคลาสไม่สำเร็จ:', error);
      alert('ลบคลาสไม่สำเร็จ: ' + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // Filter การค้นหา
  // ============================================
  const filteredCourses = instructorCourses.filter(course =>
    course.subjectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.subjectCode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ============================================
  // Helper: format เวลาให้อ่านง่าย
  // ============================================
  const formatTime = (startTime, endTime) => {
    if (startTime && endTime) {
      // LocalTime จาก Backend อาจมาเป็น "09:00:00" ให้เอาแค่ HH:mm
      const start = startTime.substring(0, 5);
      const end = endTime.substring(0, 5);
      return `${start} - ${end}`;
    }
    return 'ยังไม่ระบุเวลา';
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
            <input
              type="text"
              placeholder="ค้นหารายวิชา..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            />
          </div>
          <button onClick={() => setShowCreateClassModal(true)} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium flex justify-center items-center space-x-2 hover:bg-purple-700 transition shadow-sm">
            <Plus size={18} /><span>สร้างคลาส</span>
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="animate-spin text-purple-500" size={36} />
          <span className="ml-3 text-slate-500">กำลังโหลดข้อมูล...</span>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-slate-200">
          <div className="text-slate-300 mb-4">
            <Calendar size={48} className="mx-auto" />
          </div>
          <h4 className="text-lg font-bold text-slate-500">ยังไม่มีคลาส</h4>
          <p className="text-slate-400 text-sm mt-1">กดปุ่ม "สร้างคลาส" เพื่อเริ่มต้น</p>
        </div>
      ) : (
        /* Grid คลาสเรียน */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredCourses.map(course => (
            <div key={course.id} className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition overflow-hidden flex flex-col">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex flex-col items-start">
                    <span className="text-[10px] font-bold px-2 py-1 rounded-md mb-2 uppercase border bg-slate-50 text-slate-500 border-slate-200">
                      {course.scheduleDay || 'ยังไม่ระบุวัน'}
                    </span>
                    <h4 className="text-xl font-bold text-slate-800 leading-tight">{course.subjectName}</h4>
                    <span className="text-sm font-semibold text-purple-600 mt-1">รหัสวิชา: {course.subjectCode}</span>
                  </div>
                  <button onClick={() => setClassToDelete(course)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition" title="ลบคลาส"><Trash2 size={18}/></button>
                </div>
                
                <div className="space-y-2 text-sm text-slate-600 mt-6 border-t border-slate-100 pt-4">
                  <div className="flex items-center"><Calendar size={16} className="mr-2 text-slate-400"/> {formatTime(course.startTime, course.endTime)}</div>
                  <div className="flex items-center"><MapPin size={16} className="mr-2 text-slate-400"/> ห้อง {course.room || '-'}</div>
                  <div className="flex items-center"><Clock size={16} className="mr-2 text-slate-400"/> เกณฑ์สาย: {course.lateThresholdMinutes || 15} นาที</div>
                </div>
              </div>
              
              <div className="mt-auto bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-between items-center">
                <span className="text-xs text-slate-500 font-medium bg-white px-2 py-1 border border-slate-200 rounded">เกณฑ์: สายหลัง {course.lateThresholdMinutes || 15} นาที</span>
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
      )}

      {/* --- Modals --- */}
      
      {/* Modal Create Class */}
      {showCreateClassModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl relative p-6 animate-in zoom-in-95">
            <button onClick={() => setShowCreateClassModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 z-10"><XCircle size={24} /></button>
            <h3 className="text-xl font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">สร้างคลาสใหม่</h3>
            <div className="space-y-3 mb-6">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">รหัสวิชา *</label>
                <input
                  type="text"
                  placeholder="เช่น SP344"
                  value={newClass.subjectCode}
                  onChange={(e) => setNewClass({ ...newClass, subjectCode: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">ชื่อวิชา *</label>
                <input
                  type="text"
                  placeholder="เช่น Software Engineering"
                  value={newClass.subjectName}
                  onChange={(e) => setNewClass({ ...newClass, subjectName: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">ห้องเรียน</label>
                <input
                  type="text"
                  placeholder="เช่น 21509"
                  value={newClass.room}
                  onChange={(e) => setNewClass({ ...newClass, room: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">วันเรียน</label>
                <select
                  value={newClass.scheduleDay}
                  onChange={(e) => setNewClass({ ...newClass, scheduleDay: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="จันทร์">จันทร์</option>
                  <option value="อังคาร">อังคาร</option>
                  <option value="พุธ">พุธ</option>
                  <option value="พฤหัสบดี">พฤหัสบดี</option>
                  <option value="ศุกร์">ศุกร์</option>
                  <option value="เสาร์">เสาร์</option>
                  <option value="อาทิตย์">อาทิตย์</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">เวลาเริ่ม</label>
                  <input
                    type="time"
                    value={newClass.startTime}
                    onChange={(e) => setNewClass({ ...newClass, startTime: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">เวลาสิ้นสุด</label>
                  <input
                    type="time"
                    value={newClass.endTime}
                    onChange={(e) => setNewClass({ ...newClass, endTime: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">เกณฑ์สาย (นาที)</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={newClass.lateThresholdMinutes}
                  onChange={(e) => setNewClass({ ...newClass, lateThresholdMinutes: parseInt(e.target.value) || 15 })}
                  className="w-full px-4 py-2 border rounded-lg bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            <button
              onClick={handleCreateClass}
              disabled={saving}
              className="w-full bg-purple-600 text-white py-2.5 rounded-lg font-bold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {saving ? <><Loader2 size={18} className="animate-spin mr-2" /> กำลังบันทึก...</> : 'ยืนยันสร้างคลาส'}
            </button>
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
            <p className="text-slate-500 text-sm mb-1 font-semibold">{classToDelete.subjectName}</p>
            <p className="text-slate-400 text-xs mb-6">คลาสและข้อมูลเช็กชื่อทั้งหมดในวิชานี้จะถูกลบ</p>
            <div className="flex space-x-3">
              <button onClick={() => setClassToDelete(null)} className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-lg font-bold hover:bg-slate-200">ยกเลิก</button>
              <button
                onClick={confirmDelete}
                disabled={saving}
                className="flex-1 bg-red-500 text-white py-2.5 rounded-lg font-bold hover:bg-red-600 disabled:opacity-50"
              >
                {saving ? 'กำลังลบ...' : 'ยืนยันลบ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
