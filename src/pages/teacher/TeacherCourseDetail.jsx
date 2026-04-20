import React, { useState, useEffect } from 'react';
import { showSuccess, showError, showAlert } from '../../utils/alertPopup';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MapPin, Camera, ChevronRight, FileText, CheckCircle, Edit, Clock,
  Target, AlertTriangle, Search, Plus, Trash2, Calendar, BarChart2,
  Brain, Sparkles, Mail, XCircle, Users, Download, RefreshCw, Filter, ChevronLeft,
  Upload, FileUp, CheckCircle2, AlertCircle, Loader2, UserPlus
} from 'lucide-react';
import { classService } from '../../services/classService';
import { attendanceService } from '../../services/attendanceService';
import { notificationService } from '../../services/notificationService';
import { useAuth } from '../../context/AuthContext';
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function ChangeMapView({ center }) {
  const map = useMap();
  useEffect(() => { map.setView(center); }, [center, map]);
  return null;
}

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

  // ✅ ตัวแปรแจ้งเตือนใน Modal
  const [addStudentError, setAddStudentError] = useState('');
  const [addStudentSuccess, setAddStudentSuccess] = useState('');

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

  const [termStats, setTermStats] = useState([]);
  const [loadingTerm, setLoadingTerm] = useState(false);
  const [riskAlerts, setRiskAlerts] = useState([]);

  // --- คำนวณสถานะสแกน real-time (เปิด/ปิดตามเวลาขาดเรียน) ---
  const [nowTime, setNowTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNowTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  const getScanStatus = () => {
    // ✅ ถ้ายกเลิกคลาสแล้ว ปิดสแกนทันที
    if (isClassCanceled) return { isOpen: false, label: '❌ ยกเลิกคลาสวันนี้แล้ว' };

    // ✅ ถ้าวันนี้ไม่มีในตาราง scheduledDates ก็ปิดสแกน
    const todayCheck = getLocalDateString();
    const isTodayScheduled = scheduledDates.some(d => d.date === todayCheck);
    if (scheduledDates.length > 0 && !isTodayScheduled) return { isOpen: false, label: 'วันนี้ไม่มีคลาสเรียน' };

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
  const [aiMessage, setAiMessage] = useState("");

  // CSV Import states
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvPreview, setCsvPreview] = useState([]);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvImportProgress, setCsvImportProgress] = useState(0);
  const [csvImportResult, setCsvImportResult] = useState(null);

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
          const [h, m] = start.split(':').map(Number);

          const lateMin = data.lateThresholdMinutes || 15;
          const lateTotal = h * 60 + m + lateMin;
          const lateFmt = `${String(Math.floor(lateTotal / 60)).padStart(2, '0')}:${String(lateTotal % 60).padStart(2, '0')}`;

          let absentFmt = "00:00";
          if (data.endTime) {
            absentFmt = data.endTime.substring(0, 5);
          } else {
            const absentTotal = h * 60 + m + (lateMin * 2);
            absentFmt = `${String(Math.floor(absentTotal / 60)).padStart(2, '0')}:${String(absentTotal % 60).padStart(2, '0')}`;
          }

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

        if (data.scheduledDates) {
          try {
            setScheduledDates(JSON.parse(data.scheduledDates));
          } catch (e) { }
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
    } catch (error) { } finally { setLoadingStudents(false); }
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

  useEffect(() => {
    if ((courseSubTab === 'term' || courseSubTab === 'alerts') && courseId) {
      fetchTermStats();
    }
  }, [courseSubTab, courseId, scheduledDates.length, studentList.length]);

  const fetchTermStats = async () => {
    if (studentList.length === 0) return;
    try {
      setLoadingTerm(true);
      const data = await attendanceService.getAttendanceByClass(courseId);
      const pastDatesCount = scheduledDates.filter(d => isDatePast(d.date) || isDateToday(d.date)).length;

      const stats = studentList.map(student => {
        const studentRecords = data.filter(a =>
          a.studentId === student.studentId ||
          a.userId === student.studentUserId ||
          a.userId === student.id
        );

        const presentCount = studentRecords.filter(r => ['PRESENT', 'ON_TIME'].includes(r.status?.toUpperCase())).length;
        const lateCount = studentRecords.filter(r => r.status?.toUpperCase() === 'LATE').length;
        const recordedAbsent = studentRecords.filter(r => r.status?.toUpperCase() === 'ABSENT').length;

        const missingCount = Math.max(0, pastDatesCount - (presentCount + lateCount + recordedAbsent));
        const totalAbsent = recordedAbsent + missingCount;

        const attendancePercent = pastDatesCount > 0 ? Math.round(((presentCount + lateCount) / pastDatesCount) * 100) : 100;
        const absentPercent = pastDatesCount > 0 ? Math.round((totalAbsent / pastDatesCount) * 100) : 0;

        const isRisk = pastDatesCount > 0 && (absentPercent >= 20 || totalAbsent >= 3);

        return {
          ...student,
          presentCount,
          lateCount,
          absentCount: totalAbsent,
          attendancePercent,
          absentPercent,
          isRisk
        };
      });

      setTermStats(stats);

      const alerts = stats
        .filter(s => s.isRisk)
        .map((s, index) => ({
          id: index + 1,
          studentUserId: s.studentUserId || s.id,
          studentId: s.studentId,
          studentName: s.name,
          issue: s.absentPercent >= 20 ? `ขาดเรียนสะสมถึง ${s.absentPercent}%` : `ขาดเรียนสะสม ${s.absentCount} ครั้ง`,
          status: 'pending'
        }));

      setRiskAlerts(alerts);
    } catch (error) {
      console.error("Error fetching term stats", error);
    } finally {
      setLoadingTerm(false);
    }
  };

  const avgAttendance = termStats.length > 0
    ? Math.round(termStats.reduce((sum, s) => sum + s.attendancePercent, 0) / termStats.length)
    : 100;
  let termGrade = 'ดีเยี่ยม';
  let termColor = 'text-emerald-600 bg-emerald-50 border-emerald-200';
  if (avgAttendance < 80) { termGrade = 'ปานกลาง'; termColor = 'text-yellow-600 bg-yellow-50 border-yellow-200'; }
  if (avgAttendance < 60) { termGrade = 'วิกฤต (ต้องปรับปรุง)'; termColor = 'text-red-600 bg-red-50 border-red-200'; }

  const scheduledDateList = scheduledDates.map(d => d.date).sort();
  const selectedDateIndex = scheduledDateList.indexOf(selectedDate);
  const hasPrevDate = selectedDateIndex > 0;
  const hasNextDate = selectedDateIndex >= 0 && selectedDateIndex < scheduledDateList.length - 1;
  const goPrevDate = () => { if (hasPrevDate) setSelectedDate(scheduledDateList[selectedDateIndex - 1]); };
  const goNextDate = () => { if (hasNextDate) setSelectedDate(scheduledDateList[selectedDateIndex + 1]); };

  const dailyStudentRows = studentList.map(s => {
    const record = dailyAttendance.find(a =>
      a.userId === s.studentUserId ||
      a.studentId === s.studentId ||
      a.studentCode === s.studentId ||
      a.studentId === s.studentUserId
    );

    let currentStatus = record?.status?.toLowerCase() || null;
    if (currentStatus === 'on_time') currentStatus = 'present';

    if (!currentStatus && courseTimeSettings.absent) {
      const [absentH, absentM] = courseTimeSettings.absent.split(':').map(Number);
      const now = new Date();
      const targetDate = new Date(selectedDate);
      targetDate.setHours(absentH, absentM, 0, 0);

      if (now > targetDate) {
        currentStatus = 'absent';
      }
    }

    let displayTime = '-';
    if (record) {
      if (record.time) displayTime = record.time + ' น.';
      else if (record.checkedAt) displayTime = new Date(record.checkedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
    }

    return {
      ...s,
      attendanceStatus: currentStatus,
      checkedTime: displayTime,
    };
  });

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

  // ✅ ปรับแก้ฟังก์ชันเพิ่มนักศึกษา และใช้ state แจ้งเตือน
  const handleAddStudent = async () => {
    setAddStudentError('');
    setAddStudentSuccess('');

    if (!addStudentId.trim()) {
      return setAddStudentError('กรุณากรอกรหัสนักศึกษา');
    }

    try {
      setAddingStudent(true);
      await classService.addStudentToClass(courseId, addStudentId.trim());
      setAddStudentSuccess('เพิ่มนักศึกษาเข้าคลาสสำเร็จ!');
      await fetchStudents();

      // หน่วงเวลา 1.5 วินาทีให้เห็นข้อความสำเร็จ แล้วค่อยปิด Modal
      setTimeout(() => {
        setShowAddStudentModal(false);
        setAddStudentId('');
        setAddStudentSuccess('');
      }, 1500);

    } catch (error) {
      setAddStudentError(error.response?.data?.message || 'ไม่พบนักศึกษารหัสนี้ในระบบ (ยังไม่ลงทะเบียน)');
    } finally {
      setAddingStudent(false);
    }
  };

  // ==========================================
  // CSV Import handlers
  // ==========================================
  const parseCsvText = (rawText) => {
    const text = rawText
      .replace(/^\uFEFF/, '')
      .replace(/\u0000/g, '')
      .replace(/[^\x20-\x7E\r\n,]/g, '');

    const lines = text.split(/\r?\n/).filter(line => line.trim());
    const studentIds = [];
    for (const line of lines) {
      const matches = line.match(/\d{10,13}/g);
      if (matches) {
        studentIds.push(matches[0]);
      }
    }

    const unique = [...new Set(studentIds)];
    return unique;
  };

  const handleCsvFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCsvFile(file);
    setCsvImportResult(null);

    if (file.text) {
      file.text().then(rawText => {
        const ids = parseCsvText(rawText);
        setCsvPreview(ids);
      }).catch(err => {
        readWithFileReader(file);
      });
    } else {
      readWithFileReader(file);
    }
  };

  const readWithFileReader = (file) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const ids = parseCsvText(event.target.result);
      setCsvPreview(ids);
    };
    reader.readAsText(file);
  };

  const handleCsvImport = async () => {
    if (csvPreview.length === 0) return showAlert('ไม่พบรหัสนักศึกษาในไฟล์ CSV');

    setCsvImporting(true);
    setCsvImportProgress(0);
    const results = { success: 0, failed: 0, duplicates: 0, errors: [] };

    for (let i = 0; i < csvPreview.length; i++) {
      const studentId = csvPreview[i];
      try {
        await classService.addStudentToClass(courseId, studentId);
        results.success++;
      } catch (error) {
        const msg = error.response?.data?.message || 'ไม่สำเร็จ';
        if (error.response?.status === 409) {
          results.duplicates++;
        } else {
          results.failed++;
        }
        results.errors.push({ id: studentId, message: msg });
      }
      setCsvImportProgress(Math.round(((i + 1) / csvPreview.length) * 100));
    }

    setCsvImportResult(results);
    setCsvImporting(false);
    await fetchStudents();
  };

  const resetCsvModal = () => {
    setShowCsvModal(false);
    setCsvFile(null);
    setCsvPreview([]);
    setCsvImportResult(null);
    setCsvImportProgress(0);
  };

  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;
    try {
      await classService.removeStudentFromClass(courseId, studentToDelete.studentUserId || studentToDelete.id);
      setStudentToDelete(null);
      await fetchStudents();
    } catch (error) { showError('ลบนักศึกษาไม่สำเร็จ'); }
  };

  const handleSaveTimeSettings = async () => {
    try {
      const [startH, startM] = editTimeForm.start.split(':').map(Number);
      const [lateH, lateM] = editTimeForm.late.split(':').map(Number);
      const startTotalMinutes = (startH * 60) + startM;
      const lateTotalMinutes = (lateH * 60) + lateM;
      const lateThreshold = lateTotalMinutes - startTotalMinutes;

      if (lateThreshold <= 0) return showAlert("เวลา 'สาย' ต้องมากกว่าเวลา 'เริ่มคลาส' ครับ");

      const payload = {
        subjectName: courseInfo.name,
        subjectCode: courseInfo.code,
        instructorName: courseInfo.instructor,
        room: courseInfo.room,
        term: courseInfo.term,
        startTime: editTimeForm.start,
        endTime: editTimeForm.absent,
        lateThresholdMinutes: lateThreshold
      };

      await classService.updateClass(courseId, payload);
      setCourseTimeSettings(editTimeForm);
      setShowSetTimeModal(false);
      showSuccess("บันทึกเวลาเรียบร้อยแล้ว!");
    } catch (error) {
      showError("บันทึกเวลาไม่สำเร็จ", error.response?.data?.message || error.message);
    }
  };

  const handleSetLocation = () => {
    if (!navigator.geolocation) return showAlert("เบราว์เซอร์ของคุณไม่รองรับการดึงพิกัด GPS");
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
        showSuccess('📍 ปักหมุดสำเร็จ!', `Lat: ${latitude.toFixed(4)} / Lng: ${longitude.toFixed(4)}`);
        setShowSetLocationModal(false);
      } catch (error) {
        showError("ไม่สามารถบันทึกพิกัดได้", error.response?.data?.message || error.message);
      }
    }, (err) => { showAlert("กรุณาอนุญาตให้เข้าถึงตำแหน่งที่ตั้ง", "ต้องเปิด Location Permission ในเบราว์เซอร์"); }, { enableHighAccuracy: true });
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
      showSuccess("บันทึกข้อมูลพิกัดเรียบร้อย");
    } catch (error) {
      showError("บันทึกไม่สำเร็จ", error.response?.data?.message || error.message);
    }
  };

  const handleStartAttendance = async () => {
    try {
      await classService.notifyStartCheckIn(courseId);
      showSuccess("🚀 เปิดระบบเช็กชื่อแล้ว!", "ส่งแจ้งเตือนหานักศึกษาทุกคนเรียบร้อย");
    } catch (error) {
      showError("ไม่สามารถส่งแจ้งเตือนได้", error.response?.data?.message || error.message);
    }
  };

  const handleCancelClass = async () => {
    try {
      // ✅ Backend จะลบวันนี้ออกจาก scheduledDates + ส่ง notification ในครั้งเดียว
      await classService.notifyCancelClass(courseId);

      // ✅ Sync local state ให้ตรงกับ DB
      const todayCancelStr = getLocalDateString();
      setScheduledDates(prev => prev.filter(d => d.date !== todayCancelStr));

      setIsClassCanceled(true);
      setShowCancelClassConfirm(false);
      setIsClassCanceled(true);
      setShowCancelClassConfirm(false);
      showSuccess('ยกเลิกคลาสวันนี้เรียบร้อยแล้ว!', 'ลบออกจากตารางและส่งแจ้งเตือนนักศึกษาแล้ว');
    } catch (error) {
      showError('ไม่สามารถยกเลิกคลาสได้', error.response?.data?.message || error.message);
    }
  };

  const openAlertModal = (alert) => {
    setAlertToSend(alert);
    setAiMessage(`เรียน ${alert.studentName},\n\nระบบ FaceCheck ตรวจพบว่าคุณมีสถิติ${alert.issue} ซึ่งอาจส่งผลต่อการประเมินผลการเรียน\n\nโปรดติดต่ออาจารย์ผู้สอนด่วนเพื่อชี้แจงเหตุผล\n\nด้วยความเคารพ\nผู้สอนวิชา ${courseInfo.name}`);
    setShowSendAlertModal(true);
  };

  const handleSendAlertToStudent = async () => {
    if (!alertToSend || !aiMessage.trim()) return;

    try {
      await notificationService.sendAiAlert(alertToSend.studentUserId, aiMessage);

      setRiskAlerts(riskAlerts.map(a => a.id === alertToSend.id ? { ...a, status: 'sent' } : a));
      setShowSendAlertModal(false);
      setAlertToSend(null);
      showSuccess('ส่งการแจ้งเตือนเรียบร้อยแล้ว', 'แจ้งเตือนเข้าระบบของนักศึกษาแล้ว');
    } catch (error) {
      showError('ไม่สามารถส่งแจ้งเตือนได้', error.response?.data?.message || error.message);
    }
  };

  const saveDatesToDB = async (datesArray) => {
    try {
      // ✅ ใช้ชื่อ field ที่ตรงกับ Backend DTO (subjectName, subjectCode, instructorName)
      await classService.updateClass(courseId, {
        subjectName: courseInfo.name,
        subjectCode: courseInfo.code,
        instructorName: courseInfo.instructor,
        room: courseInfo.room,
        term: courseInfo.term,
        scheduledDates: JSON.stringify(datesArray)
      });
      console.log('✅ บันทึก scheduledDates สำเร็จ:', datesArray.length, 'วัน');
    } catch (err) {
      console.error('❌ บันทึก scheduledDates ไม่สำเร็จ:', err);
      showError('บันทึกตารางเรียนไม่สำเร็จ', err.response?.data?.message || err.message);
    }
  };

  const handleGenerateDates = () => {
    const { selectedDays, startDate, endDate } = generateForm;
    if (selectedDays.length === 0) return showAlert('กรุณาเลือกวันในสัปดาห์อย่างน้อย 1 วัน');
    if (!startDate || !endDate) return showAlert('กรุณากำหนดวันเริ่มต้นและสิ้นสุดเทอม');
    if (new Date(startDate) >= new Date(endDate)) return showAlert('วันเริ่มต้นต้องมาก่อนวันสิ้นสุด');

    const generated = [];
    const current = new Date(startDate);
    const end = new Date(endDate);
    while (current <= end) {
      if (selectedDays.includes(current.getDay())) {
        generated.push({ id: Date.now() + generated.length, date: current.toISOString().split('T')[0], note: '', auto: true });
      }
      current.setDate(current.getDate() + 1);
    }
    if (generated.length === 0) return showAlert('ไม่พบวันที่ตรงกับเงื่อนไข');

    setScheduledDates(prev => {
      const existingDates = new Set(prev.map(d => d.date));
      const newDates = generated.filter(d => !existingDates.has(d.date));
      const finalDates = [...prev, ...newDates].sort((a, b) => new Date(a.date) - new Date(b.date));
      saveDatesToDB(finalDates);
      return finalDates;
    });
    setShowGenerateModal(false);
    showSuccess(`เพิ่ม ${generated.length} วันเรียบร้อย`, 'ข้อมูลถูกบันทึกแล้ว!');
  };

  const toggleWeekday = (dayId) => setGenerateForm(prev => ({ ...prev, selectedDays: prev.selectedDays.includes(dayId) ? prev.selectedDays.filter(d => d !== dayId) : [...prev.selectedDays, dayId] }));

  const handleAddScheduledDate = () => {
    if (!newDateForm.date) return showAlert('กรุณาเลือกวันที่');
    if (scheduledDates.some(d => d.date === newDateForm.date)) return showAlert('วันที่นี้ถูกกำหนดไว้แล้ว');

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

  return (
    <div className="p-3 sm:p-5 md:p-8 lg:p-10 animate-in fade-in duration-300">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[70vh]">

        {/* Header ส่วนบนสีดำ */}
        <div className="bg-slate-900 text-white p-4 sm:p-6 pb-0">
          <div className="flex items-center space-x-2 text-slate-400 mb-3 sm:mb-4 cursor-pointer hover:text-white transition w-max" onClick={() => navigate('/teacher/dashboard')}>
            <ChevronLeft size={18} /> <span className="text-xs sm:text-sm font-medium">กลับไปหน้าคลาสของฉัน</span>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-4 sm:mb-6">
            <div className="min-w-0 w-full md:w-auto">
              <h3 className="text-lg sm:text-2xl font-bold mb-1 truncate">{courseInfo.code} {courseInfo.name}</h3>
              <p className="text-slate-400 flex items-center text-xs sm:text-sm"><MapPin size={14} className="mr-1.5 shrink-0" /> <span className="truncate">ห้อง {courseInfo.room} | {courseTimeSettings.start} - {courseTimeSettings.absent} น.</span></p>
            </div>

          </div>

          {/* Tabs Menu */}
          <div className="flex space-x-1 overflow-x-auto pb-0 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
            {[
              { id: 'info', label: 'ข้อมูลวิชา' },
              { id: 'students', label: 'รายชื่อนักศึกษา' },
              { id: 'daily', label: 'สถิติรายวัน' },
              { id: 'term', label: 'สถิติรายเทอม' },
              { id: 'alerts', label: 'AI แจ้งเตือน', badge: riskAlerts.filter(a => a.status === 'pending').length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setCourseSubTab(tab.id)}
                className={`px-3 sm:px-4 py-2 sm:py-2.5 font-medium text-xs sm:text-sm rounded-t-lg transition flex items-center whitespace-nowrap shrink-0 ${courseSubTab === tab.id ? 'bg-white text-blue-700' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
              >
                {tab.label}
                {tab.badge > 0 && <span className="ml-1.5 sm:ml-2 bg-red-500 text-white text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full">{tab.badge}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-6 md:p-8">

          {/* TAB 1: ข้อมูลวิชา */}
          {courseSubTab === 'info' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                  <h4 className="text-base sm:text-lg font-bold text-slate-800 flex items-center"><FileText className="mr-2 text-blue-600 shrink-0" size={18} /> ข้อมูลวิชาเบื้องต้น</h4>
                  {!isEditingCourseInfo ? (
                    <button onClick={() => { setEditCourseForm(courseInfo); setIsEditingCourseInfo(true); }} className="text-sm bg-blue-50 text-blue-600 font-bold px-4 py-2 rounded-lg hover:bg-blue-100 transition shadow-sm flex items-center w-full sm:w-auto justify-center">
                      <Edit size={14} className="mr-1.5" /> แก้ไขข้อมูล
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
                          showSuccess("บันทึกข้อมูลสำเร็จ");
                        } catch (error) {
                          showError("บันทึกข้อมูลไม่สำเร็จ", error.response?.data?.message || error.message);
                        }
                      }} className="text-sm bg-blue-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm flex items-center"><CheckCircle size={14} className="mr-1.5" /> บันทึก</button>
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
                          <input type="text" value={editCourseForm[field]} onChange={(e) => setEditCourseForm({ ...editCourseForm, [field]: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-slate-800 shadow-sm" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                  <h4 className="text-base sm:text-lg font-bold text-slate-800 flex items-center"><Clock className="mr-2 text-blue-600 shrink-0" size={18} /> กำหนดเวลาและวันที่เช็คชื่อ</h4>
                  <button onClick={() => { setEditTimeForm(courseTimeSettings); setShowSetTimeModal(true); }} className="text-sm bg-blue-50 text-blue-600 font-bold px-4 py-2 rounded-lg hover:bg-blue-100 transition shadow-sm w-full sm:w-auto text-center">แก้ไขเวลา</button>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-5">
                  <div className="border border-green-200 bg-green-50 p-3 sm:p-5 rounded-xl shadow-sm"><span className="text-green-600 font-bold text-[10px] sm:text-sm block mb-1">ตรงเวลา</span><span className="text-lg sm:text-2xl font-bold text-green-800">{courseTimeSettings.start} <span className="hidden sm:inline">น.</span></span></div>
                  <div className="border border-yellow-200 bg-yellow-50 p-3 sm:p-5 rounded-xl shadow-sm"><span className="text-yellow-600 font-bold text-[10px] sm:text-sm block mb-1">สาย</span><span className="text-lg sm:text-2xl font-bold text-yellow-800">{courseTimeSettings.late} <span className="hidden sm:inline">น.</span></span></div>
                  <div className="border border-red-200 bg-red-50 p-3 sm:p-5 rounded-xl shadow-sm"><span className="text-red-600 font-bold text-[10px] sm:text-sm block mb-1">ขาดเรียน</span><span className="text-lg sm:text-2xl font-bold text-red-800">{courseTimeSettings.absent} <span className="hidden sm:inline">น.</span></span></div>
                </div>

                {/* สถานะสแกน real-time */}
                <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold mb-5 ${scanStatus.isOpen ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-slate-100 border border-slate-200 text-slate-500'}`}>
                  <div className={`w-2.5 h-2.5 rounded-full ${scanStatus.isOpen ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-slate-400'}`}></div>
                  <Clock size={14} />
                  <span>{scanStatus.label}</span>
                </div>

                <div className="border-t border-slate-100 pt-5">
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 sm:p-5 md:p-6 shadow-sm">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-5">
                      <div>
                        <p className="text-[15px] font-bold text-slate-700 flex items-center">
                          <Calendar size={18} className="mr-2 text-indigo-500" /> วันที่เปิดให้เช็คชื่อ
                          {scheduledDates.length > 0 && <span className="ml-2 bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-full">{scheduledDates.length} วัน</span>}
                        </p>
                        <p className="text-sm text-slate-500 mt-1">กำหนดตารางทั้งเทอม หรือเพิ่มวันพิเศษได้จากส่วนนี้</p>
                      </div>
                      <div className="flex flex-wrap gap-2.5 w-full lg:w-auto">
                        <button onClick={() => { setGenerateForm({ selectedDays: [], startDate: '', endDate: '' }); setShowGenerateModal(true); }} className="text-sm bg-indigo-600 text-white font-bold px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition shadow-sm flex items-center justify-center min-w-[170px]">
                          <Sparkles size={15} className="mr-2" /> สร้างตารางอัตโนมัติ
                        </button>
                        <button onClick={() => { setNewDateForm({ date: '', note: '' }); setShowAddDateModal(true); }} className="text-sm bg-white text-indigo-600 border border-indigo-200 font-bold px-4 py-2.5 rounded-xl hover:bg-indigo-50 transition shadow-sm flex items-center justify-center min-w-[140px]">
                          <Plus size={15} className="mr-1.5" /> เพิ่มวันเดี่ยว
                        </button>
                        {scheduledDates.length > 0 && (
                          <button onClick={handleClearAllDates} className="text-sm bg-white text-red-500 border border-red-200 font-bold px-4 py-2.5 rounded-xl hover:bg-red-50 transition shadow-sm flex items-center justify-center min-w-[130px]">
                            <Trash2 size={15} className="mr-1.5" /> ล้างทั้งหมด
                          </button>
                        )}
                      </div>
                    </div>

                    {scheduledDates.length === 0 ? (
                      <div className="bg-white border border-slate-200 border-dashed rounded-2xl p-10 text-center">
                        <Calendar size={36} className="mx-auto text-slate-300 mb-3" />
                        <p className="font-bold text-slate-500 text-base">ยังไม่มีวันที่กำหนดเช็คชื่อ</p>
                        <p className="text-slate-400 text-sm mt-2 leading-relaxed">กดปุ่ม <span className="font-bold text-indigo-600">"สร้างตารางอัตโนมัติ"</span> เพื่อเลือกวันในสัปดาห์ + ช่วงเทอม<br />หรือกด "เพิ่มวันเดี่ยว" สำหรับวันพิเศษ เช่น สอนชดเชย</p>
                      </div>
                    ) : (
                      <div>
                        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-5">
                          <div className="bg-white border border-indigo-100 rounded-2xl px-3 sm:px-5 py-3 sm:py-4 text-center shadow-sm">
                            <p className="text-2xl sm:text-3xl font-extrabold text-indigo-700 leading-none">{scheduledDates.filter(d => !isDatePast(d.date)).length}</p>
                            <p className="text-[10px] sm:text-xs font-bold text-indigo-500 mt-1.5 sm:mt-2 uppercase tracking-wide">วันที่เหลือ</p>
                          </div>
                          <div className="bg-white border border-emerald-100 rounded-2xl px-3 sm:px-5 py-3 sm:py-4 text-center shadow-sm">
                            <p className="text-2xl sm:text-3xl font-extrabold text-emerald-700 leading-none">{scheduledDates.filter(d => isDatePast(d.date)).length}</p>
                            <p className="text-[10px] sm:text-xs font-bold text-emerald-500 mt-1.5 sm:mt-2 uppercase tracking-wide">ผ่านไปแล้ว</p>
                          </div>
                          <div className="bg-white border border-slate-200 rounded-2xl px-3 sm:px-5 py-3 sm:py-4 text-center shadow-sm">
                            <p className="text-2xl sm:text-3xl font-extrabold text-slate-700 leading-none">{scheduledDates.length}</p>
                            <p className="text-[10px] sm:text-xs font-bold text-slate-500 mt-1.5 sm:mt-2 uppercase tracking-wide">ทั้งหมด</p>
                          </div>
                        </div>

                        <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                          {scheduledDates.map((item, idx) => {
                            const past = isDatePast(item.date);
                            const today = isDateToday(item.date);
                            return (
                              <div key={item.id} className={`flex items-center justify-between px-3 sm:px-5 py-3 sm:py-4 rounded-xl border shadow-sm transition-all ${today ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-200' : past ? 'bg-white border-slate-200 opacity-55' : 'bg-white border-slate-200 hover:border-indigo-200'}`}>
                                <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                                  <span className={`text-xs font-bold w-5 sm:w-7 text-center shrink-0 ${past ? 'text-slate-400' : 'text-slate-500'}`}>{idx + 1}</span>
                                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${today ? 'bg-indigo-600 text-white' : past ? 'bg-slate-200 text-slate-400' : 'bg-indigo-100 text-indigo-600'}`}>
                                    <Calendar size={14} className="sm:hidden" />
                                    <Calendar size={16} className="hidden sm:block" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className={`font-bold text-sm sm:text-[15px] truncate ${today ? 'text-indigo-800' : past ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                                      {formatThaiDate(item.date)}
                                      {today && <span className="ml-1.5 sm:ml-2 text-[10px] bg-indigo-600 text-white px-1.5 sm:px-2 py-0.5 rounded-full font-bold animate-pulse">วันนี้</span>}
                                    </p>
                                    <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 truncate">{item.note || (item.auto ? 'สร้างอัตโนมัติ' : 'เพิ่มเอง')}</p>
                                  </div>
                                </div>
                                <button onClick={() => setDateToDelete(item)} className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 sm:p-2 rounded-lg transition shrink-0 ml-2" title="ลบวัน">
                                  <Trash2 size={14} className="sm:hidden" />
                                  <Trash2 size={16} className="hidden sm:block" />
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

              <div className="pt-4 border-t border-slate-100">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                  <h4 className="text-base sm:text-lg font-bold text-slate-800 flex items-center"><MapPin className="mr-2 text-blue-600 shrink-0" size={18} /> กำหนดพิกัดและพื้นที่เช็กชื่อ</h4>
                  <button onClick={() => { setEditLocationForm(locationSettings); setShowSetLocationModal(true); }} className="text-sm bg-blue-50 text-blue-600 font-bold px-4 py-2 rounded-lg hover:bg-blue-100 transition shadow-sm flex items-center w-full sm:w-auto justify-center"><Target size={14} className="mr-1.5" /> ตั้งค่าพิกัด</button>
                </div>
                <div className="bg-slate-50 p-4 sm:p-6 rounded-2xl border border-slate-100 flex flex-col md:flex-row gap-4 sm:gap-6 items-center shadow-sm">
                  <div className="w-full md:w-1/3 h-48 sm:h-56 rounded-xl overflow-hidden shadow-inner border border-slate-300 relative z-0">
                    <MapContainer
                      center={[parseFloat(locationSettings.lat) || 13.777, parseFloat(locationSettings.lng) || 100.556]}
                      zoom={17}
                      scrollWheelZoom={false}
                      dragging={false}
                      zoomControl={false}
                      attributionControl={false}
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <ChangeMapView center={[parseFloat(locationSettings.lat) || 13.777, parseFloat(locationSettings.lng) || 100.556]} />
                      <Marker position={[parseFloat(locationSettings.lat) || 13.777, parseFloat(locationSettings.lng) || 100.556]} />
                      <Circle
                        center={[parseFloat(locationSettings.lat) || 13.777, parseFloat(locationSettings.lng) || 100.556]}
                        radius={locationSettings.radius || 50}
                        pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.15 }}
                      />
                    </MapContainer>
                  </div>
                  <div className="w-full md:w-2/3 space-y-3 sm:space-y-4">
                    <div><span className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wide">จุดอ้างอิงสถานที่</span><p className="font-bold text-slate-800 text-base sm:text-lg mt-0.5">{locationSettings.name}</p></div>
                    <div className="flex flex-col sm:flex-row flex-wrap gap-x-8 gap-y-2 sm:gap-y-3">
                      <div><span className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wide">พิกัด (Lat, Lng)</span><p className="font-medium text-slate-700 mt-0.5 text-sm sm:text-base">{locationSettings.lat}, {locationSettings.lng}</p></div>
                      <div><span className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wide">ระยะที่อนุญาต</span><p className="font-bold text-blue-600 bg-blue-100 px-2 sm:px-2.5 py-0.5 rounded-md mt-0.5 inline-block text-sm sm:text-base">รัศมี {locationSettings.radius} เมตร</p></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-base sm:text-lg font-bold text-slate-800 flex items-center"><AlertTriangle className="mr-2 text-rose-500 shrink-0" size={18} /> จัดการสถานะคลาสเรียน</h4>
                </div>
                <div className={`border rounded-2xl p-4 sm:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all shadow-sm ${isClassCanceled ? 'bg-slate-50 border-slate-200' : 'bg-rose-50/50 border-rose-200'}`}>
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
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-6">
                <div><h4 className="font-bold text-slate-800 text-base sm:text-lg">รายชื่อนักศึกษาทั้งหมด</h4><p className="text-xs sm:text-sm text-slate-500 mt-1">จำนวน {studentList.length} คน</p></div>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  <button onClick={() => { setAddStudentId(''); setAddStudentError(''); setAddStudentSuccess(''); setShowAddStudentModal(true); }} className="text-sm bg-blue-600 text-white font-medium px-4 py-2 rounded-lg hover:bg-blue-700 shrink-0 flex-1 sm:flex-none flex items-center justify-center gap-1.5"><Plus size={15} /> เพิ่มรายชื่อ</button>
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
          )}

          {/* TAB 3: สถิติรายวัน */}
          {courseSubTab === 'daily' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {scheduledDates.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center">
                  <Calendar size={36} className="mx-auto text-slate-300 mb-3 sm:mb-4" />
                  <p className="font-bold text-slate-600 text-base sm:text-lg">ยังไม่มีวันที่เปิดให้เช็คชื่อ</p>
                  <p className="text-slate-500 text-xs sm:text-sm mt-2">ไปที่ Tab <span className="font-bold text-blue-600">"ข้อมูลวิชา"</span> แล้วกด "สร้างตารางอัตโนมัติ" เพื่อกำหนดวันเช็คชื่อก่อน</p>
                  <button onClick={() => setCourseSubTab('info')} className="mt-4 sm:mt-5 bg-blue-600 text-white font-bold px-5 sm:px-6 py-2.5 rounded-xl hover:bg-blue-700 transition shadow-sm text-sm">ไปกำหนดวันเช็คชื่อ</button>
                </div>
              ) : (<>
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
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-5 gap-y-1.5 mt-2.5 text-[10px] sm:text-xs font-medium text-slate-500">
                      <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded"></div> ตรงเวลา ({dailyStats.present})</span>
                      <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-yellow-400 rounded"></div> สาย ({dailyStats.late})</span>
                      <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-red-400 rounded"></div> ขาดเรียน ({dailyStats.absent})</span>
                      <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-slate-200 rounded border border-slate-300"></div> รอ ({dailyStats.pending})</span>
                    </div>
                  </div>
                )}

                {loadingDaily ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 text-center animate-pulse"><div className="h-3 w-20 bg-slate-100 rounded mx-auto mb-3"></div><div className="h-8 w-12 bg-slate-100 rounded mx-auto"></div></div>)}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                    <div className="bg-white p-3 sm:p-5 rounded-xl border border-slate-200 text-center"><p className="text-slate-500 text-[10px] sm:text-xs font-bold uppercase mb-1">ทั้งหมด</p><p className="text-2xl sm:text-3xl font-bold text-slate-800">{dailyStats.total}</p></div>
                    <div className="bg-white p-3 sm:p-5 rounded-xl border border-slate-200 border-b-4 border-b-green-500 text-center"><p className="text-green-600 text-[10px] sm:text-xs font-bold uppercase mb-1">ตรงเวลา</p><p className="text-2xl sm:text-3xl font-bold text-green-600">{dailyStats.present}</p></div>
                    <div className="bg-white p-3 sm:p-5 rounded-xl border border-slate-200 border-b-4 border-b-yellow-500 text-center"><p className="text-yellow-600 text-[10px] sm:text-xs font-bold uppercase mb-1">มาสาย</p><p className="text-2xl sm:text-3xl font-bold text-yellow-600">{dailyStats.late}</p></div>
                    <div className="bg-white p-3 sm:p-5 rounded-xl border border-slate-200 border-b-4 border-b-red-500 text-center"><p className="text-red-500 text-[10px] sm:text-xs font-bold uppercase mb-1">ขาดเรียน</p><p className="text-2xl sm:text-3xl font-bold text-red-500">{dailyStats.absent}</p></div>
                  </div>
                )}

                {loadingDaily ? (
                  <div className="bg-white rounded-xl border border-slate-200 p-8 text-center"><div className="animate-spin w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto"></div><p className="text-slate-500 text-sm mt-3 font-medium">กำลังโหลดข้อมูล...</p></div>
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
                        { key: 'pending', label: 'รอดำเนินการ', count: dailyStats.pending, color: 'gray' },
                      ].map(f => (
                        <button key={f.key} onClick={() => setDailyFilter(f.key)} className={`text-xs font-bold px-3.5 py-2 rounded-lg transition border ${dailyFilter === f.key ? f.color === 'green' ? 'bg-green-50 text-green-700 border-green-300' : f.color === 'yellow' ? 'bg-yellow-50 text-yellow-700 border-yellow-300' : f.color === 'red' ? 'bg-red-50 text-red-600 border-red-300' : f.color === 'gray' ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-blue-50 text-blue-700 border-blue-300' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
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
              </>)}
            </div>
          )}

          {/* TAB 4: สถิติรายเทอม */}
          {courseSubTab === 'term' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl border border-indigo-100 p-4 sm:p-6 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500 opacity-5 rounded-full blur-3xl pointer-events-none group-hover:opacity-10 transition-opacity"></div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-indigo-200/50 pb-4 relative z-10">
                  <div className="flex items-center space-x-2 sm:space-x-3"><div className="bg-white p-2 sm:p-2.5 rounded-xl text-indigo-600 shadow-sm border border-indigo-100 shrink-0"><Sparkles size={18} className="sm:hidden fill-indigo-50" /><Sparkles size={22} className="hidden sm:block fill-indigo-50" /></div><h4 className="text-base sm:text-xl font-extrabold text-indigo-950">สรุปภาพรวมทั้งเทอม</h4></div>
                  <span className="flex items-center bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-[10px] sm:text-xs font-bold px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full shadow-md self-start sm:self-auto shrink-0"><Brain size={12} className="mr-1 sm:hidden" /><Brain size={14} className="mr-1.5 hidden sm:block" /> วิเคราะห์โดย AI</span>
                </div>
                {loadingTerm ? (
                  <p className="text-indigo-600 text-sm font-medium animate-pulse">กำลังวิเคราะห์ข้อมูลการเข้าเรียน...</p>
                ) : (
                  <p className="text-indigo-900/80 text-sm sm:text-[15px] relative z-10 leading-relaxed font-medium">
                    นักศึกษามีความรับผิดชอบในเกณฑ์ <span className={`font-extrabold px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg shadow-sm border mx-1 text-sm sm:text-base ${termColor}`}>{termGrade}</span> ค่าเฉลี่ยการเข้าเรียนตลอดเทอมอยู่ที่ {avgAttendance}%
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm">
                  <h4 className="font-bold text-slate-800 flex items-center mb-4"><BarChart2 size={18} className="mr-2 text-blue-600" /> นักศึกษาที่ขาดเรียนสะสมสูงสุด</h4>
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
                          <p className="text-slate-600 font-bold">ไม่มีนักศึกษาที่ขาดเรียนเลย 🎉</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm">
                  <h4 className="font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">เฝ้าระวังกลุ่มเสี่ยง (AI Alert)</h4>
                  <div className="space-y-4">
                    {loadingTerm ? (
                      <p className="text-sm text-slate-500 mt-4">กำลังวิเคราะห์ความเสี่ยง...</p>
                    ) : riskAlerts.length === 0 ? (
                      <div className="text-center py-6 text-emerald-500 font-bold bg-emerald-50 rounded-lg">
                        <CheckCircle size={24} className="mx-auto mb-2" /> ไม่มีกลุ่มเสี่ยง
                      </div>
                    ) : (
                      riskAlerts.slice(0, 4).map(alert => (
                        <div key={alert.id} className="flex justify-between items-start border-b border-slate-50 pb-3">
                          <div>
                            <p className="text-sm font-bold text-slate-800">{alert.studentName}</p>
                            <p className="text-[11px] text-red-500 mt-0.5">{alert.issue}</p>
                          </div>
                          <button onClick={() => setCourseSubTab('alerts')} className="text-[10px] bg-red-100 text-red-600 font-bold px-2 py-1 rounded hover:bg-red-200 transition whitespace-nowrap ml-2">จัดการ</button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: AI แจ้งเตือนความเสี่ยง */}
          {courseSubTab === 'alerts' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b border-slate-100 pb-4">
                <h4 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center"><Brain className="mr-2 text-blue-600 shrink-0" size={20} /> AI วิเคราะห์ความเสี่ยง</h4>
                <p className="text-xs sm:text-sm text-slate-500">แจ้งเตือนอัตโนมัติเมื่อขาดเรียนเกิน 20% หรือ 3 ครั้ง</p>
              </div>
              {loadingTerm ? (
                <div className="bg-white p-12 rounded-xl border border-slate-200 text-center shadow-sm">
                  <div className="animate-spin w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-4"></div>
                  <p className="text-blue-600 font-bold">AI กำลังวิเคราะห์และตรวจสอบเงื่อนไขความเสี่ยง...</p>
                </div>
              ) : riskAlerts.length === 0 ? (
                <div className="bg-white p-12 rounded-xl border border-slate-200 text-center shadow-sm">
                  <CheckCircle size={40} className="mx-auto text-emerald-400 mb-4" />
                  <p className="font-bold text-slate-800 text-lg">ไม่มีนักศึกษาในกลุ่มเสี่ยงหมดสิทธิ์สอบ</p>
                  <p className="text-sm text-slate-500 mt-2">นักศึกษาทุกคนมีความรับผิดชอบในการเข้าเรียนอยู่ในเกณฑ์ที่น่าพอใจ</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {riskAlerts.map(alert => (
                    <div key={alert.id} className="bg-red-50 p-5 rounded-xl border border-red-100 shadow-sm relative group transition-all hover:shadow-md">
                      <div className="flex items-start mb-4">
                        <div className="bg-red-100 p-2 rounded-lg text-red-600 mr-3 shrink-0"><AlertTriangle size={20} /></div>
                        <div>
                          <h5 className="font-bold text-red-800 mb-1">ความเสี่ยงหมดสิทธิ์สอบ</h5>
                          <p className="text-sm text-red-700">
                            <span className="font-bold text-base block my-1">{alert.studentName}</span>
                            {alert.issue}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center mt-4">
                        {alert.status === 'pending' ? (
                          <button onClick={() => openAlertModal(alert)} className="text-sm bg-white border border-red-200 text-red-600 px-4 py-2 rounded-lg font-bold hover:bg-red-50 transition shadow-sm flex items-center w-full justify-center"><Sparkles size={14} className="mr-1.5 text-amber-500" /> ร่างข้อความแจ้งเตือนเข้าแอป</button>
                        ) : (
                          <span className="text-sm bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-lg font-bold flex items-center w-full justify-center"><CheckCircle size={16} className="mr-1.5" /> ส่งแจ้งเตือนเข้าระบบสำเร็จแล้ว</span>
                        )}
                      </div>
                      <div className="absolute top-4 right-4">
                        <button onClick={() => setAlertToDelete(alert)} className="text-red-300 hover:text-red-600 transition-colors p-1.5 hover:bg-red-100 rounded-lg" title="ลบการแจ้งเตือน"><Trash2 size={18} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* --- Modals --- */}
      {showSetTimeModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl relative p-6 animate-in zoom-in-95">
            <button onClick={() => setShowSetTimeModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 z-10"><XCircle size={24} /></button>
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center"><Clock className="mr-2 text-blue-600" size={20} /> กำหนดเวลา</h3>
            <div className="space-y-3 mb-6">
              <div><label className="block text-xs font-bold text-green-600 mb-1">ตรงเวลา (เริ่มคลาส)</label><input type="time" value={editTimeForm.start} onChange={(e) => setEditTimeForm({ ...editTimeForm, start: e.target.value })} className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-xs font-bold text-yellow-600 mb-1">สาย (หลังจากเวลา)</label><input type="time" value={editTimeForm.late} onChange={(e) => setEditTimeForm({ ...editTimeForm, late: e.target.value })} className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-xs font-bold text-red-600 mb-1">ขาดเรียน (หลังจากเวลา / เลิกคลาส)</label><input type="time" value={editTimeForm.absent} onChange={(e) => setEditTimeForm({ ...editTimeForm, absent: e.target.value })} className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            </div>
            <button onClick={handleSaveTimeSettings} className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-bold hover:bg-blue-700 shadow-md">บันทึกเวลาเช็คชื่อ</button>
          </div>
        </div>
      )}

      {showSetLocationModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl relative p-6 md:p-8 animate-in zoom-in-95">
            <button onClick={() => setShowSetLocationModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 z-10"><XCircle size={24} /></button>
            <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center"><Target className="mr-2 text-blue-600" size={22} /> ตั้งค่าพิกัดเช็กชื่อ</h3>
            <p className="text-sm text-slate-500 mb-6">กำหนดพื้นที่ที่อนุญาตให้นักศึกษาสามารถสแกนใบหน้าได้</p>
            <div className="space-y-4 mb-6">
              <div><label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">ชื่อสถานที่ / อาคาร</label><input type="text" value={editLocationForm.name} onChange={(e) => setEditLocationForm({ ...editLocationForm, name: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Latitude</label><input type="text" value={editLocationForm.lat} onChange={(e) => setEditLocationForm({ ...editLocationForm, lat: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium font-mono" /></div>
                <div><label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Longitude</label><input type="text" value={editLocationForm.lng} onChange={(e) => setEditLocationForm({ ...editLocationForm, lng: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium font-mono" /></div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide flex justify-between"><span>ระยะรัศมีที่อนุญาต</span><span className="text-blue-600">{editLocationForm.radius} เมตร</span></label>
                <input type="range" min="10" max="500" step="10" value={editLocationForm.radius} onChange={(e) => setEditLocationForm({ ...editLocationForm, radius: e.target.value })} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={handleSetLocation} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition flex items-center justify-center gap-2 shadow-sm"><Target size={18} /> ดึงพิกัดจากตำแหน่งปัจจุบัน (GPS)</button>
              <div className="flex space-x-3">
                <button onClick={() => setShowSetLocationModal(false)} className="flex-1 bg-white border border-slate-200 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-50 transition">ยกเลิก</button>
                <button onClick={handleSaveManualLocation} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-md">บันทึกค่าที่แก้ไข</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSendAlertModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl relative p-6 animate-in zoom-in-95">
            <button onClick={() => setShowSendAlertModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 z-10"><XCircle size={24} /></button>
            <div className="flex items-center space-x-2 mb-4 text-blue-700"><Brain size={24} /><h3 className="text-xl font-bold">ส่งแจ้งเตือนเข้าระบบนักศึกษา</h3></div>
            <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-200">
              <div className="mb-2 text-sm"><span className="font-bold">ถึง:</span> {alertToSend?.studentName}</div>
              <textarea
                className="w-full h-32 bg-white border border-slate-200 p-2 rounded-lg text-sm outline-none resize-none focus:ring-2 focus:ring-blue-500"
                value={aiMessage}
                onChange={(e) => setAiMessage(e.target.value)}
              ></textarea>
            </div>
            <div className="flex space-x-3">
              <button onClick={() => setShowSendAlertModal(false)} className="flex-1 bg-white border border-slate-300 text-slate-700 py-2.5 rounded-lg font-bold hover:bg-slate-50">ยกเลิก</button>
              <button onClick={handleSendAlertToStudent} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-bold hover:bg-blue-700"><Mail size={16} className="inline mr-2" /> ยืนยันการส่ง</button>
            </div>
          </div>
        </div>
      )}

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

      {/* 🌟 Modal เพิ่มนักศึกษาเข้าคลาส (ดีไซน์ใหม่ + UI แจ้งเตือน) 🌟 */}
      {showAddStudentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-300 border border-white/50">

            {/* Header Area with Gradient */}
            <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-600 p-6 sm:p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-xl translate-y-1/2 -translate-x-1/4"></div>

              <button
                onClick={() => {
                  setShowAddStudentModal(false);
                  setAddStudentError('');
                  setAddStudentSuccess('');
                  setAddStudentId('');
                }}
                className="absolute top-4 right-4 text-white/70 hover:text-white hover:bg-white/20 p-1.5 rounded-full transition-colors z-10"
              >
                <XCircle size={24} />
              </button>

              <div className="relative z-10 flex items-center">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mr-4 shadow-inner border border-white/30">
                  <UserPlus size={26} className="text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold tracking-wide">เพิ่มนักศึกษาเข้าคลาส</h3>
                  <p className="text-blue-100 text-xs mt-1.5 font-medium opacity-90">ดึงข้อมูลจากระบบกลางเข้าสู่วิชานี้</p>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8 bg-slate-50/50">

              {/* ✨ UI แจ้งเตือน Error / Success ✨ */}
              <div className={`transition-all duration-300 overflow-hidden ${addStudentError ? 'max-h-24 opacity-100 mb-5' : 'max-h-0 opacity-0 m-0'}`}>
                <div className="bg-rose-50 text-rose-600 px-4 py-3.5 rounded-2xl flex items-start border border-rose-100 text-sm font-bold shadow-sm">
                  <AlertCircle className="mr-2.5 shrink-0 mt-0.5" size={18} />
                  <span className="leading-snug">{addStudentError}</span>
                </div>
              </div>

              <div className={`transition-all duration-300 overflow-hidden ${addStudentSuccess ? 'max-h-24 opacity-100 mb-5' : 'max-h-0 opacity-0 m-0'}`}>
                <div className="bg-emerald-50 text-emerald-700 px-4 py-3.5 rounded-2xl flex items-start border border-emerald-100 text-sm font-bold shadow-sm">
                  <CheckCircle className="mr-2.5 shrink-0 mt-0.5" size={18} />
                  <span className="leading-snug">{addStudentSuccess}</span>
                </div>
              </div>

              <div className="mb-6 group">
                <label className="block text-xs font-extrabold text-slate-500 mb-2.5 uppercase tracking-wider ml-1">
                  รหัสนักศึกษา (13 หลัก) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-600">
                    <Search className="text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="เช่น 2310511010014"
                    value={addStudentId}
                    onChange={(e) => {
                      setAddStudentId(e.target.value.replace(/\D/g, '').slice(0, 13));
                      if (addStudentError) setAddStudentError(''); // ซ่อน error ทันทีที่เริ่มพิมพ์ใหม่
                    }}
                    maxLength={13}
                    className={`w-full pl-12 pr-4 py-4 border rounded-2xl outline-none text-sm font-mono tracking-widest text-slate-800 bg-white transition-all shadow-sm font-bold focus:ring-4 ${addStudentError ? 'border-rose-300 focus:ring-rose-50 focus:border-rose-400' : 'border-slate-200 focus:ring-blue-50 focus:border-blue-400'}`}
                  />
                </div>
                <div className="flex items-start mt-3 ml-1">
                  <AlertCircle size={14} className="text-amber-500 mr-1.5 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    ต้องเป็นรหัสที่เคยลงทะเบียนใบหน้าในระบบหลักแล้ว<br />หากยังไม่มี ให้ไปที่เมนู <b>"เพิ่มนักศึกษาระบบหลัก"</b>
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowAddStudentModal(false);
                    setAddStudentError('');
                    setAddStudentSuccess('');
                    setAddStudentId('');
                  }}
                  className="flex-[1] px-4 py-3.5 rounded-2xl font-bold text-slate-600 bg-white border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all text-sm"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleAddStudent}
                  disabled={addingStudent || addStudentId.length < 10}
                  className="flex-[2] relative px-4 py-3.5 rounded-2xl font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all shadow-[0_8px_20px_rgb(147,51,234,0.25)] hover:shadow-[0_8px_25px_rgb(147,51,234,0.35)] hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none overflow-hidden flex items-center justify-center text-sm group/btn"
                >
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite]"></div>

                  {addingStudent ? (
                    <><Loader2 size={18} className="animate-spin mr-2 relative z-10" /> <span className="relative z-10">กำลังดึงข้อมูล...</span></>
                  ) : (
                    <><Plus size={18} className="mr-1.5 relative z-10" /> <span className="relative z-10">ยืนยันเพิ่มนักศึกษา</span></>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-xl relative animate-in zoom-in-95">
            <button onClick={resetCsvModal} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 z-10"><XCircle size={24} /></button>

            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-5 sm:p-6">
              <h3 className="text-lg font-bold text-white flex items-center"><FileUp size={22} className="mr-2" /> นำเข้ารายชื่อจากไฟล์ CSV</h3>
              <p className="text-emerald-100 text-sm mt-1">อัปโหลดไฟล์ CSV ที่มีรหัสนักศึกษา ระบบจะเพิ่มเข้าคลาสให้อัตโนมัติ</p>
            </div>

            <div className="p-5 sm:p-6">
              {/* File Upload Area */}
              {!csvImportResult && (
                <>
                  <label className="block cursor-pointer mb-5">
                    <div className={`border-2 border-dashed rounded-xl p-6 sm:p-8 text-center transition-all ${csvFile ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50'}`}>
                      {csvFile ? (
                        <div>
                          <CheckCircle2 size={36} className="mx-auto text-emerald-500 mb-2" />
                          <p className="font-bold text-emerald-700 text-sm">{csvFile.name}</p>
                          <p className="text-emerald-600 text-xs mt-1">พบรหัสนักศึกษา {csvPreview.length} รายการ</p>
                          <p className="text-slate-400 text-xs mt-2">คลิกเพื่อเลือกไฟล์ใหม่</p>
                        </div>
                      ) : (
                        <div>
                          <Upload size={36} className="mx-auto text-slate-300 mb-3" />
                          <p className="font-bold text-slate-600 text-sm">คลิกเพื่อเลือกไฟล์ CSV</p>
                          <p className="text-slate-400 text-xs mt-1.5">หรือลากไฟล์มาวางที่นี่</p>
                        </div>
                      )}
                    </div>
                    <input type="file" accept=".csv,.txt" onChange={handleCsvFileChange} className="hidden" />
                  </label>

                  {/* Format Guide */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5">
                    <p className="text-xs font-bold text-slate-700 mb-2 flex items-center"><FileText size={14} className="mr-1.5 text-slate-500" /> รูปแบบไฟล์ที่รองรับ</p>
                    <div className="bg-white rounded-lg p-3 border border-slate-100 font-mono text-xs text-slate-600 space-y-0.5">
                      <p className="text-slate-400"># ตัวอย่าง CSV (1 คอลัมน์)</p>
                      <p>2310511010001</p>
                      <p>2310511010002</p>
                      <p className="text-slate-400 mt-2"># หรือหลายคอลัมน์ (ระบบจะดึงรหัสอัตโนมัติ)</p>
                      <p>2310511010001, สมชาย ใจดี</p>
                      <p>2310511010002, สมหญิง รักเรียน</p>
                    </div>
                  </div>

                  {/* Preview List */}
                  {csvPreview.length > 0 && (
                    <div className="mb-5">
                      <p className="text-xs font-bold text-slate-700 mb-2">ตัวอย่างรหัสที่จะนำเข้า (แสดง {Math.min(csvPreview.length, 5)} จาก {csvPreview.length} รายการ)</p>
                      <div className="flex flex-wrap gap-1.5">
                        {csvPreview.slice(0, 5).map((id, i) => (
                          <span key={i} className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-mono px-2.5 py-1 rounded-lg">{id}</span>
                        ))}
                        {csvPreview.length > 5 && <span className="bg-slate-100 text-slate-500 text-xs px-2.5 py-1 rounded-lg font-medium">+{csvPreview.length - 5} รายการ</span>}
                      </div>
                    </div>
                  )}

                  {/* Progress Bar */}
                  {csvImporting && (
                    <div className="mb-5">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-bold text-slate-700 flex items-center"><Loader2 size={14} className="mr-1.5 animate-spin" /> กำลังนำเข้า...</p>
                        <p className="text-sm font-bold text-emerald-600">{csvImportProgress}%</p>
                      </div>
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-300" style={{ width: `${csvImportProgress}%` }}></div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex space-x-3">
                    <button onClick={resetCsvModal} className="flex-1 bg-white border border-slate-200 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-50 transition">ยกเลิก</button>
                    <button
                      onClick={handleCsvImport}
                      disabled={csvPreview.length === 0 || csvImporting}
                      className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {csvImporting ? <><Loader2 size={16} className="animate-spin" /> กำลังนำเข้า...</> : <><Upload size={16} /> นำเข้า {csvPreview.length > 0 ? `(${csvPreview.length} คน)` : ''}</>}
                    </button>
                  </div>
                </>
              )}

              {/* Import Results */}
              {csvImportResult && (
                <div>
                  <div className="text-center mb-5">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${csvImportResult.failed > 0 ? 'bg-yellow-50' : 'bg-emerald-50'}`}>
                      {csvImportResult.failed > 0 ? <AlertCircle size={32} className="text-yellow-500" /> : <CheckCircle2 size={32} className="text-emerald-500" />}
                    </div>
                    <h4 className="text-lg font-bold text-slate-800">นำเข้าเสร็จสิ้น!</h4>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-5">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-emerald-700">{csvImportResult.success}</p>
                      <p className="text-xs font-bold text-emerald-600 mt-1">สำเร็จ</p>
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-yellow-700">{csvImportResult.duplicates}</p>
                      <p className="text-xs font-bold text-yellow-600 mt-1">ซ้ำ</p>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-red-600">{csvImportResult.failed}</p>
                      <p className="text-xs font-bold text-red-500 mt-1">ไม่สำเร็จ</p>
                    </div>
                  </div>

                  {csvImportResult.errors.length > 0 && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-5 max-h-32 overflow-y-auto">
                      <p className="text-xs font-bold text-slate-600 mb-2">รายละเอียด:</p>
                      {csvImportResult.errors.map((err, i) => (
                        <p key={i} className="text-xs text-slate-500 py-0.5"><span className="font-mono text-slate-700">{err.id}</span> — {err.message}</p>
                      ))}
                    </div>
                  )}

                  <button onClick={resetCsvModal} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition shadow-md">เสร็จสิ้น</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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

      {showGenerateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl relative p-6 md:p-8 animate-in zoom-in-95">
            <button onClick={() => setShowGenerateModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 z-10"><XCircle size={24} /></button>
            <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center"><Sparkles size={20} className="mr-2 text-indigo-600" /> สร้างตารางเช็คชื่ออัตโนมัติ</h3>
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
              <button onClick={handleGenerateDates} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition shadow-md flex items-center justify-center"><Sparkles size={16} className="mr-2" /> สร้างตาราง</button>
            </div>
          </div>
        </div>
      )}

      {showAddDateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl relative p-6 animate-in zoom-in-95">
            <button onClick={() => setShowAddDateModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 z-10"><XCircle size={24} /></button>
            <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center"><Plus size={20} className="mr-2 text-indigo-600" /> เพิ่มวันเดี่ยว</h3>
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