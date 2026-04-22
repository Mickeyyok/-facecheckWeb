import React, { useState, useEffect } from 'react';
import { Search, Plus, BookOpen, Clock, MapPin, X, CheckCircle, AlertTriangle, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { classService } from '../../services/classService';

/**
 * @component StudentCourses
 * @description หน้าเพจสำหรับนักศึกษาเพื่อดูรายวิชาที่ลงทะเบียน ค้นหาวิชา เข้าร่วมคลาส และออกจากคลาส
 * ประกอบด้วยระบบ Modal สองส่วนสำหรับการยืนยันเข้าหรือออกจากวิชา
 */
export default function StudentCourses() {
  const { user } = useAuth();
  
  // ==========================================
  // 🗃️ ส่วนจัดการ State (ตัวแปรสถานะของหน้าจอ)
  // ==========================================
  
  // States สำหรับเก็บข้อมูลรายวิชาและการค้นหา
  const [courses, setCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // States สำหรับการทำงานของหน้าต่าง Modal เข้าร่วมคลาส
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinStatus, setJoinStatus] = useState({ type: '', message: '' }); // type: 'success' | 'error' | ''
  const [isJoining, setIsJoining] = useState(false);

  // States สำหรับ Modal ออกจากคลาส
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [courseToLeave, setCourseToLeave] = useState(null);
  const [isLeaving, setIsLeaving] = useState(false);

  // ==========================================
  // 🔄 ส่วนการดึงข้อมูลจาก API (Data Fetching)
  // ==========================================

  /**
   * @function fetchMyCourses
   * @description เรียกใช้ Service เพื่อดึงข้อมูลรายวิชาทั้งหมดที่นักศึกษาคนนี้ลงทะเบียนไว้
   * และนำมาอัปเดตลงใน State `courses`
   */
  const fetchMyCourses = async () => {
    setIsLoading(true);
    try {
      if (user?.id) {
        const data = await classService.getClassesByStudent(user.id);
        setCourses(data);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyCourses();
  }, [user]);

  // ฟังก์ชันค้นหาวิชา
  const filteredCourses = courses.filter(course => 
    course.subjectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.subjectCode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ==========================================
  // 🖱️ ส่วนจัดการเหตุการณ์ (Event Handlers)
  // ==========================================

  /**
   * @function handleJoinClass
   * @description จัดการเมื่อนักศึกษากด "ยืนยันเข้าร่วม" โดยส่งรหัสวิชา (joinCode) ไปที่ Backend
   * หากสำเร็จจะปิด Modal และดึงข้อมูลรายวิชาใหม่
   * @param {Event} e - Event ของการ Submit Form
   */
  const handleJoinClass = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setIsJoining(true);
    setJoinStatus({ type: '', message: '' });

    try {
      const localData = localStorage.getItem('user');
      const localUser = localData ? JSON.parse(localData) : {};
      
      const actualStudentId = user?.studentId || user?.student_id || localUser?.studentId || localUser?.student_id || "2310511101060"; 

      if (!actualStudentId) throw new Error('ไม่พบรหัสนักศึกษาในระบบ กรุณาล็อกอินใหม่');

      const res = await classService.joinClass(joinCode.trim(), actualStudentId);
      
      setJoinStatus({ type: 'success', message: `เข้าร่วมวิชา ${res.subjectName || joinCode} สำเร็จ!` });
      setJoinCode(''); 
      fetchMyCourses(); 

      setTimeout(() => {
        setShowJoinModal(false);
        setJoinStatus({ type: '', message: '' });
      }, 2000);

    } catch (error) {
      setJoinStatus({ type: 'error', message: error.message || 'ไม่สามารถเข้าร่วมคลาสได้' });
    } finally {
      setIsJoining(false);
    }
  };

  /**
   * @function handleLeaveClass
   * @description จัดการเมื่อนักศึกษากดยืนยันออกจากคลาส
   * สั่งลบข้อมูลการลงทะเบียนใน Backend และดึงรายการวิชาอัปเดตใหม่
   */
  const handleLeaveClass = async () => {
    if (!courseToLeave) return;
    setIsLeaving(true);

    try {
      // ใช้ classId (courseToLeave.id) และ userId (user.id)
      await classService.removeStudentFromClass(courseToLeave.id, user.id);
      
      // ล้างข้อมูลและโหลดใหม่
      setJoinStatus({ type: 'success', message: `ออกจากวิชา ${courseToLeave.subjectName} เรียบร้อยแล้ว` });
      setShowLeaveModal(false);
      setCourseToLeave(null);
      fetchMyCourses(); 

      setTimeout(() => {
        setJoinStatus({ type: '', message: '' });
      }, 3000);
      
    } catch (error) {
      alert(error.message || 'เกิดข้อผิดพลาดในการออกจากคลาส');
    } finally {
      setIsLeaving(false);
    }
  };

  return (
    <div className="p-8 lg:p-10 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1400px] mx-auto space-y-8">
      
      {/* Header และปุ่มเข้าร่วม */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">รายวิชาของฉัน</h2>
          <p className="text-slate-500 mt-1 font-medium">จัดการและดูข้อมูลวิชาเรียนทั้งหมดที่คุณลงทะเบียนไว้</p>
        </div>
        <button 
          onClick={() => setShowJoinModal(true)}
          className="bg-[#2b4cdd] hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5"
        >
          <Plus size={20} strokeWidth={2.5} className="mr-2" />
          เข้าร่วมคลาสเรียน
        </button>
      </div>

      {/* แถบค้นหา */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="ค้นหาจากชื่อวิชา หรือ รหัสวิชา..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl transition-all font-medium text-slate-700"
          />
        </div>
      </div>

      {/* Alert แจ้งเตือนเมื่อทำรายการสำเร็จ (เข้า/ออก) */}
      {joinStatus.message && joinStatus.type === 'success' && !showJoinModal && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl flex items-center shadow-sm animate-in fade-in">
          <CheckCircle size={20} className="mr-3 shrink-0" />
          <span className="font-bold">{joinStatus.message}</span>
        </div>
      )}

      {/* Grid แสดงวิชาเรียน */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-blue-600"></div>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 py-20 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="bg-blue-50 p-6 rounded-full mb-4">
            <BookOpen size={48} className="text-blue-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-700 mb-2">ยังไม่มีวิชาเรียน</h3>
          <p className="text-slate-500 mb-6 max-w-sm">คุณยังไม่ได้ลงทะเบียนหรือเข้าร่วมคลาสใดๆ กดปุ่ม "เข้าร่วมคลาสเรียน" ด้านบนเพื่อเริ่มใช้งาน</p>
          <button onClick={() => setShowJoinModal(true)} className="text-[#2b4cdd] font-bold hover:underline">
            + กดที่นี่เพื่อเข้าร่วมคลาส
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <div key={course.id} className="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
              <div className="h-2 bg-gradient-to-r from-[#2b4cdd] to-[#1e3ab8]"></div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-blue-50 text-blue-700 text-xs font-extrabold px-3 py-1.5 rounded-lg border border-blue-100">
                    รหัสวิชา: {course.subjectCode}
                  </div>
                  {/* ปุ่มออกจากคลาส */}
                  <button 
                    onClick={() => { setCourseToLeave(course); setShowLeaveModal(true); }}
                    className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-1.5 rounded-md transition-all"
                    title="ออกจากคลาสเรียน"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
                
                <h3 className="text-[18px] font-black text-slate-800 mb-4 line-clamp-2 leading-tight group-hover:text-[#2b4cdd] transition-colors">
                  {course.subjectName}
                </h3>
                
                <div className="space-y-3 mt-6">
                  <div className="flex items-center text-[13px] text-slate-600 font-medium">
                    <Clock size={16} className="mr-3 text-slate-400" />
                    <span>{course.scheduleDay || 'ไม่ระบุวัน'} • {course.startTime ? course.startTime.substring(0,5) : '-'} - {course.endTime ? course.endTime.substring(0,5) : '-'}</span>
                  </div>
                  <div className="flex items-center text-[13px] text-slate-600 font-medium">
                    <MapPin size={16} className="mr-3 text-slate-400" />
                    <span>ห้องเรียน {course.room || 'ไม่ระบุ'}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal เข้าร่วมคลาสเรียน */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200">
            
            <button 
              onClick={() => { setShowJoinModal(false); setJoinStatus({type:'', message:''}); }}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-full transition-colors"
            >
              <X size={24} />
            </button>

            <div className="p-8">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 border border-blue-100">
                <Plus size={28} className="text-[#2b4cdd]" strokeWidth={2.5} />
              </div>
              
              <h3 className="text-2xl font-black text-slate-800 mb-2">เข้าร่วมคลาสเรียน</h3>
              <p className="text-slate-500 font-medium text-sm mb-6">
                กรอกรหัสวิชา (เช่น SP344) ที่ได้รับจากอาจารย์ผู้สอนเพื่อเข้าสู่ห้องเรียน
              </p>

              {joinStatus.message && (
                <div className={`p-4 rounded-xl mb-6 flex items-start space-x-3 text-sm font-bold ${
                  joinStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {joinStatus.type === 'success' ? <CheckCircle size={20} className="shrink-0" /> : <AlertTriangle size={20} className="shrink-0" />}
                  <span>{joinStatus.message}</span>
                </div>
              )}

              <form onSubmit={handleJoinClass}>
                <div className="mb-6">
                  <label className="block text-sm font-bold text-slate-700 mb-2">รหัสวิชาเรียน</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น SP344"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 focus:border-[#2b4cdd] focus:ring-4 focus:ring-blue-500/10 rounded-xl transition-all font-bold text-slate-800 tracking-wider placeholder:font-medium placeholder:text-slate-400"
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowJoinModal(false)}
                    className="flex-1 px-4 py-3.5 text-slate-600 font-bold bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isJoining || !joinCode.trim()}
                    className="flex-1 px-4 py-3.5 text-white font-bold bg-[#2b4cdd] hover:bg-blue-700 disabled:bg-blue-300 rounded-xl transition-colors flex justify-center items-center"
                  >
                    {isJoining ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/20 border-t-white"></div>
                    ) : (
                      'ยืนยันเข้าร่วม'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal ยืนยันออกจากคลาส */}
      {showLeaveModal && courseToLeave && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200">
            
            <button 
              onClick={() => { setShowLeaveModal(false); setCourseToLeave(null); }}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-full transition-colors"
            >
              <X size={24} />
            </button>

            <div className="p-8">
              <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center mb-6 border border-rose-100">
                <LogOut size={28} className="text-rose-500" strokeWidth={2.5} />
              </div>
              
              <h3 className="text-2xl font-black text-slate-800 mb-2">ยืนยันการออกจากคลาส</h3>
              <p className="text-slate-500 font-medium text-sm mb-6">
                คุณแน่ใจหรือไม่ที่จะออกจากวิชา <span className="font-bold text-slate-800">{courseToLeave.subjectName} ({courseToLeave.subjectCode})</span> ?
              </p>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => { setShowLeaveModal(false); setCourseToLeave(null); }}
                  className="flex-1 px-4 py-3.5 text-slate-600 font-bold bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleLeaveClass}
                  disabled={isLeaving}
                  className="flex-1 px-4 py-3.5 text-white font-bold bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 rounded-xl transition-colors flex justify-center items-center"
                >
                  {isLeaving ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/20 border-t-white"></div>
                  ) : (
                    'ยืนยันออกจากคลาส'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}