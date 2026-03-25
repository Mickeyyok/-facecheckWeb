import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  MapPin, Camera, ChevronRight, FileText, CheckCircle, Edit, Clock, 
  Target, AlertTriangle, Search, Plus, Trash2, Calendar, BarChart2, 
  Brain, Sparkles, Mail, XCircle, Users 
} from 'lucide-react';
import { classService } from '../../services/classService';
import { useAuth } from '../../context/AuthContext';

// Component ป้ายสถานะ
const StatusBadge = ({ status }) => {
  if (status === 'present') return <span className="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-700 border border-green-200">✅ ตรงเวลา</span>;
  if (status === 'late') return <span className="px-2 py-1 rounded text-xs font-semibold bg-yellow-100 text-yellow-700 border border-yellow-200">⚠️ สาย</span>;
  if (status === 'absent') return <span className="px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-700 border border-red-200">❌ ขาดเรียน</span>;
  return <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-500 border border-gray-200">- รอดำเนินการ</span>;
};

export default function InstructorCourseDetail() {
  const { courseId } = useParams(); // ดึง UUID ของคลาสจาก URL
  const navigate = useNavigate();
  const { user } = useAuth();
  const [courseSubTab, setCourseSubTab] = useState('info');
  const [loadingCourse, setLoadingCourse] = useState(true);

  // --- ข้อมูลวิชา (ดึงจาก API) ---
  const [courseInfo, setCourseInfo] = useState({
    name: '',
    code: '',
    instructor: user?.name || '',
    room: '',
    term: '2568 / 1'
  });

  // ดึงข้อมูลคลาสจาก API ตอนเปิดหน้า
  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setLoadingCourse(true);
        const data = await classService.getClassById(courseId);
        setCourseInfo({
          name: data.subjectName || '',
          code: data.subjectCode || '',
          instructor: user?.name || '',
          room: data.room || '',
          term: '2568 / 1'
        });
        // อัพเดทเวลาถ้ามี
        if (data.startTime || data.endTime) {
          const start = data.startTime ? data.startTime.substring(0, 5) : '09:00';
          const lateMin = data.lateThresholdMinutes || 15;
          const absentMin = lateMin * 2;
          // คำนวณเวลาสาย/ขาด จาก startTime + threshold
          const [h, m] = start.split(':').map(Number);
          const lateTotal = h * 60 + m + lateMin;
          const absentTotal = h * 60 + m + absentMin;
          const lateFmt = `${String(Math.floor(lateTotal / 60)).padStart(2, '0')}:${String(lateTotal % 60).padStart(2, '0')}`;
          const absentFmt = `${String(Math.floor(absentTotal / 60)).padStart(2, '0')}:${String(absentTotal % 60).padStart(2, '0')}`;
          setCourseTimeSettings({ start, late: lateFmt, absent: absentFmt });
        }
      } catch (error) {
        console.error('ดึงข้อมูลคลาสไม่สำเร็จ:', error);
      } finally {
        setLoadingCourse(false);
      }
    };
    if (courseId) fetchCourse();
  }, [courseId]);

  const [studentList, setStudentList] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [addStudentId, setAddStudentId] = useState(''); // รหัสนักศึกษาที่จะเพิ่ม
  const [addingStudent, setAddingStudent] = useState(false);

  // ดึงรายชื่อนักศึกษาจาก API
  useEffect(() => {
    if (courseId) fetchStudents();
  }, [courseId]);

  const fetchStudents = async () => {
    try {
      setLoadingStudents(true);
      const data = await classService.getStudentsByClass(courseId);
      setStudentList(data);
    } catch (error) {
      console.error('ดึงรายชื่อนักศึกษาไม่สำเร็จ:', error);
    } finally {
      setLoadingStudents(false);
    }
  };

  // เพิ่มนักศึกษาเข้าคลาส
  const handleAddStudent = async () => {
    if (!addStudentId.trim()) {
      alert('กรุณากรอกรหัสนักศึกษา');
      return;
    }
    try {
      setAddingStudent(true);
      await classService.addStudentToClass(courseId, addStudentId.trim());
      setAddStudentId('');
      setShowAddStudentModal(false);
      await fetchStudents(); // โหลดใหม่
    } catch (error) {
      alert(error.response?.data?.message || 'เพิ่มนักศึกษาไม่สำเร็จ');
    } finally {
      setAddingStudent(false);
    }
  };

  // ลบนักศึกษาออกจากคลาส
  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;
    try {
      await classService.removeStudentFromClass(courseId, studentToDelete.studentUserId);
      setStudentToDelete(null);
      await fetchStudents();
    } catch (error) {
      alert(error.response?.data?.message || 'ลบนักศึกษาไม่สำเร็จ');
    }
  };

  const [riskAlerts, setRiskAlerts] = useState([
    { id: 1, studentId: '640002', studentName: 'นายวนนนท์ แสงทอง', issue: 'ขาดเรียนสะสมเกิน 20%', status: 'pending' },
    { id: 2, studentId: '640005', studentName: 'นายสมชาย มุ่งมั่น', issue: 'มาสายติดต่อกัน 3 คาบ', status: 'pending' }
  ]);

  // --- States สำหรับการตั้งค่า ---
  const [isEditingCourseInfo, setIsEditingCourseInfo] = useState(false);
  const [editCourseForm, setEditCourseForm] = useState(courseInfo);

  const [courseTimeSettings, setCourseTimeSettings] = useState({ start: '09:00', late: '09:15', absent: '09:30' });
  const [editTimeForm, setEditTimeForm] = useState({ start: '09:00', late: '09:15', absent: '09:30' });
  const [locationSettings, setLocationSettings] = useState({ name: 'อาคาร 21 ชั้น 5 ห้อง 21509', lat: '13.777045', lng: '100.556021', radius: 50 });
  const [editLocationForm, setEditLocationForm] = useState(locationSettings);

  const [isClassCanceled, setIsClassCanceled] = useState(false);

  // --- Modal States ---
  const [showSetTimeModal, setShowSetTimeModal] = useState(false);
  const [showSetLocationModal, setShowSetLocationModal] = useState(false);
  const [showCancelClassConfirm, setShowCancelClassConfirm] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [showSendAlertModal, setShowSendAlertModal] = useState(false);
  const [alertToSend, setAlertToSend] = useState(null);
  const [alertToDelete, setAlertToDelete] = useState(null);

  // --- ฟังก์ชัน ---
  const handleCancelClass = async () => {
    try {
      await classService.notifyCancelClass(courseId);
      setIsClassCanceled(true);
      setShowCancelClassConfirm(false);
      alert('ระบบปิดการสแกนหน้าและส่งแจ้งเตือนให้นักศึกษาในคลาสนี้แล้ว');
    } catch (error) {
      alert(error.response?.data?.message || 'ไม่สามารถส่งแจ้งเตือนรับยกคลาสได้');
    }
  };

  const handleSendAlertToStudent = () => {
    setRiskAlerts(riskAlerts.map(a => a.id === alertToSend.id ? { ...a, status: 'sent' } : a));
    setShowSendAlertModal(false);
    setAlertToSend(null);
    alert('ส่งอีเมลแจ้งเตือนเรียบร้อยแล้ว');
  };

  return (
    <div className="p-8 lg:p-10 animate-in fade-in duration-300">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[70vh]">
        
        {/* Header ส่วนบนสีดำ */}
        <div className="bg-slate-900 text-white p-6 pb-0">
          <div className="flex items-center space-x-2 text-slate-400 mb-4 cursor-pointer hover:text-white transition w-max" onClick={() => navigate('/instructor/dashboard')}>
            <ChevronRight size={18} className="rotate-180" /> <span className="text-sm font-medium">กลับไปหน้าคลาสของฉัน</span>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6">
            <div>
              <h3 className="text-2xl font-bold mb-1">{courseInfo.code} {courseInfo.name}</h3>
              <p className="text-slate-400 flex items-center text-sm"><MapPin size={16} className="mr-2"/> ห้อง {courseInfo.room} | {courseTimeSettings.start} - {courseTimeSettings.absent} น.</p>
            </div>
            <button className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center mt-4 md:mt-0 shadow-sm border border-purple-500">
              <Camera size={16} className="mr-2"/> เปิดระบบเช็คชื่อ (Manual)
            </button>
          </div>
          
          {/* Tabs Menu */}
          <div className="flex space-x-1 overflow-x-auto pb-0">
            {[
              { id: 'info', label: 'ข้อมูลวิชา' },
              { id: 'students', label: 'รายชื่อนักศึกษา' },
              { id: 'daily', label: 'สถิติรายวัน' },
              { id: 'term', label: 'สถิติรายเทอม' },
              { id: 'alerts', label: 'AI แจ้งเตือนความเสี่ยง', badge: riskAlerts.filter(a => a.status === 'pending').length }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setCourseSubTab(tab.id)} 
                className={`px-4 py-2.5 font-medium text-sm rounded-t-lg transition flex items-center ${courseSubTab === tab.id ? 'bg-white text-purple-700' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
              >
                {tab.label}
                {tab.badge > 0 && <span className="ml-2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{tab.badge}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 md:p-8">
          
          {/* TAB 1: ข้อมูลวิชา */}
          {courseSubTab === 'info' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              
              {/* ข้อมูลเบื้องต้น */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-bold text-slate-800 flex items-center"><FileText className="mr-2 text-purple-600"/> ข้อมูลวิชาเบื้องต้น</h4>
                  {!isEditingCourseInfo ? (
                    <button onClick={() => { setEditCourseForm(courseInfo); setIsEditingCourseInfo(true); }} className="text-sm bg-purple-50 text-purple-600 font-bold px-4 py-2 rounded-lg hover:bg-purple-100 transition shadow-sm flex items-center">
                      <Edit size={14} className="mr-1.5"/> แก้ไขข้อมูล
                    </button>
                  ) : (
                    <div className="flex space-x-2">
                      <button onClick={() => setIsEditingCourseInfo(false)} className="text-sm bg-slate-100 text-slate-600 font-bold px-4 py-2 rounded-lg hover:bg-slate-200 transition shadow-sm">ยกเลิก</button>
                      <button onClick={() => { setCourseInfo(editCourseForm); setIsEditingCourseInfo(false); }} className="text-sm bg-purple-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-purple-700 transition shadow-sm flex items-center"><CheckCircle size={14} className="mr-1.5"/> บันทึก</button>
                    </div>
                  )}
                </div>
                
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                  {!isEditingCourseInfo ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div><span className="text-slate-500 block mb-1 text-xs font-bold uppercase tracking-wide">ชื่อวิชา</span><span className="font-bold text-slate-800 block text-[15px]">{courseInfo.name}</span></div>
                      <div><span className="text-slate-500 block mb-1 text-xs font-bold uppercase tracking-wide">รหัสวิชา</span><span className="font-bold text-slate-800 block text-[15px]">{courseInfo.code}</span></div>
                      <div><span className="text-slate-500 block mb-1 text-xs font-bold uppercase tracking-wide">ชื่ออาจารย์</span><span className="font-bold text-slate-800 block text-[15px]">{courseInfo.instructor}</span></div>
                      <div><span className="text-slate-500 block mb-1 text-xs font-bold uppercase tracking-wide">ห้องเรียน</span><span className="font-bold text-slate-800 block text-[15px]">{courseInfo.room}</span></div>
                      <div><span className="text-slate-500 block mb-1 text-xs font-bold uppercase tracking-wide">ปีการศึกษา / เทอม</span><span className="font-bold text-slate-800 block text-[15px]">{courseInfo.term}</span></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {['name', 'code', 'instructor', 'room', 'term'].map(field => (
                        <div key={field}>
                          <label className="text-slate-500 block mb-1.5 text-xs font-bold uppercase tracking-wide">
                            {field === 'name' ? 'ชื่อวิชา' : field === 'code' ? 'รหัสวิชา' : field === 'instructor' ? 'ชื่ออาจารย์' : field === 'room' ? 'ห้องเรียน' : 'ปีการศึกษา / เทอม'}
                          </label>
                          <input type="text" value={editCourseForm[field]} onChange={(e) => setEditCourseForm({...editCourseForm, [field]: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm font-bold text-slate-800 shadow-sm" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ตั้งค่าเวลา */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-bold text-slate-800 flex items-center"><Clock className="mr-2 text-purple-600"/> กำหนดเวลาเช็คชื่อ</h4>
                  <button onClick={() => { setEditTimeForm(courseTimeSettings); setShowSetTimeModal(true); }} className="text-sm bg-purple-50 text-purple-600 font-bold px-4 py-2 rounded-lg hover:bg-purple-100 transition shadow-sm">แก้ไขเวลา</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="border border-green-200 bg-green-50 p-5 rounded-xl shadow-sm"><span className="text-green-600 font-bold text-sm block mb-1">ตรงเวลา (เริ่มคลาส)</span><span className="text-2xl font-bold text-green-800">{courseTimeSettings.start} น.</span></div>
                  <div className="border border-yellow-200 bg-yellow-50 p-5 rounded-xl shadow-sm"><span className="text-yellow-600 font-bold text-sm block mb-1">สาย (หลังจากเวลา)</span><span className="text-2xl font-bold text-yellow-800">{courseTimeSettings.late} น.</span></div>
                  <div className="border border-red-200 bg-red-50 p-5 rounded-xl shadow-sm"><span className="text-red-600 font-bold text-sm block mb-1">ขาดเรียน (หลังจากเวลา)</span><span className="text-2xl font-bold text-red-800">{courseTimeSettings.absent} น.</span></div>
                </div>
              </div>

              {/* ตั้งค่าพิกัด */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-bold text-slate-800 flex items-center"><MapPin className="mr-2 text-blue-600"/> กำหนดพิกัดและพื้นที่เช็กชื่อ</h4>
                  <button onClick={() => { setEditLocationForm(locationSettings); setShowSetLocationModal(true); }} className="text-sm bg-blue-50 text-blue-600 font-bold px-4 py-2 rounded-lg hover:bg-blue-100 transition shadow-sm flex items-center"><Target size={14} className="mr-1.5"/> ตั้งค่าพิกัด</button>
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col md:flex-row gap-6 items-center shadow-sm">
                   <div className="w-full md:w-1/3 bg-slate-200 h-32 rounded-xl flex items-center justify-center relative overflow-hidden shadow-inner border border-slate-300">
                      <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-slate-300"></div>
                      <div className="relative flex items-center justify-center">
                        <div className="absolute w-16 h-16 bg-blue-500/20 rounded-full animate-ping"></div>
                        <div className="absolute w-8 h-8 bg-blue-500/40 rounded-full"></div>
                        <MapPin size={24} className="text-blue-600 relative z-10 fill-white" />
                      </div>
                   </div>
                   <div className="w-full md:w-2/3 space-y-4">
                      <div><span className="text-xs text-slate-500 font-bold uppercase tracking-wide">จุดอ้างอิงสถานที่</span><p className="font-bold text-slate-800 text-lg mt-0.5">{locationSettings.name}</p></div>
                      <div className="flex flex-wrap gap-x-8 gap-y-3">
                        <div><span className="text-xs text-slate-500 font-bold uppercase tracking-wide">พิกัด (Lat, Lng)</span><p className="font-medium text-slate-700 mt-0.5">{locationSettings.lat}, {locationSettings.lng}</p></div>
                        <div><span className="text-xs text-slate-500 font-bold uppercase tracking-wide">ระยะที่อนุญาต</span><p className="font-bold text-blue-600 bg-blue-100 px-2.5 py-0.5 rounded-md mt-0.5 inline-block">รัศมี {locationSettings.radius} เมตร</p></div>
                      </div>
                   </div>
                </div>
              </div>

              {/* ยกคลาสเรียน */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-bold text-slate-800 flex items-center"><AlertTriangle className="mr-2 text-rose-500"/> จัดการสถานะคลาสเรียน</h4>
                </div>
                <div className={`border rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all shadow-sm ${isClassCanceled ? 'bg-slate-50 border-slate-200' : 'bg-rose-50/50 border-rose-200'}`}>
                  <div>
                    <h5 className={`font-bold mb-1 ${isClassCanceled ? 'text-slate-700' : 'text-rose-800'}`}>{isClassCanceled ? 'คลาสเรียนวันนี้ถูกยกเลิกแล้ว' : 'ยกเลิกคลาสเรียน (Cancel Class)'}</h5>
                    <p className={`text-sm font-medium ${isClassCanceled ? 'text-slate-500' : 'text-rose-600/80'}`}>ปิดการสแกนใบหน้าสำหรับวันนี้ และส่งแจ้งเตือนไปยังนักศึกษาทั้งหมดทันที</p>
                  </div>
                  {isClassCanceled ? (
                    <button onClick={() => setIsClassCanceled(false)} className="bg-white text-slate-700 border border-slate-200 font-bold px-6 py-3 rounded-xl hover:bg-slate-100 transition shadow-sm shrink-0 w-full md:w-auto">ยกเลิกการยกคลาส (เปิดปกติ)</button>
                  ) : (
                    <button onClick={() => setShowCancelClassConfirm(true)} className="bg-rose-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-rose-600 transition shadow-md active:scale-95 shrink-0 w-full md:w-auto">แจ้งยกคลาสเรียนวันนี้</button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: รายชื่อนักศึกษา */}
          {courseSubTab === 'students' && (
            <div className="animate-in fade-in duration-300">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div><h4 className="font-bold text-slate-800 text-lg">รายชื่อนักศึกษาทั้งหมด</h4><p className="text-sm text-slate-500 mt-1">จำนวน {studentList.length} คน</p></div>
                <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3">
                  <button onClick={() => { setAddStudentId(''); setShowAddStudentModal(true); }} className="text-sm bg-purple-600 text-white font-medium px-4 py-2 rounded-lg hover:bg-purple-700 shrink-0">+ เพิ่มรายชื่อ</button>
                </div>
              </div>
              
              {studentList.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200">
                  <Users size={36} className="mx-auto text-slate-300 mb-3" />
                  <p className="font-bold text-slate-500">ยังไม่มีนักศึกษาในคลาสนี้</p>
                  <p className="text-slate-400 text-sm mt-1">กดปุ่ม "+ เพิ่มรายชื่อ" เพื่อเพิ่มนักศึกษา</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-sm">
                    <thead className="text-slate-500 bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4 font-semibold w-40">รหัสนักศึกษา</th>
                        <th className="py-3 px-4 font-semibold">ชื่อ-สกุล</th>
                        <th className="py-3 px-4 font-semibold text-center w-24">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {studentList.map(student => (
                        <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 text-slate-600 font-mono text-xs">{student.studentId || '-'}</td>
                          <td className="py-3 px-4 text-slate-800 font-medium">{student.name}</td>
                          <td className="py-3 px-4 text-center">
                            <button onClick={() => setStudentToDelete(student)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition" title="ลบรายชื่อนศ."><Trash2 size={16}/></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: สถิติรายวัน */}
          {courseSubTab === 'daily' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col md:flex-row justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="font-bold text-slate-800 mb-3 md:mb-0">รายงานสถิติประจำวัน</h4>
                <div className="flex items-center bg-white border border-slate-300 rounded-lg px-3 py-2 shadow-sm">
                  <Calendar size={16} className="text-slate-400 mr-2"/>
                  <input type="date" defaultValue="2026-03-19" className="text-sm text-slate-700 outline-none font-medium" />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 text-center"><p className="text-slate-500 text-xs font-bold uppercase mb-1">นักศึกษาทั้งหมด</p><p className="text-3xl font-bold text-slate-800">30</p></div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 border-b-4 border-b-green-500 text-center"><p className="text-green-600 text-xs font-bold uppercase mb-1">ตรงเวลา</p><p className="text-3xl font-bold text-green-600">25</p></div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 border-b-4 border-b-yellow-500 text-center"><p className="text-yellow-600 text-xs font-bold uppercase mb-1">มาสาย</p><p className="text-3xl font-bold text-yellow-600">3</p></div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 border-b-4 border-b-red-500 text-center"><p className="text-red-500 text-xs font-bold uppercase mb-1">ขาดเรียน</p><p className="text-3xl font-bold text-red-500">2</p></div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-sm">
                  <thead className="text-slate-500 bg-slate-50 border-b border-slate-200">
                    <tr><th className="py-3 px-4 font-semibold w-24">รหัส</th><th className="py-3 px-4 font-semibold">ชื่อ-สกุล</th><th className="py-3 px-4 font-semibold text-center">สถานะการเช็คชื่อวันนี้</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {studentList.map(student => (
                      <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 text-slate-600">{student.id}</td>
                        <td className="py-3 px-4 text-slate-800 font-medium">{student.name}</td>
                        <td className="py-3 px-4 text-center">
                          <StatusBadge status={student.status} />
                          {student.time !== '-' && <span className="text-xs text-slate-400 ml-2">({student.time} น.)</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: สถิติรายเทอม */}
          {courseSubTab === 'term' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* AI Summary Card */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-6 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500 opacity-5 rounded-full blur-3xl pointer-events-none group-hover:opacity-10 transition-opacity"></div>
                <div className="flex items-center justify-between mb-4 border-b border-indigo-200/50 pb-4 relative z-10">
                  <div className="flex items-center space-x-3">
                    <div className="bg-white p-2.5 rounded-xl text-indigo-600 shadow-sm border border-indigo-100"><Sparkles size={22} className="fill-indigo-50" /></div>
                    <h4 className="text-xl font-extrabold text-indigo-950">สรุปภาพรวมทั้งเทอม</h4>
                  </div>
                  <span className="flex items-center bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold px-3.5 py-1.5 rounded-full shadow-md"><Brain size={14} className="mr-1.5"/> วิเคราะห์โดย AI</span>
                </div>
                <p className="text-indigo-900/80 text-[15px] relative z-10 leading-relaxed font-medium">
                  นักศึกษามีความรับผิดชอบในเกณฑ์ <span className="font-extrabold text-emerald-600 bg-white px-3 py-1 rounded-lg shadow-sm border border-emerald-100 mx-1">ดีเยี่ยม</span> ค่าเฉลี่ยการเข้าเรียนตรงเวลาตลอดเทอมอยู่ที่ 88%
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <h4 className="font-bold text-slate-800 flex items-center mb-4"><BarChart2 size={18} className="mr-2 text-purple-600"/> แนวโน้มการเข้าเรียน</h4>
                  <div className="flex items-end justify-between h-40 px-2 border-b border-slate-100 pb-2">
                    {[85, 88, 92, 70, 89, 95].map((val, idx) => (
                      <div key={idx} className="flex flex-col items-center w-1/6">
                        <div className="w-full flex justify-center items-end h-32 relative">
                          <div className="w-8 bg-slate-100 rounded-t-md absolute bottom-0 h-full"></div>
                          <div className={`w-8 rounded-t-md absolute bottom-0 transition-all ${idx === 3 ? 'bg-red-400' : 'bg-purple-500'}`} style={{height: `${val}%`}}></div>
                        </div>
                        <span className={`text-xs mt-2 ${idx === 3 ? 'font-bold text-red-500' : 'text-slate-500'}`}>W{idx+1}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <h4 className="font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">เฝ้าระวังขาดเรียนสูงสุด</h4>
                  <div className="space-y-4">
                    {studentList.filter(s => s.absentCount > 0).sort((a,b)=>b.absentCount-a.absentCount).map(s => (
                      <div key={s.id} className="flex justify-between items-center border-b border-slate-50 pb-2">
                        <div><p className="text-sm font-bold text-slate-800">{s.name}</p><p className="text-xs text-slate-500">{s.id}</p></div>
                        <span className="text-red-600 font-bold text-xs bg-red-50 px-2 py-1 rounded">ขาด {s.absentCount} ครั้ง</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: AI แจ้งเตือนความเสี่ยง */}
          {courseSubTab === 'alerts' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
                <h4 className="text-xl font-bold text-slate-800 flex items-center"><Brain className="mr-2 text-purple-600" size={24} /> AI วิเคราะห์ความเสี่ยง</h4>
              </div>
              
              {riskAlerts.length === 0 ? (
                <div className="bg-white p-8 rounded-xl border border-slate-200 text-center shadow-sm">
                  <CheckCircle size={32} className="mx-auto text-green-400 mb-3" />
                  <p className="font-bold text-slate-800">ไม่มีการแจ้งเตือนความเสี่ยง</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {riskAlerts.map(alert => (
                    <div key={alert.id} className="bg-red-50 p-5 rounded-xl border border-red-100 shadow-sm relative group transition-all hover:shadow-md">
                      <div className="flex items-start mb-4">
                        <div className="bg-red-100 p-2 rounded-lg text-red-600 mr-3 shrink-0"><AlertTriangle size={20} /></div>
                        <div>
                          <h5 className="font-bold text-red-800 mb-1">แจ้งเตือนความเสี่ยงสูง</h5>
                          <p className="text-sm text-red-700">พบนักศึกษาเสี่ยงหมดสิทธิ์สอบ 1 ราย <span className="font-bold">{alert.studentName}</span> {alert.issue}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center">
                        {alert.status === 'pending' ? (
                          <button onClick={() => { setAlertToSend(alert); setShowSendAlertModal(true); }} className="text-sm bg-white border border-red-200 text-red-600 px-4 py-2 rounded-lg font-bold hover:bg-red-50 transition shadow-sm flex items-center"><Sparkles size={14} className="mr-1.5 text-amber-500" /> ร่างอีเมลแจ้งเตือน</button>
                        ) : (
                          <span className="text-sm bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg font-bold flex items-center"><CheckCircle size={16} className="mr-1.5"/> ส่งสำเร็จ</span>
                        )}
                      </div>
                      <div className="absolute top-4 right-4">
                        <button onClick={() => setAlertToDelete(alert)} className="text-red-300 hover:text-red-600 transition-colors p-1.5 hover:bg-red-100 rounded-lg"><Trash2 size={18} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* --- Modals ส่วนของอาจารย์ --- */}

      {/* Modal Set Time */}
      {showSetTimeModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl relative p-6 animate-in zoom-in-95">
            <button onClick={() => setShowSetTimeModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 z-10"><XCircle size={24} /></button>
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center"><Clock className="mr-2 text-purple-600" size={20}/> กำหนดเวลา</h3>
            <div className="space-y-3 mb-6">
              <div><label className="block text-xs font-bold text-green-600 mb-1">ตรงเวลา</label><input type="time" value={editTimeForm.start} onChange={(e) => setEditTimeForm({...editTimeForm, start: e.target.value})} className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" /></div>
              <div><label className="block text-xs font-bold text-yellow-600 mb-1">สาย</label><input type="time" value={editTimeForm.late} onChange={(e) => setEditTimeForm({...editTimeForm, late: e.target.value})} className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" /></div>
              <div><label className="block text-xs font-bold text-red-600 mb-1">ขาดเรียน</label><input type="time" value={editTimeForm.absent} onChange={(e) => setEditTimeForm({...editTimeForm, absent: e.target.value})} className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" /></div>
            </div>
            <button onClick={() => { setCourseTimeSettings(editTimeForm); setShowSetTimeModal(false); }} className="w-full bg-purple-600 text-white py-2.5 rounded-lg font-bold hover:bg-purple-700">บันทึก</button>
          </div>
        </div>
      )}

      {/* Modal Set Location */}
      {showSetLocationModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl relative p-6 md:p-8 animate-in zoom-in-95">
            <button onClick={() => setShowSetLocationModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 z-10"><XCircle size={24} /></button>
            <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center"><Target className="mr-2 text-blue-600" size={22}/> ตั้งค่าพิกัดเช็กชื่อ</h3>
            <p className="text-sm text-slate-500 mb-6">กำหนดพื้นที่ที่อนุญาตให้นักศึกษาสามารถสแกนใบหน้าได้</p>
            <div className="space-y-4 mb-6">
              <div><label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">ชื่อสถานที่ / อาคาร</label><input type="text" value={editLocationForm.name} onChange={(e) => setEditLocationForm({...editLocationForm, name: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Latitude</label><input type="text" value={editLocationForm.lat} onChange={(e) => setEditLocationForm({...editLocationForm, lat: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium font-mono" /></div>
                <div><label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Longitude</label><input type="text" value={editLocationForm.lng} onChange={(e) => setEditLocationForm({...editLocationForm, lng: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium font-mono" /></div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide flex justify-between"><span>ระยะรัศมีที่อนุญาต</span><span className="text-blue-600">{editLocationForm.radius} เมตร</span></label>
                <input type="range" min="10" max="500" step="10" value={editLocationForm.radius} onChange={(e) => setEditLocationForm({...editLocationForm, radius: e.target.value})} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
              </div>
            </div>
            <div className="flex space-x-3">
              <button onClick={() => setShowSetLocationModal(false)} className="flex-1 bg-white border border-slate-200 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-50 transition">ยกเลิก</button>
              <button onClick={() => { setLocationSettings(editLocationForm); setShowSetLocationModal(false); }} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-md">บันทึกพิกัด</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Send AI Alert */}
      {showSendAlertModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl relative p-6 animate-in zoom-in-95">
            <button onClick={() => setShowSendAlertModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 z-10"><XCircle size={24}/></button>
            <div className="flex items-center space-x-2 mb-4 text-purple-700"><Brain size={24} /><h3 className="text-xl font-bold">ร่างข้อความโดย AI</h3></div>
            <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-200">
              <div className="mb-2 text-sm"><span className="font-bold">ถึง:</span> {alertToSend?.studentName}</div>
              <textarea className="w-full h-32 bg-white border border-slate-200 p-2 rounded-lg text-sm outline-none resize-none focus:ring-2 focus:ring-purple-500" defaultValue={`เรียน ${alertToSend?.studentName},\n\nพบว่าคุณมีสถิติ${alertToSend?.issue} โปรดติดต่ออาจารย์ผู้สอนด่วน\n\nFaceCheck`}></textarea>
            </div>
            <div className="flex space-x-3">
              <button onClick={() => setShowSendAlertModal(false)} className="flex-1 bg-white border border-slate-300 text-slate-700 py-2.5 rounded-lg font-bold hover:bg-slate-50">ยกเลิก</button>
              <button onClick={handleSendAlertToStudent} className="flex-1 bg-purple-600 text-white py-2.5 rounded-lg font-bold hover:bg-purple-700"><Mail size={16} className="inline mr-2"/> ส่งการแจ้งเตือน</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirm ยกคลาสเรียน */}
      {showCancelClassConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl relative p-6 text-center animate-in zoom-in-95">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle size={32} /></div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">ยืนยันการยกคลาส?</h3>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">ระบบจะปิดการสแกนหน้าและส่งแจ้งเตือนทันที</p>
            <div className="flex space-x-3">
              <button onClick={() => setShowCancelClassConfirm(false)} className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-lg font-bold">ยกเลิก</button>
              <button onClick={handleCancelClass} className="flex-1 bg-rose-500 text-white py-2.5 rounded-lg font-bold">ยืนยันแจ้งยกคลาส</button>
            </div>
          </div>
        </div>
      )}
      {/* Modal เพิ่มนักศึกษา */}
      {showAddStudentModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl relative p-6 animate-in zoom-in-95">
            <button onClick={() => setShowAddStudentModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 z-10"><XCircle size={24} /></button>
            <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center"><Plus size={20} className="mr-2 text-purple-600"/> เพิ่มนักศึกษาเข้าคลาส</h3>
            <p className="text-sm text-slate-500 mb-4">กรอกรหัสนักศึกษาที่ลงทะเบียนไว้ในระบบแล้ว</p>
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">รหัสนักศึกษา (13 หลัก)</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="เช่น 2310511010014"
                value={addStudentId}
                onChange={(e) => setAddStudentId(e.target.value.replace(/\D/g, '').slice(0, 13))}
                maxLength={13}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm font-mono tracking-wider"
              />
            </div>
            <button
              onClick={handleAddStudent}
              disabled={addingStudent || !addStudentId.trim()}
              className="w-full bg-purple-600 text-white py-2.5 rounded-lg font-bold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addingStudent ? 'กำลังเพิ่ม...' : 'ยืนยันเพิ่มนักศึกษา'}
            </button>
          </div>
        </div>
      )}

      {/* Modal ยืนยันลบนักศึกษา */}
      {studentToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-xs overflow-hidden shadow-xl relative p-6 text-center animate-in zoom-in-95">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 size={32} /></div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">ลบนักศึกษา?</h3>
            <p className="text-slate-500 text-sm mb-1 font-semibold">{studentToDelete.name}</p>
            <p className="text-slate-400 text-xs mb-6">รหัส: {studentToDelete.studentId}</p>
            <div className="flex space-x-3">
              <button onClick={() => setStudentToDelete(null)} className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-lg font-bold hover:bg-slate-200">ยกเลิก</button>
              <button onClick={handleDeleteStudent} className="flex-1 bg-red-500 text-white py-2.5 rounded-lg font-bold hover:bg-red-600">ยืนยันลบ</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
