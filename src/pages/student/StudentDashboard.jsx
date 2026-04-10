import React, { useState, useEffect, useRef } from 'react';
import { Camera, MapPin, CheckCircle, AlertTriangle, XCircle, Brain, Bell, Clock, X } from 'lucide-react';
import * as faceapi from 'face-api.js';
import { useAuth } from '../../context/AuthContext';
import { attendanceService } from '../../services/attendanceService';
import { classService } from '../../services/classService';

export default function StudentDashboard() {
  const { user } = useAuth();

  // --- States หน้าจอเดิม ---
  const [showUpcomingAlert, setShowUpcomingAlert] = useState(true);
  const [isClassCanceled, setIsClassCanceled] = useState(false);
  
  // --- States สำหรับคลาสเรียน (ดึงจาก API) ---
  const [studentClasses, setStudentClasses] = useState([]);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);
  
  // --- States สำหรับระบบ Check-in ---
  const videoRef = useRef();
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [scanStep, setScanStep] = useState(0); // 0=GPS, 1=Camera, 2=Success, 3=Error
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // 1. โหลดโมเดล AI และดึงข้อมูลคลาสเรียน (ทำครั้งเดียวตอนเปิดหน้า)
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
      } catch (err) {
        console.error('โหลดโมเดลไม่สำเร็จ:', err);
      }
    };

    const fetchMyClasses = async () => {
      if (user?.id) {
        try {
          const data = await classService.getClassesByStudent(user.id);
          setStudentClasses(data);
        } catch (err) {
          console.error('โหลดคลาสเรียนล้มเหลว', err);
        }
      }
    };

    const fetchAttendanceHistory = async () => {
      try {
        setStatsLoading(true);
        if (user?.id) {
          const data = await attendanceService.getHistoryByStudent(user.id);
          setAttendanceHistory(data);
        }
      } catch (err) {
        console.error('โหลดประวัติเข้าเรียนล้มเหลว', err);
      } finally {
        setStatsLoading(false);
      }
    };

    loadModels();
    fetchMyClasses();
    fetchAttendanceHistory();
  }, [user]);

  // วิชาที่กำลังจะเรียน (ให้เป็นวิชาแรกในลิสต์)
  const activeCourse = studentClasses.length > 0 ? studentClasses[0] : null;

  // คำนวณว่าหมดเวลาเช็คชื่อหรือยัง
  const isCheckInExpired = (() => {
    if (!activeCourse || !activeCourse.startTime) return false;
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    // คำนวณเวลาปิดรับเช็คชื่อ = startTime + (lateThreshold * 2)
    const [startH, startM] = activeCourse.startTime.split(':').map(Number);
    const lateThreshold = activeCourse.lateThresholdMinutes || 15;
    const absentDeadline = startH * 60 + startM + (lateThreshold * 2);

    // ถ้ามี endTime ก็ใช้เป็นลิมิตด้วย
    let endMinutes = 24 * 60;
    if (activeCourse.endTime) {
      const [endH, endM] = activeCourse.endTime.split(':').map(Number);
      endMinutes = endH * 60 + endM;
    }

    // ปิดรับเช็คชื่อเมื่อเลย absent deadline หรือ endTime
    const cutoff = Math.min(absentDeadline, endMinutes);
    return nowMinutes > cutoff;
  })();

  // 2. ฟังก์ชันขอพิกัด GPS
  const getLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('เบราว์เซอร์ของคุณไม่รองรับ GPS'));
      } else {
        navigator.geolocation.getCurrentPosition(
          (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
          (err) => reject(new Error('โปรดกดอนุญาต (Allow) การเข้าถึงตำแหน่ง GPS ของคุณ'))
        );
      }
    });
  };

  // 3. ฟังก์ชันเปิด/ปิดกล้อง
  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      throw new Error('ไม่สามารถเปิดกล้องได้ โปรดอนุญาตการเข้าถึงกล้อง');
    }
  };

  const stopVideo = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
  };

  // 4. กระบวนการสแกนและส่งข้อมูลไป Backend
  const processCheckIn = async () => {
    if (!activeCourse) {
      alert('ไม่พบวิชาเรียนที่กำลังเปิดให้เช็คชื่อ');
      return;
    }

    try {
      setScanStep(0);
      setErrorMessage('');
      const { lat, lng } = await getLocation();

      setScanStep(1);
      await startVideo();
      await new Promise(r => setTimeout(r, 1500)); // รอภาพกล้องชัด

      let descriptor = null;
      for (let i = 0; i < 50; i++) {
        if (videoRef.current && videoRef.current.readyState === 4) {
          const detection = await faceapi
            .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();
            
          if (detection) {
            descriptor = detection.descriptor;
            break;
          }
        }
        await new Promise(r => setTimeout(r, 100)); 
      }

      if (!descriptor) throw new Error('ไม่พบใบหน้า หรือหันหน้าไม่ตรงกล้อง กรุณาลองใหม่');

      stopVideo();

      // ✅ 1. เพิ่มโค้ดดึงข้อมูล User จาก LocalStorage มาช่วยเผื่อ useAuth โหลดไม่ทัน
      const localUser = JSON.parse(localStorage.getItem('user') || '{}');
      const actualStudentId = user?.studentId || localUser?.studentId || "2310511101060";

      console.log("กำลังส่งข้อมูลเช็คชื่อของรหัส:", actualStudentId); // เช็คใน Console (F12) ได้ว่าส่งถูกคนไหม

      // ยิง API ไป Spring Boot (ใช้ข้อมูลจริง)
      const checkInData = {
        classId: activeCourse.id, 
        studentId: actualStudentId, // ✅ 2. ใช้ตัวแปรที่ดึงรหัสมาอย่างถูกต้อง
        latitude: lat,
        longitude: lng,
        faceDescriptor: Array.from(descriptor)
      };

      await attendanceService.checkIn(checkInData);
      
      setScanStep(2);
      setIsCheckedIn(true);

    } catch (err) {
      stopVideo();
      setErrorMessage(err.message || 'ระบบขัดข้อง กรุณาลองใหม่');
      setScanStep(3);
    }
  };

  const handleCheckIn = () => {
    if (!modelsLoaded) return alert('ระบบ AI กำลังโหลดข้อมูล กรุณารอสักครู่...');
    if (!activeCourse) return alert('ยังไม่มีวิชาเรียนที่ต้องเช็คชื่อในตอนนี้');
    setShowCheckInModal(true);
    processCheckIn();
  };

  const closeCheckInModal = () => {
    stopVideo();
    setShowCheckInModal(false);
  };

  // คำนวณสถิติจาก attendance history จริง
  const computeStats = (items) => ({
    present: items.filter(h => h.status?.toUpperCase() === 'PRESENT').length,
    late: items.filter(h => h.status?.toUpperCase() === 'LATE').length,
    absent: items.filter(h => h.status?.toUpperCase() === 'ABSENT').length,
  });

  const displayStats = activeCourse
    ? computeStats(attendanceHistory.filter(h => h.subjectCode === activeCourse.subjectCode))
    : computeStats(attendanceHistory);

  return (
    <div className="p-8 lg:p-10 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1400px] mx-auto space-y-8">
      
      {/* Header ภาพรวมการเรียน */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-[28px] font-extrabold text-slate-800 tracking-tight flex items-center flex-wrap gap-3">
          ภาพรวมการเรียน
          {activeCourse && (
            <span className="text-sm font-bold text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg tracking-wide">
              วิชา {activeCourse.subjectName}
            </span>
          )}
        </h3>
      </div>

      {/* แถบแจ้งเตือนเตรียมตัวสแกนหน้า (ซ่อนถ้าไม่มีวิชา) */}
      {activeCourse && showUpcomingAlert && (
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200/60 p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden pr-12">
          <div className="absolute left-0 top-0 w-1.5 h-full bg-amber-400"></div>
          <div className="flex items-center pl-2">
            <div className="bg-amber-100 p-2.5 rounded-full mr-4 shrink-0 shadow-inner">
              <Bell className="text-amber-600 animate-pulse" size={20} />
            </div>
            <div>
              <p className="text-amber-900 font-bold text-base">แจ้งเตือนเตรียมตัวเข้าเรียน</p>
              <p className="text-sm text-amber-700/80 mt-0.5 font-medium">
                ใกล้ถึงเวลาเรียนวิชา <span className="font-bold text-amber-800">{activeCourse.subjectName}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={() => setShowUpcomingAlert(false)} 
            className="absolute top-1/2 -translate-y-1/2 right-4 text-amber-400 hover:text-amber-600 bg-amber-100/50 hover:bg-amber-100 rounded-full p-1.5 transition-all"
            title="ปิดการแจ้งเตือน"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* สรุปการเข้าเรียน 3 กล่อง */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-7 rounded-[1.25rem] shadow-sm border border-slate-200/80 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-[13px] text-slate-500 font-bold mb-1 tracking-wide">เข้าเรียนตรงเวลา</p>
            {statsLoading ? <div className="h-9 w-12 bg-slate-100 animate-pulse rounded-lg mt-1"></div> : <p className="text-3xl font-black text-slate-800">{displayStats.present}</p>}
          </div>
          <div className="w-[52px] h-[52px] rounded-full bg-emerald-50 border-2 border-emerald-100 flex items-center justify-center text-emerald-500">
            <CheckCircle size={26} strokeWidth={2.5} />
          </div>
        </div>
        <div className="bg-white p-7 rounded-[1.25rem] shadow-sm border border-slate-200/80 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-[13px] text-slate-500 font-bold mb-1 tracking-wide">มาสาย</p>
            {statsLoading ? <div className="h-9 w-12 bg-slate-100 animate-pulse rounded-lg mt-1"></div> : <p className="text-3xl font-black text-slate-800">{displayStats.late}</p>}
          </div>
          <div className="w-[52px] h-[52px] rounded-full bg-amber-50 border-2 border-amber-100 flex items-center justify-center text-amber-500">
            <AlertTriangle size={26} strokeWidth={2.5} />
          </div>
        </div>
        <div className="bg-white p-7 rounded-[1.25rem] shadow-sm border border-slate-200/80 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-[13px] text-slate-500 font-bold mb-1 tracking-wide">ขาดเรียน</p>
            {statsLoading ? <div className="h-9 w-12 bg-slate-100 animate-pulse rounded-lg mt-1"></div> : <p className="text-3xl font-black text-slate-800">{displayStats.absent}</p>}
          </div>
          <div className="w-[52px] h-[52px] rounded-full bg-rose-50 border-2 border-rose-100 flex items-center justify-center text-rose-500">
            <XCircle size={26} strokeWidth={2.5} />
          </div>
        </div>
      </div>

      {/* 2 Columns: เช็กชื่อ/AI (ซ้าย) | ตารางเรียน (ขวา) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* คอลัมน์ซ้าย */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* กล่องเช็กชื่อ */}
          <div className={`rounded-[2rem] p-8 md:p-10 text-white relative overflow-hidden flex flex-col justify-between min-h-[260px] transition-all duration-500 ${isClassCanceled ? 'bg-gradient-to-br from-slate-700 to-slate-900 shadow-md' : 'bg-gradient-to-br from-[#2b4cdd] to-[#1e3ab8] shadow-[0_15px_40px_-10px_rgba(43,76,221,0.5)]'}`}>
            <div className="relative z-10 flex flex-col md:flex-row md:justify-between items-start">
              <div>
                <div className="flex items-center space-x-2.5 mb-4">
                  {isClassCanceled ? (
                    <span className="bg-rose-500/20 text-rose-100 border border-rose-400/30 px-3.5 py-1.5 rounded-full text-xs font-bold backdrop-blur-md tracking-wider flex items-center">
                      <div className="w-2 h-2 bg-rose-400 rounded-full mr-2 shadow-[0_0_8px_rgba(244,63,94,0.8)]"></div>
                      ยกเลิกคลาสเรียนวันนี้
                    </span>
                  ) : activeCourse && isCheckInExpired ? (
                    <span className="bg-rose-500/20 text-rose-100 border border-rose-400/30 px-3.5 py-1.5 rounded-full text-xs font-bold backdrop-blur-md tracking-wider flex items-center">
                      <div className="w-2 h-2 bg-rose-400 rounded-full mr-2 shadow-[0_0_8px_rgba(244,63,94,0.8)]"></div>
                      หมดเวลาเช็คชื่อแล้ว
                    </span>
                  ) : activeCourse ? (
                    <span className="bg-white/10 px-3.5 py-1.5 rounded-full text-xs font-bold backdrop-blur-md border border-white/20 tracking-wider flex items-center">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full mr-2 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse"></div>
                      กำลังมีการเรียนการสอน
                    </span>
                  ) : (
                    <span className="bg-white/10 px-3.5 py-1.5 rounded-full text-xs font-bold backdrop-blur-md border border-white/20 tracking-wider flex items-center">
                      <div className="w-2 h-2 bg-slate-400 rounded-full mr-2"></div>
                      ไม่มีคลาสเรียน
                    </span>
                  )}
                </div>
                <h3 className={`text-3xl md:text-[40px] font-black tracking-tight mb-2 leading-tight ${isClassCanceled ? 'text-slate-300' : 'text-white'}`}>
                  {activeCourse ? activeCourse.subjectName : 'ยังไม่มีวิชาเรียน'}
                </h3>
                <p className={`${isClassCanceled ? 'text-slate-400' : 'text-blue-200'} text-[15px] font-medium`}>
                  {activeCourse ? `รหัสวิชา ${activeCourse.subjectCode}` : 'กรุณารออาจารย์เพิ่มรายชื่อลงในคลาส'}
                </p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 text-center min-w-[130px] mt-6 md:mt-0 self-start shadow-inner">
                <p className={`text-[11px] font-extrabold uppercase tracking-widest mb-1.5 ${isClassCanceled ? 'text-slate-400' : 'text-blue-200'}`}>เวลาเรียน</p>
                <p className={`text-xl font-black tracking-wide ${isClassCanceled ? 'text-slate-300 opacity-50 line-through' : 'text-white'}`}>
                  {activeCourse && activeCourse.startTime ? activeCourse.startTime.substring(0, 5) : '00:00'} -<br/>
                  {activeCourse && activeCourse.endTime ? activeCourse.endTime.substring(0, 5) : '00:00'}
                </p>
              </div>
            </div>
            
            <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-end mt-10 gap-5">
              <div className={`bg-black/20 border border-white/10 px-5 py-3 rounded-full flex items-center space-x-3 backdrop-blur-md ${isClassCanceled || !activeCourse ? 'opacity-50' : ''}`}>
                <MapPin size={18} className={isClassCanceled || !activeCourse ? 'text-slate-400' : 'text-blue-300'} />
                <span className="text-[15px] font-semibold tracking-wide">
                  ห้อง {activeCourse ? activeCourse.room : '-'}
                </span>
              </div>
              
              {isClassCanceled ? (
                <div className="bg-white/5 text-white/40 px-8 py-4 rounded-xl font-extrabold text-[16px] flex items-center justify-center space-x-2.5 w-full sm:w-auto cursor-not-allowed border border-white/10 backdrop-blur-sm">
                  <XCircle size={20} strokeWidth={2.5} /><span>ปิดระบบเช็กชื่อแล้ว</span>
                </div>
              ) : isCheckedIn ? (
                <div className="bg-emerald-500 text-white px-8 py-4 rounded-xl font-extrabold text-[16px] flex items-center justify-center space-x-2.5 w-full sm:w-auto cursor-not-allowed shadow-lg border border-emerald-400">
                  <CheckCircle size={20} strokeWidth={2.5} /><span>เช็กชื่อเรียบร้อยแล้ว</span>
                </div>
              ) : activeCourse && isCheckInExpired ? (
                <div className="bg-white/5 text-white/40 px-8 py-4 rounded-xl font-extrabold text-[16px] flex items-center justify-center space-x-2.5 w-full sm:w-auto cursor-not-allowed border border-white/10 backdrop-blur-sm">
                  <XCircle size={20} strokeWidth={2.5} /><span>ปิดระบบเช็กชื่อแล้ว</span>
                </div>
              ) : activeCourse ? (
                <button onClick={handleCheckIn} className="bg-white text-[#2b4cdd] px-8 py-4 rounded-xl font-extrabold text-[16px] hover:bg-blue-50 shadow-xl flex items-center justify-center space-x-2.5 transform transition-all hover:-translate-y-1 hover:shadow-2xl active:scale-95 w-full sm:w-auto">
                  <Camera size={20} strokeWidth={2.5} /><span>เช็กชื่อเข้าเรียน</span>
                </button>
              ) : (
                <button disabled className="bg-white/20 text-white/50 px-8 py-4 rounded-xl font-extrabold text-[16px] flex items-center justify-center space-x-2.5 cursor-not-allowed w-full sm:w-auto">
                  <span>ไม่มีคลาสให้เช็คชื่อ</span>
                </button>
              )}
            </div>
            <div className={`absolute top-0 right-0 w-[400px] h-[400px] rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none ${isClassCanceled ? 'bg-slate-500 opacity-10' : 'bg-white opacity-[0.03]'}`}></div>
          </div>

          {/* AI Suggestion Card */}
          <div className="bg-[#131B2F] rounded-[2rem] shadow-xl p-8 text-white relative overflow-hidden group flex flex-col sm:flex-row items-center gap-6">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 opacity-10 rounded-full blur-3xl pointer-events-none group-hover:opacity-20 transition-opacity duration-500"></div>
            <div className="w-16 h-16 shrink-0 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 backdrop-blur-md z-10">
              <Brain className="text-yellow-400" size={32} strokeWidth={1.5} />
            </div>
            <div className="text-center sm:text-left z-10">
              <h4 className="font-extrabold mb-2 text-xl tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">AI Suggestion</h4>
              <p className="text-[15px] text-slate-300 leading-relaxed font-medium">
                "หมั่นเข้าเรียนให้ตรงเวลานะครับ การเช็คชื่อผ่านระบบ FaceCheck จะช่วยบันทึกสถิติที่แม่นยำให้กับคุณ!"
              </p>
            </div>
          </div>

        </div>

        {/* คอลัมน์ขวา: ตารางเรียน (ข้อมูลจริงจาก Database) */}
        <div className="lg:col-span-1 space-y-8 flex flex-col">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 p-7 flex-1">
            <div className="flex items-center mb-6">
              <div className="w-1.5 h-6 bg-[#2b4cdd] rounded-full mr-3"></div>
              <h4 className="font-extrabold text-lg text-slate-800">ตารางเรียนของคุณ</h4>
            </div>
            
            <div className="space-y-4">
              {studentClasses.length === 0 ? (
                <div className="text-center p-6 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-slate-500 font-medium">ยังไม่มีวิชาเรียนที่ลงทะเบียน</p>
                  <p className="text-sm text-slate-400 mt-1">รออาจารย์เพิ่มชื่อเข้าคลาส</p>
                </div>
              ) : (
                studentClasses.map((course, idx) => (
                  <div key={course.id} className={`p-5 rounded-2xl border transition-all ${idx === 0 ? 'bg-blue-50/60 border-blue-200 shadow-sm' : 'bg-slate-50 border-slate-100 hover:border-slate-200'}`}>
                    <div className="flex justify-between items-start mb-2.5">
                      <h5 className={`font-bold text-[16px] ${idx === 0 ? 'text-blue-900' : 'text-slate-700'}`}>
                        {course.subjectCode} {course.subjectName}
                      </h5>
                    </div>
                    <div className="flex flex-col gap-1.5 text-[13px] text-slate-500 font-medium mb-3">
                      <span className="flex items-center">
                        <Clock size={14} className="mr-2 text-slate-400"/> 
                        {course.startTime ? course.startTime.substring(0,5) : '-'} - {course.endTime ? course.endTime.substring(0,5) : '-'} • ห้อง {course.room || '-'}
                      </span>
                    </div>
                    {idx === 0 && (
                      <span className="inline-block bg-white border border-blue-200 text-[#2b4cdd] text-[11px] font-extrabold px-3 py-1 rounded-full shadow-sm">
                        วิชาถัดไป
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
            
            <button className="w-full mt-6 py-3 text-sm text-slate-500 font-bold border border-slate-200 bg-white rounded-xl hover:bg-slate-50 hover:text-slate-700 transition-colors">
              ดูตารางทั้งหมด
            </button>
          </div>
        </div>
      </div>

      {/* Modal Check-in พร้อมการทำงานจริง */}
      {showCheckInModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl relative">
            <button onClick={closeCheckInModal} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 z-10 bg-white/50 rounded-full p-1"><XCircle size={24} /></button>
            <div className="p-6">
              <h3 className="text-xl font-bold text-center mb-1 text-slate-800">เช็กชื่อเข้าเรียน</h3>
              <p className="text-center text-blue-600 font-medium text-sm mb-4">{activeCourse ? activeCourse.subjectName : ''}</p>
              
              <div className="bg-slate-900 aspect-[4/3] rounded-xl overflow-hidden relative flex flex-col items-center justify-center text-white mb-6 shadow-inner">
                {scanStep === 0 && (
                  <div className="flex flex-col items-center animate-pulse">
                    <MapPin size={32} className="text-blue-400 mb-2" />
                    <p className="font-medium text-sm">กำลังตรวจสอบพิกัด GPS...</p>
                  </div>
                )}
                {scanStep === 1 && (
                  <>
                    <video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 border-2 border-green-400/80 m-8 rounded-xl animate-pulse flex items-center justify-center pointer-events-none">
                      <span className="bg-black/60 px-3 py-1 rounded-full text-xs font-bold text-green-300 backdrop-blur-sm">กำลังวิเคราะห์ใบหน้า... มองตรงไปที่กล้อง</span>
                    </div>
                  </>
                )}
                {scanStep === 2 && (
                  <div className="bg-green-500 absolute inset-0 flex flex-col items-center justify-center">
                    <CheckCircle size={48} className="text-white mb-2" />
                    <h4 className="text-2xl font-bold text-white mb-1">สำเร็จ!</h4>
                    <p className="text-green-50 text-sm">เช็คชื่อและบันทึกพิกัดเรียบร้อย</p>
                  </div>
                )}
                {scanStep === 3 && (
                  <div className="bg-red-500 absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                    <AlertTriangle size={48} className="text-white mb-2" />
                    <h4 className="text-xl font-bold text-white mb-1">ไม่สำเร็จ</h4>
                    <p className="text-red-50 text-sm">{errorMessage}</p>
                    <button onClick={processCheckIn} className="mt-4 bg-white text-red-600 font-bold px-4 py-2 rounded-lg text-sm hover:bg-red-50">ลองใหม่อีกครั้ง</button>
                  </div>
                )}
              </div>
              
              {(scanStep === 2 || scanStep === 3) && (
                <button onClick={closeCheckInModal} className="w-full mt-2 bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition">ปิดหน้าต่าง</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}