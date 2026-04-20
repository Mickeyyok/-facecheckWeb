import React, { useState, useEffect, useRef } from 'react';
import { Camera, MapPin, CheckCircle, AlertTriangle, XCircle, Brain, Bell, Clock, X, Calendar, AlertOctagon } from 'lucide-react';
import * as faceapi from 'face-api.js';
import { useAuth } from '../../context/AuthContext';
import { attendanceService } from '../../services/attendanceService';
import { classService } from '../../services/classService';
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

      {showCheckInModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl relative p-6 text-slate-800">
            <button onClick={() => { stopVideo(); setShowCheckInModal(false); }} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><XCircle size={24}/></button>
            <h3 className="text-xl font-bold text-center mb-1">เช็กชื่อเข้าเรียน</h3>
            <p className="text-center text-blue-600 font-medium text-sm mb-4">{activeCourse?.subjectName}</p>
            <div className="bg-slate-900 aspect-[4/3] rounded-xl overflow-hidden relative flex flex-col items-center justify-center text-white mb-6">
              {scanStep === 0 && <div className="animate-pulse flex flex-col items-center"><MapPin size={32} className="text-blue-400 mb-2"/><p>ตรวจสอบพิกัด GPS...</p></div>}
              {scanStep === 1 && <><video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover"/><div className="absolute inset-0 border-2 border-green-400/80 m-8 rounded-xl animate-pulse flex items-center justify-center"><span className="bg-black/60 px-3 py-1 rounded-full text-xs">กำลังวิเคราะห์ใบหน้า...</span></div></>}
              {scanStep === 2 && <div className="bg-green-500 absolute inset-0 flex flex-col items-center justify-center text-white"><CheckCircle size={48} className="mb-2"/><h4>สำเร็จ!</h4></div>}
              {scanStep === 3 && <div className="bg-red-500 absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white"><AlertTriangle size={48} className="mb-2"/><h4>ไม่สำเร็จ</h4><p className="text-sm">{errorMessage}</p><button onClick={() => processCheckIn()} className="mt-4 bg-white text-red-600 px-4 py-2 rounded-lg font-bold">ลองใหม่</button></div>}
            </div>
            {(scanStep === 2 || scanStep === 3) && <button onClick={() => setShowCheckInModal(false)} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold">ปิดหน้าต่าง</button>}
          </div>
        </div>
      )}
    </div>
  );
}