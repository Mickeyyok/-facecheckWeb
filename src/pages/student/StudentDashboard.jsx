import React, { useState, useEffect, useRef } from 'react';
import { Camera, MapPin, CheckCircle, AlertTriangle, XCircle, Brain, Bell, Clock, X, Calendar, AlertOctagon, FileText, Send, Loader2, Upload, ImageIcon } from 'lucide-react';
import * as faceapi from 'face-api.js';
import { useAuth } from '../../context/AuthContext';
import { attendanceService } from '../../services/attendanceService';
import { classService } from '../../services/classService';
import { leaveRequestService } from '../../services/leaveRequestService';
import { showSuccess, showError, showAlert } from '../../utils/alertPopup';
import api from '../../services/api';

export default function StudentDashboard() {
  const { user } = useAuth();

  const [studentClasses, setStudentClasses] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [activeCourseDetail, setActiveCourseDetail] = useState(null); 
  const [classStats, setClassStats] = useState({ present: 0, late: 0, absent: 0 });
  
  const videoRef = useRef();
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [scanStep, setScanStep] = useState(0); 
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // --- ใบลา ---
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ leaveType: 'sick', leaveDate: '', reason: '' });
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [attachmentImage, setAttachmentImage] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState(null);

  // --- นาฬิกา real-time อัพเดตทุก 10 วินาที ---
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  // --- คำนวณ deadline สแกนของแต่ละวิชา ---
  const getCourseDeadline = (course) => {
    if (!course?.startTime) return null;
    const start = course.startTime.substring(0, 5);
    const [h, m] = start.split(':').map(Number);
    if (course.endTime) {
      const end = course.endTime.substring(0, 5);
      const [eH, eM] = end.split(':').map(Number);
      const deadline = new Date();
      deadline.setHours(eH, eM, 0, 0);
      return deadline;
    }
    const lateMin = course.lateThresholdMinutes || 15;
    const absentMin = lateMin * 2;
    const absentTotalMin = h * 60 + m + absentMin;
    const deadline = new Date();
    deadline.setHours(Math.floor(absentTotalMin / 60), absentTotalMin % 60, 0, 0);
    return deadline;
  };

  // 1. โหลดโมเดลและรายชื่อวิชา
  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = '/models';
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
      } catch (err) { console.error('โหลดโมเดลไม่สำเร็จ:', err); }
    };

    const fetchMyClasses = async () => {
      if (user?.id) {
        try {
          const data = await classService.getClassesByStudent(user.id);
          setStudentClasses(data);
          if (data.length > 0 && !selectedCourseId) {
            // เลือกวิชาแรกที่ยังไม่หมดเวลาสแกน (sort ตาม startTime)
            const sorted = [...data].sort((a, b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00'));
            const nowDate = new Date();
            const firstActive = sorted.find(c => {
              const dl = getCourseDeadline(c);
              return !dl || nowDate <= dl;
            });
            setSelectedCourseId(firstActive ? firstActive.id : sorted[0].id);
          }
        } catch (err) { console.error('โหลดคลาสเรียนล้มเหลว', err); }
      }
    };

    loadModels();
    fetchMyClasses();
  }, [user]);

  // 2. ดึงข้อมูลวิชาแบบละเอียด (รวม scheduledDates) + auto-refresh ทุก 30 วิ
  useEffect(() => {
    let isInitialFetch = true;
    const fetchFullCourseData = async () => {
      if (selectedCourseId) {
        try {
          const data = await classService.getClassById(selectedCourseId);
          setActiveCourseDetail(data);
          // รีเซ็ตสถานะการเช็กชื่อเฉพาะตอนเปลี่ยนวิชาเท่านั้น (ไม่รีเซ็ตตอน auto-refresh)
          if (isInitialFetch) {
            setIsCheckedIn(false);
            isInitialFetch = false;
          }
        } catch (err) { console.error('ดึงข้อมูลวิชาแบบละเอียดไม่สำเร็จ', err); }
      }
    };
    fetchFullCourseData();

    // ✅ Auto-refresh ทุก 30 วินาที เพื่อรับสถานะยกเลิกคลาสจากอาจารย์
    const interval = setInterval(fetchFullCourseData, 30000);
    return () => clearInterval(interval);
  }, [selectedCourseId]);

  // 3. ดึงสถิติ
  useEffect(() => {
    const fetchCourseStats = async () => {
      if (user?.id && selectedCourseId) {
        try {
          setStatsLoading(true);
          const res = await api.get(`/attendance/student/${user.id}/stats/${selectedCourseId}`);
          setClassStats({
            present: res.data.present || 0,
            late: res.data.late || 0,
            absent: res.data.absent || 0
          });
        } catch (err) {
          setClassStats({ present: 0, late: 0, absent: 0 });
        } finally { setStatsLoading(false); }
      }
    };
    fetchCourseStats();
  }, [user, selectedCourseId]);

  const activeCourse = (activeCourseDetail && activeCourseDetail.id === selectedCourseId) 
    ? activeCourseDetail 
    : (studentClasses.find(c => c.id === selectedCourseId) || null);

  const getCheckInTimeLimits = (course) => {
    if (!course || !course.startTime) return null;
    const start = course.startTime.substring(0, 5);
    const [startH, startM] = start.split(':').map(Number);
    const lateThreshold = course.lateThresholdMinutes ?? 15;
    const lateTotalMinutes = startH * 60 + startM + lateThreshold;
    const latePoint = `${String(Math.floor(lateTotalMinutes / 60)).padStart(2, '0')}:${String(lateTotalMinutes % 60).padStart(2, '0')}`;
    const absentPoint = (course.endTime || "23:59").substring(0, 5);
    return { start, late: latePoint, absent: absentPoint };
  };

  const timeLimits = getCheckInTimeLimits(activeCourse);

  const getThaiDay = (dayStr) => {
    const days = { 'MONDAY': 'วันจันทร์', 'MON': 'วันจันทร์', 'TUESDAY': 'วันอังคาร', 'TUE': 'วันอังคาร', 'WEDNESDAY': 'วันพุธ', 'WED': 'วันพุธ', 'THURSDAY': 'วันพฤหัสบดี', 'THU': 'วันพฤหัสบดี', 'FRIDAY': 'วันศุกร์', 'FRI': 'วันศุกร์', 'SATURDAY': 'วันเสาร์', 'SAT': 'วันเสาร์', 'SUNDAY': 'วันอาทิตย์', 'SUN': 'วันอาทิตย์' };
    return days[dayStr?.toUpperCase()] || dayStr;
  };

  const getLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) reject(new Error('เบราว์เซอร์ของคุณไม่รองรับ GPS'));
      else navigator.geolocation.getCurrentPosition((pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }), (err) => reject(new Error('โปรดอนุญาตการเข้าถึง GPS')));
    });
  };

  const stopVideo = () => { if (videoRef.current && videoRef.current.srcObject) videoRef.current.srcObject.getTracks().forEach(t => t.stop()); };

  const processCheckIn = async () => {
    if (!activeCourse) return;
    try {
      setScanStep(0); setErrorMessage('');
      const { lat, lng } = await getLocation();
      setScanStep(1); 
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
      await new Promise(r => setTimeout(r, 1500));
      let descriptor = null;
      for (let i = 0; i < 50; i++) {
        if (videoRef.current && videoRef.current.readyState === 4) {
          const det = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
          if (det) { descriptor = det.descriptor; break; }
        }
        await new Promise(r => setTimeout(r, 100));
      }
      if (!descriptor) throw new Error('ไม่พบใบหน้า หรือหันหน้าไม่ตรงกล้อง');
      stopVideo();
      const actualStudentId = user?.studentId || JSON.parse(localStorage.getItem('user'))?.studentId || "2310511101060";
      
      const res = await attendanceService.checkIn({ 
        classId: activeCourse.id, 
        studentId: actualStudentId, 
        latitude: lat, 
        longitude: lng, 
        faceDescriptor: Array.from(descriptor) 
      });
      
      setScanStep(2); 
      setIsCheckedIn(true); // ✅ ล็อคสถานะสำเร็จ
      
      // อัปเดตสถิติทันที
      if (res.status === 'late') {
        setClassStats(prev => ({ ...prev, late: prev.late + 1 }));
      } else {
        setClassStats(prev => ({ ...prev, present: prev.present + 1 }));
      }
      
    } catch (err) { 
      stopVideo(); 
      // ดักจับกรณี Backend บอกว่าเคยเช็คชื่อไปแล้ว
      if (err.response?.status === 409) {
        setIsCheckedIn(true);
        setShowCheckInModal(false);
        alert("คุณได้เช็กชื่อวิชานี้ไปเรียบร้อยแล้วในวันนี้");
      } else {
        setErrorMessage(err.message || "เช็คชื่อไม่สำเร็จ"); 
        setScanStep(3); 
      }
    }
  };

  const aiAnalysis = ((absentCount) => {
    if (absentCount >= 4) return { color: 'from-rose-600 to-red-800 ring-rose-500/50', icon: <AlertOctagon size={32}/>, title: '🚨 ตัดสิทธิ์สอบ!', msg: `คุณขาดเรียนสะสม ${absentCount} ครั้ง เกินเกณฑ์แล้ว` };
    if (absentCount === 3) return { color: 'from-orange-500 to-amber-700 ring-orange-500/50 animate-pulse', icon: <AlertOctagon size={32}/>, title: '⚠️ AI Warning: เสี่ยงหมดสิทธิ์สอบ!', msg: 'ขาดเรียน 3 ครั้งแล้ว ระวังถูกตัดสิทธิ์สอบ' };
    return { color: 'from-[#131B2F] to-[#1a2542] ring-white/5', icon: <Brain size={32}/>, title: 'AI Suggestion', msg: `สถิติปัจจุบัน ขาดเรียน ${absentCount} ครั้ง หมั่นเข้าเรียนให้ตรงเวลานะครับ` };
  })(classStats.absent);

  const handleSubmitLeave = async () => {
    if (!leaveForm.leaveDate) return showAlert('กรุณาเลือกวันที่ลา');
    if (!leaveForm.reason.trim()) return showAlert('กรุณากรอกเหตุผลการลา');
    if (!activeCourse) return showAlert('กรุณาเลือกวิชาก่อน');
    try {
      setSubmittingLeave(true);
      await leaveRequestService.createLeaveRequest({
        studentId: user.id,
        classId: activeCourse.id,
        leaveType: leaveForm.leaveType,
        leaveDate: leaveForm.leaveDate,
        reason: leaveForm.reason,
        attachmentImage: attachmentImage,
      });
      showSuccess('ส่งใบลาเรียบร้อย!', 'ระบบส่งคำขอไปยังอาจารย์ผู้สอนแล้ว');
      setShowLeaveModal(false);
      setLeaveForm({ leaveType: 'sick', leaveDate: '', reason: '' });
      setAttachmentImage(null);
      setAttachmentPreview(null);
    } catch (err) {
      showError('ส่งใบลาไม่สำเร็จ', err.response?.data?.message || err.message);
    } finally {
      setSubmittingLeave(false);
    }
  };

  return (
    <div className="p-8 lg:p-10 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1400px] mx-auto space-y-8 text-slate-800">
      <h3 className="text-[28px] font-extrabold flex items-center flex-wrap gap-3">
        ภาพรวมการเรียน {activeCourse && <span className="text-sm font-bold text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg">กำลังดู: วิชา {activeCourse.subjectName}</span>}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-7 rounded-[1.25rem] shadow-sm border border-slate-200/80 flex items-center justify-between">
          <div><p className="text-[13px] text-slate-500 font-bold mb-1">เข้าเรียนตรงเวลา</p><p className="text-3xl font-black">{classStats.present}</p></div>
          <div className="w-[52px] h-[52px] rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center"><CheckCircle size={26} strokeWidth={2.5}/></div>
        </div>
        <div className="bg-white p-7 rounded-[1.25rem] shadow-sm border border-slate-200/80 flex items-center justify-between">
          <div><p className="text-[13px] text-slate-500 font-bold mb-1">มาสาย</p><p className="text-3xl font-black">{classStats.late}</p></div>
          <div className="w-[52px] h-[52px] rounded-full bg-amber-50 text-amber-500 flex items-center justify-center"><AlertTriangle size={26} strokeWidth={2.5}/></div>
        </div>
        <div className="bg-white p-7 rounded-[1.25rem] shadow-sm border border-slate-200/80 flex items-center justify-between">
          <div><p className="text-[13px] text-slate-500 font-bold mb-1">ขาดเรียน</p><p className="text-3xl font-black">{classStats.absent}</p></div>
          <div className="w-[52px] h-[52px] rounded-full bg-rose-50 text-rose-500 flex items-center justify-center"><XCircle size={26} strokeWidth={2.5}/></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="rounded-[2rem] p-8 md:p-10 text-white relative overflow-hidden flex flex-col justify-between min-h-[260px] transition-all duration-500 bg-gradient-to-br from-[#2b4cdd] to-[#1e3ab8] shadow-[0_15px_40px_-10px_rgba(43,76,221,0.5)]">
            <div className="relative z-10 flex flex-col md:flex-row md:justify-between items-start">
              <div>
                <h3 className="text-3xl md:text-[40px] font-black mb-2">{activeCourse?.subjectName || 'ยังไม่ได้เลือกวิชา'}</h3>
                <p className="text-blue-200 text-[15px] font-medium">รหัสวิชา {activeCourse?.subjectCode} • <span className="font-bold text-white">{getThaiDay(activeCourse?.scheduleDay)}</span></p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-5 mt-6 md:mt-0 min-w-[220px]">
                <p className="text-xs font-extrabold uppercase text-blue-200 mb-3 border-b border-white/20 pb-2">ช่วงเวลาเช็คชื่อ</p>
                {timeLimits && (
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center text-sm"><span className="flex items-center text-emerald-300 font-semibold"><CheckCircle size={14} className="mr-1.5" /> ตรงเวลา</span><span className="font-bold">{timeLimits.start} น.</span></div>
                    <div className="flex justify-between items-center text-sm"><span className="flex items-center text-amber-300 font-semibold"><AlertTriangle size={14} className="mr-1.5" /> มาสาย</span><span className="font-bold">{timeLimits.late} น.</span></div>
                    <div className="flex justify-between items-center text-sm"><span className="flex items-center text-rose-300 font-semibold"><XCircle size={14} className="mr-1.5" /> ขาดเรียน</span><span className="font-bold">{timeLimits.absent} น.</span></div>
                  </div>
                )}
              </div>
            </div>

            <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-end mt-10 gap-5">
              <div className="bg-black/20 border border-white/10 px-5 py-3 rounded-full flex items-center space-x-3 backdrop-blur-md"><MapPin size={18} className="text-blue-300"/><span className="text-[15px] font-semibold">ห้อง {activeCourse?.room || '-'}</span></div>
              
              {/* ✅ SMART BUTTON LOGIC - แก้ไขลำดับ Priority ใหม่เพื่อให้ปุ่มเขียวหายไปเมื่อหมดเวลา */}
              {(() => {
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                const todayStr = `${year}-${month}-${day}`;
                
                const nowMin = now.getHours() * 60 + now.getMinutes();
                const [sH, sM] = (activeCourse?.startTime || "00:00").split(':').map(Number);
                const [eH, eM] = (activeCourse?.endTime || "23:59").split(':').map(Number);
                const startMin = sH * 60 + sM;
                const endMin = eH * 60 + eM;

                let scheduledDates = [];
                try { 
                  scheduledDates = typeof activeCourse?.scheduledDates === 'string' 
                    ? JSON.parse(activeCourse.scheduledDates) 
                    : (activeCourse?.scheduledDates || []); 
                } catch(e) {}
                
                const isTodayClass = scheduledDates.some(d => d.date === todayStr);

                // 1. ตรวจสอบว่าเลือกวิชาหรือยัง
                if (!activeCourse) return <button disabled className="bg-white/20 text-white/50 px-8 py-4 rounded-xl font-extrabold cursor-not-allowed w-full sm:w-auto">ยังไม่ได้เลือกวิชา</button>;
                
                // 2. ตรวจสอบว่าวันนี้มีเรียนตามตารางไหม
                if (!isTodayClass) return <div className="bg-white/10 text-white/60 px-8 py-4 rounded-xl font-extrabold border border-white/10 backdrop-blur-sm cursor-not-allowed flex items-center justify-center space-x-2 w-full sm:w-auto"><span>วันนี้ไม่มีคลาสเรียน</span></div>;

                // 🔴 3. เช็คเวลาหมดเขต (PRIORITY 1: สำคัญที่สุด)
                // ถ้าเลยเวลาเลิกคลาสแล้ว ไม่ว่าจะเช็คชื่อแล้วหรือยัง ต้องขึ้นว่า "หมดเวลาเรียนแล้ว"
                if (nowMin > endMin) return (
                  <div className="bg-rose-500/20 text-rose-200 px-8 py-4 rounded-xl font-extrabold flex items-center justify-center space-x-2.5 border border-rose-500/30 w-full sm:w-auto">
                    <XCircle size={20}/>
                    <span>หมดเวลาเรียนแล้ว ({activeCourse.endTime})</span>
                  </div>
                );

                // 🟠 4. เช็คเวลาเริ่ม (PRIORITY 2)
                // ถ้ายังไม่ถึงเวลาเริ่มเรียน
                if (nowMin < startMin) return (
                  <div className="bg-amber-500/20 text-amber-200 px-8 py-4 rounded-xl font-extrabold flex items-center justify-center space-x-2.5 border border-amber-500/30 w-fit">
                    <Clock size={20} className="animate-pulse" />
                    <span>ยังไม่ถึงเวลาเรียน ({activeCourse.startTime} น.)</span>
                  </div>
                );

                // 🟢 5. เช็คสถานะการเช็คชื่อ (PRIORITY 3)
                // ถ้าอยู่ในเวลาเรียน แล้วสแกนผ่านแล้ว ถึงจะโชว์ปุ่มเขียว
                if (isCheckedIn || classStats.present > 0 || classStats.late > 0) return (
                  <div className="bg-emerald-500 text-white px-8 py-4 rounded-xl font-extrabold flex items-center justify-center space-x-2.5 shadow-lg border border-emerald-400 w-full sm:w-auto">
                    <CheckCircle size={20}/>
                    <span>เช็กชื่อเรียบร้อยแล้ว</span>
                  </div>
                );

                // 🔵 6. ปุ่มปกติ (อยู่ในเวลาเรียน และยังไม่เคยเช็ค)
                return (
                  <button 
                    onClick={() => { setShowCheckInModal(true); processCheckIn(); }} 
                    className="bg-white text-[#2b4cdd] px-8 py-4 rounded-xl font-extrabold shadow-xl flex items-center justify-center space-x-2.5 transform transition-all active:scale-95 hover:bg-blue-50 w-full sm:w-auto"
                  >
                    <Camera size={20}/>
                    <span>คลิกเพื่อเช็กชื่อ</span>
                  </button>
                );
              })()}
            </div>
          </div>

          <div className={`rounded-[2rem] shadow-xl p-8 text-white relative overflow-hidden group flex flex-col sm:flex-row items-center gap-6 bg-gradient-to-br transition-all duration-500 ring-2 ${aiAnalysis.color}`}>
            <div className={`w-16 h-16 shrink-0 rounded-2xl flex items-center justify-center border backdrop-blur-md z-10 bg-white/5 border-white/10`}>{aiAnalysis.icon}</div>
            <div className="text-center sm:text-left z-10 w-full">
              <h4 className="font-extrabold mb-2 text-xl tracking-wide">{aiAnalysis.title}</h4>
              <p className="text-[15px] text-white/90 leading-relaxed font-medium">{aiAnalysis.msg}</p>
            </div>
          </div>

          {/* ปุ่มส่งใบลา */}
          {activeCourse && (
            <button
              onClick={() => setShowLeaveModal(true)}
              className="w-full bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 flex items-center justify-between hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center shadow-inner">
                  <FileText size={24} />
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-slate-800">ส่งใบลา</h4>
                  <p className="text-xs text-slate-400 font-medium">ลาป่วย / ลากิจ</p>
                </div>
              </div>
              <Send size={18} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
            </button>
          )}
        </div>

        <div className="lg:col-span-1 space-y-8 flex flex-col">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 p-7 flex-1">
            <h4 className="font-extrabold text-lg mb-6 flex items-center"><div className="w-1.5 h-6 bg-[#2b4cdd] rounded-full mr-3"></div>วิชาที่ลงทะเบียน</h4>
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {[...studentClasses].sort((a, b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00')).map((course) => {
                const deadline = getCourseDeadline(course);
                const isExpired = deadline && now > deadline;
                const isActive = course.id === selectedCourseId;
                const isOpenScan = !isExpired && deadline && now >= (() => { const s = new Date(); const [hh, mm] = (course.startTime || '00:00').split(':').map(Number); s.setHours(hh, mm, 0, 0); return s; })();

                return (
                  <div key={course.id} onClick={() => setSelectedCourseId(course.id)} className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${isActive ? 'bg-blue-50/60 border-[#2b4cdd] ring-1 ring-[#2b4cdd]/30 shadow-md transform scale-[1.02]' : isExpired ? 'bg-slate-50/60 border-slate-100 opacity-50' : 'bg-slate-50 border-slate-100 hover:border-blue-300'}`}>
                    {isActive && <div className="absolute left-0 top-0 w-1 h-full bg-[#2b4cdd]"></div>}
                    <div className="flex items-start justify-between mb-3">
                      <h5 className={`font-bold text-[16px] ${isActive ? 'text-[#2b4cdd]' : isExpired ? 'text-slate-400' : 'text-slate-700'}`}>{course.subjectCode} {course.subjectName}</h5>
                      {isOpenScan && <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full whitespace-nowrap flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>เปิดสแกน</span>}
                      {isExpired && <span className="text-[10px] font-bold bg-slate-100 text-slate-400 border border-slate-200 px-2 py-0.5 rounded-full whitespace-nowrap">หมดเวลา</span>}
                    </div>
                    <div className="flex flex-col gap-2 text-[13px] text-slate-500 font-medium">
                      <div className="flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-slate-200/60 text-slate-600 w-fit"><Calendar size={13} className="mr-1.5"/>{getThaiDay(course.scheduleDay)}</div>
                      <span className="flex items-center ml-1"><Clock size={14} className="mr-2 text-slate-400"/> {course.startTime?.substring(0,5)} - {course.endTime?.substring(0,5)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Modal ส่งใบลา */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl relative p-8 text-slate-800">
            <button onClick={() => setShowLeaveModal(false)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors z-50"><X size={20}/></button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                <FileText size={32} />
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-1">ส่งใบลา</h3>
              <div className="inline-flex items-center justify-center bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full font-bold text-sm border border-blue-100 shadow-sm">
                {activeCourse?.subjectCode} {activeCourse?.subjectName}
              </div>
            </div>

            <div className="space-y-4">
              {/* ประเภทการลา */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">ประเภทการลา</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setLeaveForm(f => ({ ...f, leaveType: 'sick' }))}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm border-2 transition-all ${
                      leaveForm.leaveType === 'sick'
                        ? 'bg-rose-50 border-rose-300 text-rose-600 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    🏥 ลาป่วย
                  </button>
                  <button
                    onClick={() => setLeaveForm(f => ({ ...f, leaveType: 'personal' }))}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm border-2 transition-all ${
                      leaveForm.leaveType === 'personal'
                        ? 'bg-blue-50 border-blue-300 text-blue-600 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    📋 ลากิจ
                  </button>
                </div>
              </div>

              {/* วันที่ลา */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">วันที่ลา</label>
                <input
                  type="date"
                  value={leaveForm.leaveDate}
                  onChange={(e) => setLeaveForm(f => ({ ...f, leaveDate: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium"
                />
              </div>

              {/* เหตุผล */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">เหตุผลการลา</label>
                <textarea
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="กรอกเหตุผลการลา..."
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium resize-none"
                />
              </div>

              {/* แนบรูปภาพ */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">แนบรูปภาพ <span className="text-slate-400 font-medium">(ไม่บังคับ)</span></label>
                {attachmentPreview ? (
                  <div className="relative rounded-xl overflow-hidden border-2 border-slate-200">
                    <img src={attachmentPreview} alt="Preview" className="w-full h-40 object-cover" />
                    <button
                      onClick={() => { setAttachmentImage(null); setAttachmentPreview(null); }}
                      className="absolute top-2 right-2 bg-slate-900/60 text-white p-1.5 rounded-full hover:bg-slate-900/80 transition-colors"
                    >
                      <X size={14} />
                    </button>
                    <div className="absolute bottom-2 left-2 bg-emerald-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                      <CheckCircle size={12} /> แนบรูปแล้ว
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all">
                    <Upload size={24} className="text-slate-300 mb-2" />
                    <span className="text-xs text-slate-400 font-medium">คลิกเพื่ออัปโหลดรูปภาพ</span>
                    <span className="text-[10px] text-slate-300 mt-0.5">เช่น ใบรับรองแพทย์ หรือเอกสารประกอบ</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        if (file.size > 5 * 1024 * 1024) return showAlert('ไฟล์ใหญ่เกินไป', 'กรุณาเลือกรูปภาพขนาดไม่เกิน 5MB');
                        setAttachmentPreview(URL.createObjectURL(file));
                        const reader = new FileReader();
                        reader.onload = (ev) => setAttachmentImage(ev.target.result);
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowLeaveModal(false)}
                className="flex-1 py-3.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSubmitLeave}
                disabled={submittingLeave}
                className="flex-[2] py-3.5 rounded-xl font-extrabold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submittingLeave ? (
                  <><Loader2 size={18} className="animate-spin" /> กำลังส่ง...</>
                ) : (
                  <><Send size={18} /> ส่งใบลา</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCheckInModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl relative p-8 text-slate-800 transform transition-all">
            <button onClick={() => { stopVideo(); setShowCheckInModal(false); }} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors z-50"><X size={20}/></button>
            
            <div className="text-center mb-6">
              <h3 className="text-2xl font-black text-slate-800 mb-2">เช็กชื่อเข้าเรียน</h3>
              <div className="inline-flex items-center justify-center bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full font-bold text-sm border border-blue-100 shadow-sm">
                {activeCourse?.subjectCode} {activeCourse?.subjectName}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-100 aspect-[4/3] rounded-2xl overflow-hidden relative flex flex-col items-center justify-center text-slate-600 mb-8 shadow-inner">
              {scanStep === 0 && (
                <div className="animate-pulse flex flex-col items-center">
                  <div className="w-16 h-16 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mb-3 shadow-inner">
                    <MapPin size={32} />
                  </div>
                  <p className="font-bold text-slate-500">กำลังตรวจสอบพิกัด GPS...</p>
                </div>
              )}
              
              {scanStep === 1 && (
                <>
                  <video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover"/>
                  <div className="absolute inset-0 border-[3px] border-blue-500/50 m-6 rounded-2xl animate-pulse flex items-center justify-center pointer-events-none">
                    <div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-full text-white text-xs font-bold tracking-wide flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-400 rounded-full animate-ping"></span>
                      กำลังวิเคราะห์ใบหน้า...
                    </div>
                  </div>
                </>
              )}
              
              {scanStep === 2 && (
                <div className="absolute inset-0 bg-white flex flex-col items-center justify-center text-center animate-in zoom-in duration-300">
                  <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-4 relative">
                    <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-50"></div>
                    <CheckCircle size={48} className="text-emerald-500 relative z-10" strokeWidth={2.5} />
                  </div>
                  <h4 className="text-2xl font-black text-emerald-600 mb-1">สำเร็จ!</h4>
                  <p className="text-slate-500 font-medium text-sm">ระบบบันทึกการเข้าเรียนเรียบร้อยแล้ว</p>
                </div>
              )}
              
              {scanStep === 3 && (
                <div className="absolute inset-0 bg-white flex flex-col items-center justify-center p-6 text-center animate-in zoom-in duration-300">
                  <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mb-4">
                    <AlertTriangle size={40} className="text-rose-500" strokeWidth={2.5} />
                  </div>
                  <h4 className="text-xl font-black text-rose-600 mb-2">ไม่สำเร็จ</h4>
                  <p className="text-sm text-slate-500 font-medium bg-slate-50 p-3 rounded-lg border border-slate-100">{errorMessage}</p>
                  <button onClick={() => processCheckIn()} className="mt-5 bg-rose-50 hover:bg-rose-100 text-rose-600 px-6 py-2.5 rounded-xl font-bold transition-colors border border-rose-100">ลองใหม่อีกครั้ง</button>
                </div>
              )}
            </div>

            {(scanStep === 2 || scanStep === 3) && (
              <button onClick={() => setShowCheckInModal(false)} className={`w-full py-4 rounded-xl font-extrabold text-white shadow-lg transition-all active:scale-[0.98] ${scanStep === 2 ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/25' : 'bg-slate-800 hover:bg-slate-900 shadow-slate-800/25'}`}>
                {scanStep === 2 ? 'กลับสู่หน้าหลัก' : 'ปิดหน้าต่าง'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}