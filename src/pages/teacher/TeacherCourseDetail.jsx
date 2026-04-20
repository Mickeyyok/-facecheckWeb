import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  MapPin, Camera, ChevronRight, FileText, CheckCircle, Edit, Clock, 
  Target, AlertTriangle, Search, Plus, Trash2, Calendar, BarChart2, 
  Brain, Sparkles, Mail, XCircle, Users, Download, RefreshCw, Filter, ChevronLeft 
} from 'lucide-react';
import { classService } from '../../services/classService';
import { attendanceService } from '../../services/attendanceService';
import { useAuth } from '../../context/AuthContext';

// Component ป้ายสถานะ
const StatusBadge = ({ status }) => {
  if (status === 'present' || status === 'on_time') return <span className="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-700 border border-green-200">✅ ตรงเวลา</span>;
  if (status === 'late') return <span className="px-2 py-1 rounded text-xs font-semibold bg-yellow-100 text-yellow-700 border border-yellow-200">⚠️ สาย</span>;
  if (status === 'absent') return <span className="px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-700 border border-red-200">❌ ขาดเรียน</span>;
  return <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-500 border border-gray-200">- รอดำเนินการ</span>;
};

export default function TeacherCourseDetail() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // ==========================================
  // 1. ประกาศตัวแปร State ทั้งหมดไว้บนสุด (ป้องกันจอขาว)
  // ==========================================
  const [courseSubTab, setCourseSubTab] = useState('info');
  const [loadingCourse, setLoadingCourse] = useState(true);

  const [courseInfo, setCourseInfo] = useState({
    name: '', code: '', instructor: user?.fullName || user?.name || '', room: '', term: '2568 / 1'
  });
  const [isEditingCourseInfo, setIsEditingCourseInfo] = useState(false);
  const [editCourseForm, setEditCourseForm] = useState(courseInfo);

  const [courseTimeSettings, setCourseTimeSettings] = useState({ start: '09:00', late: '09:15', absent: '09:30' });
  const [editTimeForm, setEditTimeForm] = useState({ start: '09:00', late: '09:15', absent: '09:30' });
  
  const [locationSettings, setLocationSettings] = useState({ name: 'ห้องเรียน', lat: '13.777045', lng: '100.556021', radius: 50 });
  const [editLocationForm, setEditLocationForm] = useState(locationSettings);

  const [studentList, setStudentList] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [addStudentId, setAddStudentId] = useState('');
  const [addingStudent, setAddingStudent] = useState(false);

  const [scheduledDates, setScheduledDates] = useState([]);
  
  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const todayStr = getLocalDateString();
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [dailyAttendance, setDailyAttendance] = useState([]);
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [dailyFilter, setDailyFilter] = useState('all');

  // --- คำนวณสถานะสแกน real-time (เปิด/ปิดตามเวลาขาดเรียน) ---
  const [nowTime, setNowTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNowTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  const getScanStatus = () => {
    const { start, absent } = courseTimeSettings;
    if (!start || !absent) return { isOpen: false, label: '-' };
    const [sH, sM] = start.split(':').map(Number);
    const [aH, aM] = absent.split(':').map(Number);
    const nowMin = nowTime.getHours() * 60 + nowTime.getMinutes();
    const startMin = sH * 60 + sM;
    const absentMin = aH * 60 + aM;
    if (nowMin >= startMin && nowMin < absentMin) return { isOpen: true, label: `เปิดสแกน (ปิด ${absent} น.)` };
    if (nowMin >= absentMin) return { isOpen: false, label: `ปิดสแกนแล้ว (ตั้งแต่ ${absent} น.)` };
    return { isOpen: false, label: `ยังไม่ถึงเวลา (เปิด ${start} น.)` };
  };
  const scanStatus = getScanStatus();

  const [riskAlerts, setRiskAlerts] = useState([
    { id: 1, studentId: '640002', studentName: 'นายวนนนท์ แสงทอง', issue: 'ขาดเรียนสะสมเกิน 20%', status: 'pending' }
  ]);

  const [isClassCanceled, setIsClassCanceled] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showAddDateModal, setShowAddDateModal] = useState(false);
  const [newDateForm, setNewDateForm] = useState({ date: '', note: '' });
  const [dateToDelete, setDateToDelete] = useState(null);
  
  const WEEKDAYS = [
    { id: 0, label: 'อา', full: 'อาทิตย์' }, { id: 1, label: 'จ', full: 'จันทร์' },
    { id: 2, label: 'อ', full: 'อังคาร' }, { id: 3, label: 'พ', full: 'พุธ' },
    { id: 4, label: 'พฤ', full: 'พฤหัสบดี' }, { id: 5, label: 'ศ', full: 'ศุกร์' },
    { id: 6, label: 'ส', full: 'เสาร์' }
  ];
  const [generateForm, setGenerateForm] = useState({ selectedDays: [], startDate: '', endDate: '' });

  const [showSetTimeModal, setShowSetTimeModal] = useState(false);
  const [showSetLocationModal, setShowSetLocationModal] = useState(false);
  const [showCancelClassConfirm, setShowCancelClassConfirm] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [showSendAlertModal, setShowSendAlertModal] = useState(false);
  const [alertToSend, setAlertToSend] = useState(null);
  const [alertToDelete, setAlertToDelete] = useState(null);


  // ==========================================
  // 2. ดึงข้อมูล (useEffect)
  // ==========================================
  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setLoadingCourse(true);
        const data = await classService.getClassById(courseId);
        setCourseInfo(prev => ({
          ...prev,
          name: data.subjectName || '',
          code: data.subjectCode || '',
          room: data.room || '',
          term: data.term || '2568 / 1',
          instructor: data.instructorName || user?.fullName || user?.name || ''
        }));

        if (data.startTime) {
          const start = data.startTime.substring(0, 5);
          const lateMin = data.lateThresholdMinutes || 15;
          const absentMin = lateMin * 2;
          
          const [h, m] = start.split(':').map(Number);
          const lateTotal = h * 60 + m + lateMin;
          const absentTotal = h * 60 + m + absentMin;
          const lateFmt = `${String(Math.floor(lateTotal / 60)).padStart(2, '0')}:${String(lateTotal % 60).padStart(2, '0')}`;
          const absentFmt = `${String(Math.floor(absentTotal / 60)).padStart(2, '0')}:${String(absentTotal % 60).padStart(2, '0')}`;
          
          setCourseTimeSettings({ start, late: lateFmt, absent: absentFmt });
          setEditTimeForm({ start, late: lateFmt, absent: absentFmt });
        }

        if (data.latitude && data.longitude) {
          const newLoc = {
            name: `ห้อง ${data.room || 'ไม่ระบุ'}`,
            lat: data.latitude.toString(),
            lng: data.longitude.toString(),
            radius: data.radius || 50
          };
          setLocationSettings(newLoc);
          setEditLocationForm(newLoc);
        }

        if (data.scheduledDatesJson) {
          try {
            setScheduledDates(JSON.parse(data.scheduledDatesJson));
          } catch(e) {}
        }
      } catch (error) {
        console.error('ดึงข้อมูลคลาสไม่สำเร็จ:', error);
      } finally {
        setLoadingCourse(false);
      }
    };
    if (courseId) fetchCourse();
  }, [courseId, user]);

  useEffect(() => {
    if (courseId) fetchStudents();
  }, [courseId]);

  const fetchStudents = async () => {
    try {
      setLoadingStudents(true);
      const data = await classService.getStudentsByClass(courseId);
      setStudentList(data);
    } catch (error) {} finally { setLoadingStudents(false); }
  };

  const fetchDailyAttendance = async (date) => {
    if (!courseId) return;
    try {
      setLoadingDaily(true);
      const data = await attendanceService.getAttendanceByClass(courseId, date);
      setDailyAttendance(data);
    } catch (error) { setDailyAttendance([]); } finally { setLoadingDaily(false); }
  };

  useEffect(() => {
    if (courseSubTab === 'daily' && courseId && selectedDate) {
      fetchDailyAttendance(selectedDate);
    }
  }, [courseSubTab, selectedDate, courseId]);


  // ==========================================
  // 3. คำนวณสถิติและจัดกลุ่ม
  // ==========================================
  const scheduledDateList = scheduledDates.map(d => d.date).sort();
  const selectedDateIndex = scheduledDateList.indexOf(selectedDate);
  const hasPrevDate = selectedDateIndex > 0;
  const hasNextDate = selectedDateIndex >= 0 && selectedDateIndex < scheduledDateList.length - 1;
  const goPrevDate = () => { if (hasPrevDate) setSelectedDate(scheduledDateList[selectedDateIndex - 1]); };
  const goNextDate = () => { if (hasNextDate) setSelectedDate(scheduledDateList[selectedDateIndex + 1]); };

  // ✅ 1. แก้ไขให้ระบบจับคู่นักศึกษาได้ถูกต้อง 100%
  const dailyStudentRows = studentList.map(s => {
    // ค้นหาข้อมูลเช็คชื่อของนักศึกษาคนนี้แบบครอบคลุม
    const record = dailyAttendance.find(a => 
      a.userId === s.studentUserId ||        // กรณีเทียบ UUID
      a.studentId === s.studentId ||         // กรณีเทียบรหัส 13 หลัก
      a.studentCode === s.studentId ||       // กรณี Backend ส่งชื่อคีย์เป็น studentCode
      a.studentId === s.studentUserId        // กรณี Backend ส่ง UUID มาในช่อง studentId
    );

    let currentStatus = record?.status?.toLowerCase() || null;
    if (currentStatus === 'on_time') currentStatus = 'present'; // จัดการคำให้ตรงกัน

    // ถ้ายังไม่เช็คชื่อ ให้ตรวจสอบว่า "เลยเวลาขาดเรียนหรือยัง"
    if (!currentStatus && courseTimeSettings.absent) {
        const [absentH, absentM] = courseTimeSettings.absent.split(':').map(Number);
        const now = new Date();
        const targetDate = new Date(selectedDate);
        targetDate.setHours(absentH, absentM, 0, 0);

        if (now > targetDate) {
             currentStatus = 'absent'; 
        }
    }

    // จัดการการแสดงเวลาให้สวยงาม
    let displayTime = '-';
    if (record) {
      if (record.time) {
        displayTime = record.time + ' น.';
      } else if (record.checkedAt) {
        const d = new Date(record.checkedAt);
        displayTime = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
      }
    }

    return {
      ...s,
      attendanceStatus: currentStatus,
      checkedTime: displayTime,
    };
  });

  // ✅ 2. คำนวณสถิติ
  const dailyStats = {
    total: studentList.length,
    present: dailyStudentRows.filter(s => ['present', 'on_time'].includes(s.attendanceStatus)).length,
    late: dailyStudentRows.filter(s => s.attendanceStatus === 'late').length,
    absent: dailyStudentRows.filter(s => s.attendanceStatus === 'absent').length,
    pending: dailyStudentRows.filter(s => !s.attendanceStatus).length,
  };

  
  const checkedCount = dailyStats.present + dailyStats.late + dailyStats.absent;
  const checkedPercent = dailyStats.total > 0 ? Math.round((checkedCount / dailyStats.total) * 100) : 0;

  const filteredDailyRows = dailyFilter === 'all' ? dailyStudentRows : dailyStudentRows.filter(r => {
    if (dailyFilter === 'present') return ['present', 'on_time'].includes(r.attendanceStatus);
    if (dailyFilter === 'late') return r.attendanceStatus === 'late';
    if (dailyFilter === 'absent') return r.attendanceStatus === 'absent';
    if (dailyFilter === 'pending') return !r.attendanceStatus;
    return true;
  });


  // ==========================================
  // 4. ฟังก์ชันทำงานต่างๆ (Handlers)
  // ==========================================
  const handleAddStudent = async () => {
    if (!addStudentId.trim()) return alert('กรุณากรอกรหัสนักศึกษา');
    try {
      setAddingStudent(true);
      await classService.addStudentToClass(courseId, addStudentId.trim());
      setAddStudentId('');
      setShowAddStudentModal(false);
      await fetchStudents();
    } catch (error) {
      alert(error.response?.data?.message || 'เพิ่มนักศึกษาไม่สำเร็จ');
    } finally { setAddingStudent(false); }
  };

  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;
    try {
      await classService.removeStudentFromClass(courseId, studentToDelete.studentUserId || studentToDelete.id);
      setStudentToDelete(null);
      await fetchStudents();
    } catch (error) { alert('ลบนักศึกษาไม่สำเร็จ'); }
  };

  const exportDailyCSV = () => {
    const statusLabel = (s) => ['present', 'on_time'].includes(s) ? 'ตรงเวลา' : s === 'late' ? 'สาย' : s === 'absent' ? 'ขาดเรียน' : 'รอดำเนินการ';
    const header = 'ลำดับ,รหัสนักศึกษา,ชื่อ-สกุล,เวลาเช็คชื่อ,สถานะ';
    const rows = filteredDailyRows.map((r, i) => `${i + 1},${r.studentId || '-'},${r.name},${r.checkedTime},${statusLabel(r.attendanceStatus)}`);
    const csvContent = '\uFEFF' + [header, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${courseInfo.code}_${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveTimeSettings = async () => {
    try {
      const [startH, startM] = editTimeForm.start.split(':').map(Number);
      const [lateH, lateM] = editTimeForm.late.split(':').map(Number);
      const startTotalMinutes = (startH * 60) + startM;
      const lateTotalMinutes = (lateH * 60) + lateM;
      const lateThreshold = lateTotalMinutes - startTotalMinutes;

      if (lateThreshold <= 0) return alert("เวลา 'สาย' ต้องมากกว่าเวลา 'เริ่มคลาส' ครับ");

      const payload = {
        subjectName: courseInfo.name,
        subjectCode: courseInfo.code,
        instructorName: courseInfo.instructor,
        room: courseInfo.room,
        term: courseInfo.term,
        startTime: editTimeForm.start,
        lateThresholdMinutes: lateThreshold
      };

      await classService.updateClass(courseId, payload);
      setCourseTimeSettings(editTimeForm);
      setShowSetTimeModal(false);
      alert("บันทึกเวลาเรียบร้อยแล้ว!");
    } catch (error) {
      alert("บันทึกเวลาไม่สำเร็จ: " + (error.response?.data?.message || error.message));
    }
  };

  const handleSetLocation = () => {
    if (!navigator.geolocation) return alert("เบราว์เซอร์ของคุณไม่รองรับการดึงพิกัด GPS");
    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      const radius = parseFloat(editLocationForm.radius) || 50.0;
      
      try {
        const payload = {
          subjectName: courseInfo.name,
          subjectCode: courseInfo.code,
          instructorName: courseInfo.instructor,
          room: courseInfo.room,
          term: courseInfo.term,
          latitude: latitude,
          longitude: longitude,
          radius: radius
        };

        await classService.updateClass(courseId, payload);
        
        const newLoc = { 
          name: editLocationForm.name || locationSettings.name, 
          lat: latitude.toFixed(6), 
          lng: longitude.toFixed(6), 
          radius: radius 
        };
        setLocationSettings(newLoc);
        setEditLocationForm(newLoc);
        alert(`📍 ปักหมุดสำเร็จ!\nLat: ${latitude.toFixed(4)}\nLng: ${longitude.toFixed(4)}`);
        setShowSetLocationModal(false);
      } catch (error) {
        alert("ไม่สามารถบันทึกพิกัดลงฐานข้อมูลได้: " + (error.response?.data?.message || error.message));
      }
    }, (err) => { alert("กรุณาอนุญาตให้เข้าถึงตำแหน่งที่ตั้ง (Location Permission)"); }, { enableHighAccuracy: true });
  };

  const handleSaveManualLocation = async () => {
    try {
      const payload = {
        subjectName: courseInfo.name,
        subjectCode: courseInfo.code,
        instructorName: courseInfo.instructor,
        room: courseInfo.room,
        term: courseInfo.term,
        latitude: parseFloat(editLocationForm.lat),
        longitude: parseFloat(editLocationForm.lng),
        radius: parseFloat(editLocationForm.radius) || 50.0
      };

      await classService.updateClass(courseId, payload);
      setLocationSettings(editLocationForm);
      setShowSetLocationModal(false);
      alert("บันทึกข้อมูลพิกัดเรียบร้อย");
    } catch(error) { 
      alert("บันทึกไม่สำเร็จ: " + (error.response?.data?.message || error.message)); 
    }
  };

  const handleStartAttendance = async () => {
    try {
      await classService.notifyStartCheckIn(courseId); 
      alert("🚀 เปิดระบบเช็กชื่อแล้ว! ส่งแจ้งเตือนหานักศึกษาทุกคนเรียบร้อย");
    } catch (error) {
      alert("ไม่สามารถส่งแจ้งเตือนได้: " + (error.response?.data?.message || error.message));
    }
  };

  const handleCancelClass = async () => {
    try {
      await classService.notifyCancelClass(courseId);
      setIsClassCanceled(true);
      setShowCancelClassConfirm(false);
      alert('แจ้งยกคลาสและส่งแจ้งเตือนให้นักศึกษาแล้ว');
    } catch (error) {
      alert('ไม่สามารถส่งแจ้งเตือนยกคลาสได้');
    }
  };

  const handleSendAlertToStudent = () => {
    setRiskAlerts(riskAlerts.map(a => a.id === alertToSend.id ? { ...a, status: 'sent' } : a));
    setShowSendAlertModal(false);
    setAlertToSend(null);
    alert('ส่งอีเมลแจ้งเตือนเรียบร้อยแล้ว');
  };

  const formatThaiDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };
  const isDatePast = (dateStr) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return new Date(dateStr) < today;
  };
  const isDateToday = (dateStr) => dateStr === new Date().toISOString().split('T')[0];

  const saveDatesToDB = async (datesArray) => {
    try {
      await classService.updateClass(courseId, {
        ...courseInfo,
        scheduledDatesJson: JSON.stringify(datesArray)
      });
    } catch (err) {}
  };

  const handleGenerateDates = () => {
    const { selectedDays, startDate, endDate } = generateForm;
    if (selectedDays.length === 0) return alert('กรุณาเลือกวันในสัปดาห์อย่างน้อย 1 วัน');
    if (!startDate || !endDate) return alert('กรุณากำหนดวันเริ่มต้นและสิ้นสุดเทอม');
    if (new Date(startDate) >= new Date(endDate)) return alert('วันเริ่มต้นต้องมาก่อนวันสิ้นสุด');

    const generated = [];
    const current = new Date(startDate);
    const end = new Date(endDate);
    while (current <= end) {
      if (selectedDays.includes(current.getDay())) {
        generated.push({ id: Date.now() + generated.length, date: current.toISOString().split('T')[0], note: '', auto: true });
      }
      current.setDate(current.getDate() + 1);
    }
    if (generated.length === 0) return alert('ไม่พบวันที่ตรงกับเงื่อนไข');

    setScheduledDates(prev => {
      const existingDates = new Set(prev.map(d => d.date));
      const newDates = generated.filter(d => !existingDates.has(d.date));
      const finalDates = [...prev, ...newDates].sort((a, b) => new Date(a.date) - new Date(b.date));
      saveDatesToDB(finalDates);
      return finalDates;
    });
    setShowGenerateModal(false);
    alert(`เพิ่ม ${generated.length} วันเรียบร้อย ข้อมูลถูกบันทึกแล้ว!`);
  };

  const toggleWeekday = (dayId) => setGenerateForm(prev => ({ ...prev, selectedDays: prev.selectedDays.includes(dayId) ? prev.selectedDays.filter(d => d !== dayId) : [...prev.selectedDays, dayId] }));
  
  const handleAddScheduledDate = () => {
    if (!newDateForm.date) return alert('กรุณาเลือกวันที่');
    if (scheduledDates.some(d => d.date === newDateForm.date)) return alert('วันที่นี้ถูกกำหนดไว้แล้ว');
    
    setScheduledDates(prev => {
      const finalDates = [...prev, { id: Date.now(), date: newDateForm.date, note: newDateForm.note, auto: false }].sort((a, b) => new Date(a.date) - new Date(b.date));
      saveDatesToDB(finalDates);
      return finalDates;
    });
    setNewDateForm({ date: '', note: '' });
    setShowAddDateModal(false);
  };

  const handleRemoveScheduledDate = (dateId) => { 
    setScheduledDates(prev => {
      const finalDates = prev.filter(d => d.id !== dateId);
      saveDatesToDB(finalDates);
      return finalDates;
    });
    setDateToDelete(null); 
  };
  const handleClearAllDates = () => { 
    if (window.confirm(`ลบวันทั้งหมด ${scheduledDates.length} วัน?`)) {
      setScheduledDates([]);
      saveDatesToDB([]);
    } 
  };

  // ==========================================
  // 5. ส่วนแสดงผล (UI)
  // ==========================================
  return (
    <div className="p-8 lg:p-10 animate-in fade-in duration-300">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[70vh]">
        
        {/* Header ส่วนบนสีดำ */}
        <div className="bg-slate-900 text-white p-6 pb-0">
          <div className="flex items-center space-x-2 text-slate-400 mb-4 cursor-pointer hover:text-white transition w-max" onClick={() => navigate('/teacher/dashboard')}>
            <ChevronLeft size={18} /> <span className="text-sm font-medium">กลับไปหน้าคลาสของฉัน</span>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6">
            <div>
              <h3 className="text-2xl font-bold mb-1">{courseInfo.code} {courseInfo.name}</h3>
              <p className="text-slate-400 flex items-center text-sm"><MapPin size={16} className="mr-2"/> ห้อง {courseInfo.room} | {courseTimeSettings.start} - {courseTimeSettings.absent} น.</p>
            </div>
            <button onClick={handleStartAttendance} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center mt-4 md:mt-0 shadow-sm border border-purple-500">
              <Camera size={16} className="mr-2"/> เปิดระบบเช็คชื่อ (แจ้งเตือน นศ.)
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
                      <button onClick={async () => {
                        try {
                          const payload = {
                            subjectName: editCourseForm.name,
                            subjectCode: editCourseForm.code,
                            instructorName: editCourseForm.instructor,
                            room: editCourseForm.room,
                            term: editCourseForm.term
                          };
                          await classService.updateClass(courseId, payload);
                          setCourseInfo(editCourseForm);
                          setIsEditingCourseInfo(false);
                          alert("บันทึกข้อมูลสำเร็จ");
                        } catch(error) { 
                          alert("บันทึกข้อมูลไม่สำเร็จ: " + (error.response?.data?.message || error.message)); 
                        }
                      }} className="text-sm bg-purple-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-purple-700 transition shadow-sm flex items-center"><CheckCircle size={14} className="mr-1.5"/> บันทึก</button>
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

              {/* กำหนดเวลาและวันที่เช็คชื่อ */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-bold text-slate-800 flex items-center"><Clock className="mr-2 text-purple-600"/> กำหนดเวลาและวันที่เช็คชื่อ</h4>
                  <button onClick={() => { setEditTimeForm(courseTimeSettings); setShowSetTimeModal(true); }} className="text-sm bg-purple-50 text-purple-600 font-bold px-4 py-2 rounded-lg hover:bg-purple-100 transition shadow-sm">แก้ไขเวลา</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="border border-green-200 bg-green-50 p-5 rounded-xl shadow-sm"><span className="text-green-600 font-bold text-sm block mb-1">ตรงเวลา (เริ่มคลาส)</span><span className="text-2xl font-bold text-green-800">{courseTimeSettings.start} น.</span></div>
                  <div className="border border-yellow-200 bg-yellow-50 p-5 rounded-xl shadow-sm"><span className="text-yellow-600 font-bold text-sm block mb-1">สาย (หลังจากเวลา)</span><span className="text-2xl font-bold text-yellow-800">{courseTimeSettings.late} น.</span></div>
                  <div className="border border-red-200 bg-red-50 p-5 rounded-xl shadow-sm"><span className="text-red-600 font-bold text-sm block mb-1">ขาดเรียน / ปิดสแกน</span><span className="text-2xl font-bold text-red-800">{courseTimeSettings.absent} น.</span></div>
                </div>

                {/* สถานะสแกน real-time */}
                <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold mb-5 ${scanStatus.isOpen ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-slate-100 border border-slate-200 text-slate-500'}`}>
                  <div className={`w-2.5 h-2.5 rounded-full ${scanStatus.isOpen ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-slate-400'}`}></div>
                  <Clock size={14} />
                  <span>{scanStatus.label}</span>
                </div>

                {/* วันที่มีเช็คชื่อ */}
                <div className="border-t border-slate-100 pt-5">
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-5">
                      <div>
                        <p className="text-[15px] font-bold text-slate-700 flex items-center">
                          <Calendar size={18} className="mr-2 text-indigo-500"/> วันที่เปิดให้เช็คชื่อ
                          {scheduledDates.length > 0 && <span className="ml-2 bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-full">{scheduledDates.length} วัน</span>}
                        </p>
                        <p className="text-sm text-slate-500 mt-1">กำหนดตารางทั้งเทอม หรือเพิ่มวันพิเศษได้จากส่วนนี้</p>
                      </div>
                      <div className="flex flex-wrap gap-2.5 w-full lg:w-auto">
                        <button onClick={() => { setGenerateForm({ selectedDays: [], startDate: '', endDate: '' }); setShowGenerateModal(true); }} className="text-sm bg-indigo-600 text-white font-bold px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition shadow-sm flex items-center justify-center min-w-[170px]">
                          <Sparkles size={15} className="mr-2"/> สร้างตารางอัตโนมัติ
                        </button>
                        <button onClick={() => { setNewDateForm({ date: '', note: '' }); setShowAddDateModal(true); }} className="text-sm bg-white text-indigo-600 border border-indigo-200 font-bold px-4 py-2.5 rounded-xl hover:bg-indigo-50 transition shadow-sm flex items-center justify-center min-w-[140px]">
                          <Plus size={15} className="mr-1.5"/> เพิ่มวันเดี่ยว
                        </button>
                        {scheduledDates.length > 0 && (
                          <button onClick={handleClearAllDates} className="text-sm bg-white text-red-500 border border-red-200 font-bold px-4 py-2.5 rounded-xl hover:bg-red-50 transition shadow-sm flex items-center justify-center min-w-[130px]">
                            <Trash2 size={15} className="mr-1.5"/> ล้างทั้งหมด
                          </button>
                        )}
                      </div>
                    </div>

                    {scheduledDates.length === 0 ? (
                      <div className="bg-white border border-slate-200 border-dashed rounded-2xl p-10 text-center">
                        <Calendar size={36} className="mx-auto text-slate-300 mb-3" />
                        <p className="font-bold text-slate-500 text-base">ยังไม่มีวันที่กำหนดเช็คชื่อ</p>
                        <p className="text-slate-400 text-sm mt-2 leading-relaxed">กดปุ่ม <span className="font-bold text-indigo-600">"สร้างตารางอัตโนมัติ"</span> เพื่อเลือกวันในสัปดาห์ + ช่วงเทอม<br/>หรือกด "เพิ่มวันเดี่ยว" สำหรับวันพิเศษ เช่น สอนชดเชย</p>
                      </div>
                    ) : (
                      <div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                          <div className="bg-white border border-indigo-100 rounded-2xl px-5 py-4 text-center shadow-sm">
                            <p className="text-3xl font-extrabold text-indigo-700 leading-none">{scheduledDates.filter(d => !isDatePast(d.date)).length}</p>
                            <p className="text-xs font-bold text-indigo-500 mt-2 uppercase tracking-wide">วันที่เหลือ</p>
                          </div>
                          <div className="bg-white border border-emerald-100 rounded-2xl px-5 py-4 text-center shadow-sm">
                            <p className="text-3xl font-extrabold text-emerald-700 leading-none">{scheduledDates.filter(d => isDatePast(d.date)).length}</p>
                            <p className="text-xs font-bold text-emerald-500 mt-2 uppercase tracking-wide">ผ่านไปแล้ว</p>
                          </div>
                          <div className="bg-white border border-slate-200 rounded-2xl px-5 py-4 text-center shadow-sm">
                            <p className="text-3xl font-extrabold text-slate-700 leading-none">{scheduledDates.length}</p>
                            <p className="text-xs font-bold text-slate-500 mt-2 uppercase tracking-wide">ทั้งหมด</p>
                          </div>
                        </div>

                        <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                          {scheduledDates.map((item, idx) => {
                            const past = isDatePast(item.date);
                            const today = isDateToday(item.date);
                            return (
                              <div key={item.id} className={`flex items-center justify-between px-5 py-4 rounded-xl border shadow-sm transition-all ${today ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-200' : past ? 'bg-white border-slate-200 opacity-55' : 'bg-white border-slate-200 hover:border-indigo-200'}`}>
                                <div className="flex items-center gap-4">
                                  <span className={`text-xs font-bold w-7 text-center ${past ? 'text-slate-400' : 'text-slate-500'}`}>{idx + 1}</span>
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${today ? 'bg-indigo-600 text-white' : past ? 'bg-slate-200 text-slate-400' : 'bg-indigo-100 text-indigo-600'}`}>
                                    <Calendar size={16} />
                                  </div>
                                  <div>
                                    <p className={`font-bold text-[15px] ${today ? 'text-indigo-800' : past ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                                      {formatThaiDate(item.date)}
                                      {today && <span className="ml-2 text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">วันนี้</span>}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">{item.note || (item.auto ? 'สร้างอัตโนมัติจากตารางเรียน' : 'เพิ่มเองแบบกำหนดวันพิเศษ')}</p>
                                  </div>
                                </div>
                                <button onClick={() => setDateToDelete(item)} className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition" title="ลบวัน">
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
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
              {scheduledDates.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                  <Calendar size={40} className="mx-auto text-slate-300 mb-4" />
                  <p className="font-bold text-slate-600 text-lg">ยังไม่มีวันที่เปิดให้เช็คชื่อ</p>
                  <p className="text-slate-500 text-sm mt-2">ไปที่ Tab <span className="font-bold text-purple-600">"ข้อมูลวิชา"</span> แล้วกด "สร้างตารางอัตโนมัติ" เพื่อกำหนดวันเช็คชื่อก่อน</p>
                  <button onClick={() => setCourseSubTab('info')} className="mt-5 bg-purple-600 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-purple-700 transition shadow-sm text-sm">ไปกำหนดวันเช็คชื่อ</button>
                </div>
              ) : (<>
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
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
                      <button onClick={() => fetchDailyAttendance(selectedDate)} className="text-sm bg-white text-slate-600 border border-slate-300 font-bold px-3 py-2 rounded-lg hover:bg-slate-50 transition flex items-center"><RefreshCw size={14} className="mr-1.5"/> รีเฟรช</button>
                    )}
                    <button onClick={exportDailyCSV} className="text-sm bg-emerald-600 text-white font-bold px-3.5 py-2 rounded-lg hover:bg-emerald-700 transition shadow-sm flex items-center"><Download size={14} className="mr-1.5"/> ส่งออก CSV</button>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-200">
                  <button onClick={goPrevDate} disabled={!hasPrevDate} className={`p-2 rounded-lg border transition ${hasPrevDate ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 shadow-sm' : 'text-slate-300 border-slate-100 cursor-not-allowed'}`}><ChevronLeft size={18} /></button>
                  <div className="flex-1 flex items-center justify-center">
                    <div className="flex items-center gap-2 bg-white border border-indigo-200 rounded-xl px-5 py-2.5 shadow-sm">
                      <Calendar size={16} className="text-indigo-500" />
                      <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="text-sm font-bold text-slate-800 outline-none bg-transparent cursor-pointer pr-2">
                        {scheduledDateList.map((d, i) => <option key={d} value={d}>{formatThaiDate(d)}{d === todayStr ? ' (วันนี้)' : ''} — ครั้งที่ {i + 1}</option>)}
                      </select>
                    </div>
                  </div>
                  <button onClick={goNextDate} disabled={!hasNextDate} className={`p-2 rounded-lg border transition ${hasNextDate ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 shadow-sm' : 'text-slate-300 border-slate-100 cursor-not-allowed'}`}><ChevronRight size={18} /></button>
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
                  </div>
                  <div className="flex items-center gap-5 mt-2.5 text-xs font-medium text-slate-500">
                    <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-green-500 rounded"></div> ตรงเวลา ({dailyStats.present})</span>
                    <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-yellow-400 rounded"></div> สาย ({dailyStats.late})</span>
                    <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-red-400 rounded"></div> ขาดเรียน ({dailyStats.absent})</span>
                    <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-slate-200 rounded border border-slate-300"></div> รอดำเนินการ ({dailyStats.pending})</span>
                  </div>
                </div>
              )}

              {loadingDaily ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1,2,3,4].map(i => <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 text-center animate-pulse"><div className="h-3 w-20 bg-slate-100 rounded mx-auto mb-3"></div><div className="h-8 w-12 bg-slate-100 rounded mx-auto"></div></div>)}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-xl border border-slate-200 text-center"><p className="text-slate-500 text-xs font-bold uppercase mb-1">นักศึกษาทั้งหมด</p><p className="text-3xl font-bold text-slate-800">{dailyStats.total}</p></div>
                  <div className="bg-white p-5 rounded-xl border border-slate-200 border-b-4 border-b-green-500 text-center"><p className="text-green-600 text-xs font-bold uppercase mb-1">ตรงเวลา</p><p className="text-3xl font-bold text-green-600">{dailyStats.present}</p></div>
                  <div className="bg-white p-5 rounded-xl border border-slate-200 border-b-4 border-b-yellow-500 text-center"><p className="text-yellow-600 text-xs font-bold uppercase mb-1">มาสาย</p><p className="text-3xl font-bold text-yellow-600">{dailyStats.late}</p></div>
                  <div className="bg-white p-5 rounded-xl border border-slate-200 border-b-4 border-b-red-500 text-center"><p className="text-red-500 text-xs font-bold uppercase mb-1">ขาดเรียน</p><p className="text-3xl font-bold text-red-500">{dailyStats.absent}</p></div>
                </div>
              )}

              {loadingDaily ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center"><div className="animate-spin w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full mx-auto"></div><p className="text-slate-500 text-sm mt-3 font-medium">กำลังโหลดข้อมูล...</p></div>
              ) : dailyStudentRows.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center"><Users size={32} className="mx-auto text-slate-300 mb-3" /><p className="font-bold text-slate-500">ยังไม่มีนักศึกษาในคลาสนี้</p></div>
              ) : (
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <Filter size={14} className="text-slate-400"/>
                    {[
                      { key: 'all', label: 'ทั้งหมด', count: dailyStudentRows.length },
                      { key: 'present', label: 'ตรงเวลา', count: dailyStats.present, color: 'green' },
                      { key: 'late', label: 'สาย', count: dailyStats.late, color: 'yellow' },
                      { key: 'absent', label: 'ขาดเรียน', count: dailyStats.absent, color: 'red' },
                      { key: 'pending', label: 'รอดำเนินการ', count: dailyStats.pending, color: 'gray' },
                    ].map(f => (
                      <button key={f.key} onClick={() => setDailyFilter(f.key)} className={`text-xs font-bold px-3.5 py-2 rounded-lg transition border ${dailyFilter === f.key ? f.color === 'green' ? 'bg-green-50 text-green-700 border-green-300' : f.color === 'yellow' ? 'bg-yellow-50 text-yellow-700 border-yellow-300' : f.color === 'red' ? 'bg-red-50 text-red-600 border-red-300' : f.color === 'gray' ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-purple-50 text-purple-700 border-purple-300' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                        {f.label} <span className="ml-1 opacity-70">({f.count})</span>
                      </button>
                    ))}
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-sm">
                      <thead className="text-slate-500 bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4 font-semibold w-16 text-center">#</th>
                          <th className="py-3 px-4 font-semibold w-40">รหัสนักศึกษา</th>
                          <th className="py-3 px-4 font-semibold">ชื่อ-สกุล</th>
                          <th className="py-3 px-4 font-semibold text-center">เวลาเช็คชื่อ</th>
                          <th className="py-3 px-4 font-semibold text-center">สถานะ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredDailyRows.map((row, idx) => (
                          <tr key={row.id || idx} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-4 text-center text-slate-400 text-xs font-bold">{idx + 1}</td>
                            <td className="py-3 px-4 text-slate-600 font-mono text-xs">{row.studentId || '-'}</td>
                            <td className="py-3 px-4 text-slate-800 font-medium">{row.name}</td>
                            <td className="py-3 px-4 text-center text-slate-600 text-sm font-medium">{row.checkedTime}</td>
                            <td className="py-3 px-4 text-center"><StatusBadge status={row.attendanceStatus} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {dailyFilter !== 'all' && <p className="text-xs text-slate-500 font-medium mt-2">แสดง {filteredDailyRows.length} จาก {dailyStudentRows.length} คน</p>}
                </div>
              )}
              </>)}
            </div>
          )}

          {/* TAB 4: สถิติรายเทอม */}
          {courseSubTab === 'term' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-6 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500 opacity-5 rounded-full blur-3xl pointer-events-none group-hover:opacity-10 transition-opacity"></div>
                <div className="flex items-center justify-between mb-4 border-b border-indigo-200/50 pb-4 relative z-10">
                  <div className="flex items-center space-x-3"><div className="bg-white p-2.5 rounded-xl text-indigo-600 shadow-sm border border-indigo-100"><Sparkles size={22} className="fill-indigo-50" /></div><h4 className="text-xl font-extrabold text-indigo-950">สรุปภาพรวมทั้งเทอม</h4></div>
                  <span className="flex items-center bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold px-3.5 py-1.5 rounded-full shadow-md"><Brain size={14} className="mr-1.5"/> วิเคราะห์โดย AI</span>
                </div>
                <p className="text-indigo-900/80 text-[15px] relative z-10 leading-relaxed font-medium">นักศึกษามีความรับผิดชอบในเกณฑ์ <span className="font-extrabold text-emerald-600 bg-white px-3 py-1 rounded-lg shadow-sm border border-emerald-100 mx-1">ดีเยี่ยม</span> ค่าเฉลี่ยการเข้าเรียนตรงเวลาตลอดเทอมอยู่ที่ 88%</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <h4 className="font-bold text-slate-800 flex items-center mb-4"><BarChart2 size={18} className="mr-2 text-purple-600"/> แนวโน้มการเข้าเรียน</h4>
                  <div className="flex items-end justify-between h-40 px-2 border-b border-slate-100 pb-2">
                    {[85, 88, 92, 70, 89, 95].map((val, idx) => (
                      <div key={idx} className="flex flex-col items-center w-1/6">
                        <div className="w-full flex justify-center items-end h-32 relative"><div className="w-8 bg-slate-100 rounded-t-md absolute bottom-0 h-full"></div><div className={`w-8 rounded-t-md absolute bottom-0 transition-all ${idx === 3 ? 'bg-red-400' : 'bg-purple-500'}`} style={{height: `${val}%`}}></div></div>
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
                <div className="bg-white p-8 rounded-xl border border-slate-200 text-center shadow-sm"><CheckCircle size={32} className="mx-auto text-green-400 mb-3" /><p className="font-bold text-slate-800">ไม่มีการแจ้งเตือนความเสี่ยง</p></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {riskAlerts.map(alert => (
                    <div key={alert.id} className="bg-red-50 p-5 rounded-xl border border-red-100 shadow-sm relative group transition-all hover:shadow-md">
                      <div className="flex items-start mb-4"><div className="bg-red-100 p-2 rounded-lg text-red-600 mr-3 shrink-0"><AlertTriangle size={20} /></div><div><h5 className="font-bold text-red-800 mb-1">แจ้งเตือนความเสี่ยงสูง</h5><p className="text-sm text-red-700">พบนักศึกษาเสี่ยงหมดสิทธิ์สอบ 1 ราย <span className="font-bold">{alert.studentName}</span> {alert.issue}</p></div></div>
                      <div className="flex items-center">
                        {alert.status === 'pending' ? (
                          <button onClick={() => { setAlertToSend(alert); setShowSendAlertModal(true); }} className="text-sm bg-white border border-red-200 text-red-600 px-4 py-2 rounded-lg font-bold hover:bg-red-50 transition shadow-sm flex items-center"><Sparkles size={14} className="mr-1.5 text-amber-500" /> ร่างอีเมลแจ้งเตือน</button>
                        ) : (
                          <span className="text-sm bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg font-bold flex items-center"><CheckCircle size={16} className="mr-1.5"/> ส่งสำเร็จ</span>
                        )}
                      </div>
                      <div className="absolute top-4 right-4"><button onClick={() => setAlertToDelete(alert)} className="text-red-300 hover:text-red-600 transition-colors p-1.5 hover:bg-red-100 rounded-lg"><Trash2 size={18} /></button></div>
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
            <button onClick={handleSaveTimeSettings} className="w-full bg-purple-600 text-white py-2.5 rounded-lg font-bold hover:bg-purple-700 shadow-md">บันทึกเวลาเช็คชื่อ</button>
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
            <div className="flex flex-col gap-3">
              <button onClick={handleSetLocation} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition flex items-center justify-center gap-2 shadow-sm"><Target size={18}/> ดึงพิกัดจากตำแหน่งปัจจุบัน (GPS)</button>
              <div className="flex space-x-3">
                <button onClick={() => setShowSetLocationModal(false)} className="flex-1 bg-white border border-slate-200 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-50 transition">ยกเลิก</button>
                <button onClick={handleSaveManualLocation} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-md">บันทึกค่าที่แก้ไข</button>
              </div>
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
              <input type="text" inputMode="numeric" placeholder="เช่น 2310511010014" value={addStudentId} onChange={(e) => setAddStudentId(e.target.value.replace(/\D/g, '').slice(0, 13))} maxLength={13} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm font-mono tracking-wider" />
            </div>
            <button onClick={handleAddStudent} disabled={addingStudent || !addStudentId.trim()} className="w-full bg-purple-600 text-white py-2.5 rounded-lg font-bold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed">
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

      {/* Modal สร้างตารางอัตโนมัติ */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl relative p-6 md:p-8 animate-in zoom-in-95">
            <button onClick={() => setShowGenerateModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 z-10"><XCircle size={24} /></button>
            <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center"><Sparkles size={20} className="mr-2 text-indigo-600"/> สร้างตารางเช็คชื่ออัตโนมัติ</h3>
            <p className="text-sm text-slate-500 mb-6">เลือกวันในสัปดาห์ที่มีคลาส และกำหนดช่วงเทอม ระบบจะสร้างวันเช็คชื่อให้ทั้งหมด</p>
            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-700 mb-2.5 uppercase tracking-wide">เลือกวันในสัปดาห์ที่มีคลาสเรียน *</label>
              <div className="flex gap-2">
                {WEEKDAYS.map(day => (
                  <button key={day.id} onClick={() => toggleWeekday(day.id)} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border-2 ${generateForm.selectedDays.includes(day.id) ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-105' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'}`}>{day.label}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div><label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">วันเริ่มต้นเทอม *</label><input type="date" value={generateForm.startDate} onChange={(e) => setGenerateForm({ ...generateForm, startDate: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium" /></div>
              <div><label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">วันสิ้นสุดเทอม *</label><input type="date" value={generateForm.endDate} onChange={(e) => setGenerateForm({ ...generateForm, endDate: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium" /></div>
            </div>
            <div className="flex space-x-3">
              <button onClick={() => setShowGenerateModal(false)} className="flex-1 bg-white border border-slate-200 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-50 transition">ยกเลิก</button>
              <button onClick={handleGenerateDates} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition shadow-md flex items-center justify-center"><Sparkles size={16} className="mr-2"/> สร้างตาราง</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal เพิ่มวันเดี่ยว */}
      {showAddDateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl relative p-6 animate-in zoom-in-95">
            <button onClick={() => setShowAddDateModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 z-10"><XCircle size={24} /></button>
            <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center"><Plus size={20} className="mr-2 text-indigo-600"/> เพิ่มวันเดี่ยว</h3>
            <p className="text-sm text-slate-500 mb-5">สำหรับวันพิเศษ เช่น สอนชดเชย หรือสอบกลางภาค</p>
            <div className="space-y-4 mb-6">
              <div><label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">วันที่ *</label><input type="date" value={newDateForm.date} onChange={(e) => setNewDateForm({ ...newDateForm, date: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium" /></div>
              <div><label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">หมายเหตุ (ไม่บังคับ)</label><input type="text" placeholder="เช่น สอบกลางภาค, ชดเชยเรียน" value={newDateForm.note} onChange={(e) => setNewDateForm({ ...newDateForm, note: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium" /></div>
            </div>
            <div className="flex space-x-3">
              <button onClick={() => setShowAddDateModal(false)} className="flex-1 bg-white border border-slate-200 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-50 transition">ยกเลิก</button>
              <button onClick={handleAddScheduledDate} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition shadow-md">เพิ่มวันที่</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal ยืนยันลบวันที่เช็คชื่อ */}
      {dateToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-xs overflow-hidden shadow-xl relative p-6 text-center animate-in zoom-in-95">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 size={32} /></div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">ลบวันเช็คชื่อ?</h3>
            <p className="text-slate-500 text-sm mb-1 font-semibold">{formatThaiDate(dateToDelete.date)}</p>
            {dateToDelete.note && <p className="text-slate-400 text-xs mb-1">{dateToDelete.note}</p>}
            <p className="text-slate-400 text-xs mb-6">นักศึกษาจะไม่สามารถสแกนหน้าในวันนี้ได้อีก</p>
            <div className="flex space-x-3">
              <button onClick={() => setDateToDelete(null)} className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-lg font-bold hover:bg-slate-200">ยกเลิก</button>
              <button onClick={() => handleRemoveScheduledDate(dateToDelete.id)} className="flex-1 bg-red-500 text-white py-2.5 rounded-lg font-bold hover:bg-red-600">ยืนยันลบ</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}