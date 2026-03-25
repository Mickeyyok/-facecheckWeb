import React, { useState, useRef, useEffect } from 'react';
import { Camera, User, Users, CheckCircle, X } from 'lucide-react';
import * as faceapi from 'face-api.js';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';

export default function Login() {
  const { login } = useAuth();

  // State สำหรับจัดการหน้าฟอร์ม
  const [authMode, setAuthMode] = useState('login'); // 'login', 'register'
  const [authRole, setAuthRole] = useState('student'); // 'student', 'instructor'

  // State สำหรับ Input และ API
  const [identifier, setIdentifier] = useState(''); // รหัสนักศึกษา หรือ อีเมลอาจารย์
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); // ยืนยันรหัสผ่าน
  const [fullName, setFullName] = useState(''); // ชื่อ-สกุล สำหรับสมัครสมาชิก
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // State สำหรับลงทะเบียนใบหน้า (Face Registration)
  const [showFaceRegModal, setShowFaceRegModal] = useState(false);
  const [faceRegStep, setFaceRegStep] = useState(0);
  const [isFaceRegistered, setIsFaceRegistered] = useState(false);

  // State สำหรับ AI กล้อง
  const videoRef = useRef(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [faceDescriptor, setFaceDescriptor] = useState(null); // ตัวเลข 128 ตัว
  const [faceStatus, setFaceStatus] = useState('กำลังเตรียมกล้อง...');
  
  // State สำหรับแสดง Modal สมัครสมาชิกสำเร็จ
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // 1. โหลด AI Models
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
        console.error("โหลดโมเดลไม่สำเร็จ:", err);
      }
    };
    loadModels();
  }, []);

  // 2. จัดการเปิด/ปิดกล้องเมื่อ Modal แสดง
  useEffect(() => {
    let streamRef = null;
    if (showFaceRegModal && faceRegStep === 1) {
      navigator.mediaDevices.getUserMedia({ video: { width: 400, height: 300 } })
        .then((stream) => { 
          streamRef = stream;
          if(videoRef.current) videoRef.current.srcObject = stream; 
          setFaceStatus('กรุณามองตรงมาที่กล้อง ให้อยู่ในกรอบ ');
        })
        .catch((err) => {
          console.error("เปิดกล้องไม่ได้:", err);
          setFaceStatus('เปิดกล้องไม่ได้ กรุณาอนุญาตให้เว็บเข้าถึงกล้อง');
        });
    }
    
    return () => { // ปิดกล้องตอนปิด Modal / เปลี่ยน Step
      if (streamRef) {
        streamRef.getTracks().forEach(track => track.stop());
      }
    }
  }, [showFaceRegModal, faceRegStep]);

  const isStudent = authRole === 'student';

  const handleStartFaceReg = () => {
    setShowFaceRegModal(true);
    setFaceRegStep(0);
    
    if (!modelsLoaded) {
       setFaceStatus('กำลังโหลด AI Models...');
       setTimeout(() => setFaceRegStep(1), 1500);
    } else {
       setFaceRegStep(1); // เปิดกล้องเลย
    }
  };

  // 3. ฟังก์ชันสแกนและดึง 128 ตัวเลข
  const handleScanFace = async () => {
    if (!modelsLoaded || !videoRef.current) return;
    
    setFaceStatus('กำลังประมวลผลใบหน้า....');
    const detection = await faceapi.detectSingleFace(
      videoRef.current, 
      new faceapi.TinyFaceDetectorOptions()
    ).withFaceLandmarks().withFaceDescriptor();

    if (detection) {
      setFaceDescriptor(Array.from(detection.descriptor)); // ได้ตัวเลข 128 ตัว!
      setFaceRegStep(3); // ทะลุไปหน้า Success!!
      setIsFaceRegistered(true);
    } else {
      setFaceStatus('หาใบหน้าไม่เจอ! ลองขยับมาใกล้ๆ และมองตรง');
    }
  };

  // ตรวจสอบความแข็งแรงรหัสผ่าน
  const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setError(''); // ล้าง Error เก่าก่อนทุกครั้ง

    if (authMode === 'register') {
      // ตรวจสอบรหัสนักศึกษา 13 หลัก
      if (isStudent && !/^\d{13}$/.test(identifier)) {
        setError('รหัสนักศึกษาต้องเป็นตัวเลข 13 หลักเท่านั้น');
        return;
      }
      // ตรวจสอบความแข็งแรงรหัสผ่าน
      if (!passwordRegex.test(password)) {
        setError('รหัสผ่านต้องมีอย่างน้อย 8 ตัว มีพิมพ์ใหญ่อย่างน้อย 1 ตัว และอักษรพิเศษอย่างน้อย 1 ตัว');
        return;
      }
      // ตรวจสอบรหัสผ่านตรงกัน
      if (password !== confirmPassword) {
        setError('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
        return;
      }
      // ตรวจสอบ Face ID สำหรับนักศึกษา
      if (isStudent && !faceDescriptor) {
        alert('กรุณาลงทะเบียนข้อมูลใบหน้า (Face ID) ให้เรียบร้อยก่อนกดสมัครสมาชิกครับ');
        return;
      }
    }

    try {
      setIsLoading(true);
      
      if (authMode === 'register') {
        // แอบสร้างอีเมลจำลองให้นักศึกษา เพื่อไม่ให้ Backend พัง (เพราะ DB บังคับใส่ Email)
        const emailToSend = !isStudent ? identifier : `${identifier}@utcc.ac.th`;

        const userData = {
          role: authRole === 'instructor' ? 'teacher' : 'student',
          email: emailToSend,
          studentId: isStudent ? identifier : null,
          password: password,
          fullName: fullName,
          faceDescriptor: faceDescriptor ? faceDescriptor : []
        };
        await authService.register(userData);
        
        // เมื่อสมัครสำเร็จ ให้เปิด Modal แทน alert
        setShowSuccessModal(true);
      } else {
        // จัดข้อมูลตอน ล็อกอิน ตาม Role
        let loginData = { password: password };
        if (isStudent) {
          loginData.studentId = identifier; // ถ้าเป็นนักศึกษา ส่งรหัสนักศึกษา
        } else {
          loginData.email = identifier; // ถ้าเป็นอาจารย์ ส่งอีเมล
        }

        // ยิง API ไปหา Spring Boot จริงๆ
        const response = await authService.login(loginData);
        // ถ้าสำเร็จ → เซ็ต user ใน AuthContext แล้วพาไป Dashboard
        login(response.user.role, { id: response.user.id, name: response.user.fullName || response.user.name });
      }
    } catch (err) {
      setError(err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center font-sans selection:bg-blue-100">
      <div className="bg-white w-full h-screen flex overflow-hidden relative">

        {/* Left Side: Branding */}
        <div className={`hidden md:flex w-1/2 p-12 text-white flex-col justify-center items-center relative overflow-hidden transition-colors duration-500 bg-[#1a237e] `}>
          <img src="/src/assets/UTCC-Official-1.png" alt="UTCC Logo" className="mb-6 w-45 h-45 object-contain relative z-10 drop-shadow-md" />
          <h1 className="text-4xl font-extrabold mb-3 tracking-tight relative z-10">FaceCheck UTCC</h1>
          <p className="text-center text-white/80 text-[15px] font-medium relative z-10 leading-relaxed">
            {authMode === 'login'
              ? 'ระบบเช็กชื่อด้วยใบหน้าและพิกัด\nUTCC Smart System'
              : 'กรุณาลงทะเบียนเเละสเเกนใบหน้าเพื่อใช้งานระบบ'}
          </p>
          {/* พื้นหลังตกแต่ง */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-black opacity-10 rounded-full blur-2xl -ml-10 -mb-10"></div>
        </div>

        {/* Right Side: Form */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col bg-white overflow-y-auto relative justify-center">
          <div className="max-w-md w-full mx-auto animate-in fade-in duration-300">

            {/* Header */}
            <div className="mb-8 text-center md:text-md">
              <h2 className="title-login font-default-40-48 mb-4">
                {authMode === 'login' ? 'เข้าสู่ระบบ' : 'สร้างบัญชีใหม่'}
              </h2>
              <p className="subtitle-login font-default-20-32 ">
                {authMode === 'login' ? 'โปรดป้อนรหัสประจำตัวและรหัสผ่าน' : 'ลงทะเบียนเพื่อเริ่มต้นใช้งานระบบ'}
              </p>
            </div>

            {/* Role Toggle */}
            <div className="flex p-1 bg-slate-100 rounded-xl mb-6 border border-slate-200">
              <button
                type="button"
                onClick={() => setAuthRole('student')}
                className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${isStudent ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <User size={20} color={isStudent ? '#1a237e' : '#64748b'} />
                <span style={isStudent ? { color: '#1a237e' } : {}}>นักศึกษา</span>
              </button>
              <button
                type="button"
                onClick={() => setAuthRole('instructor')}
                className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${!isStudent ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Users size={20} color={!isStudent ? '#1a237e' : '#64748b'} />
                <span style={!isStudent ? { color: '#1a237e' } : {}}>อาจารย์ผู้สอน</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode === 'register' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">ชื่อ - สกุล</label>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="เช่น นาย กฤษณะ สุริยวงษ์" required className={`w-full px-4 py-3 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 transition-all text-sm ${isStudent ? 'focus:border-blue-500 focus:ring-blue-200' : 'focus:border-purple-500 focus:ring-purple-200'}`} />
                </div>
              )}

              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 delay-75">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">{isStudent ? 'รหัสนักศึกษา' : 'อีเมลมหาวิทยาลัย'}</label>
                {isStudent ? (
                  <input
                    type="text"
                    inputMode="numeric"
                    value={identifier}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 13);
                      setIdentifier(val);
                    }}
                    placeholder="กรอกเลข 13 หลัก"
                    maxLength={13}
                    required
                    className={`w-full px-4 py-3 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 transition-all text-sm ${isStudent ? 'focus:border-blue-500 focus:ring-blue-200' : 'focus:border-purple-500 focus:ring-purple-200'}`}
                  />
                ) : (
                  <input
                    type="email"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="instructor@utcc.ac.th"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 transition-all text-sm focus:border-purple-500 focus:ring-purple-200"
                  />
                )}
                {authMode === 'register' && isStudent && (
                  <p className="text-xs text-slate-400 mt-1">กรอกเฉพาะตัวเลข 13 หลัก</p>
                )}
              </div>
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 delay-150">
                <div className="flex justify-between items-end mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">รหัสผ่าน</label>
                  {authMode === 'login' && <a href="#" className={`text-xs font-bold hover:underline text-[#1a237e]`}>ลืมรหัสผ่าน?</a>}
                </div>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required className={`w-full px-4 py-3 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 transition-all text-sm tracking-widest ${isStudent ? 'focus:border-blue-500 focus:ring-blue-200' : 'focus:border-purple-500 focus:ring-purple-200'}`} />
                {authMode === 'register' && (
                  <p className="text-xs text-slate-400 mt-1">ต้องมีอย่างน้อย 8 ตัว, พิมพ์ใหญ่ 1 ตัว และอักษรพิเศษ 1 ตัว (เช่น !@#$)</p>
                )}
              </div>

              {/* ช่องยืนยันรหัสผ่าน (แสดงเฉพาะตอนสมัครสมาชิก) */}
              {authMode === 'register' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 delay-200">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">ยืนยันรหัสผ่าน</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className={`w-full px-4 py-3 rounded-xl border transition-all text-sm tracking-widest focus:outline-none focus:ring-2 ${
                      confirmPassword && confirmPassword !== password
                        ? 'border-red-400 focus:ring-red-200 bg-red-50'
                        : confirmPassword && confirmPassword === password
                        ? 'border-green-400 focus:ring-green-200 bg-green-50'
                        : `border-slate-300 bg-white ${isStudent ? 'focus:border-blue-500 focus:ring-blue-200' : 'focus:border-purple-500 focus:ring-purple-200'}`
                    }`}
                  />
                  {confirmPassword && confirmPassword !== password && (
                    <p className="text-xs text-red-500 mt-1">รหัสผ่านไม่ตรงกัน</p>
                  )}
                  {confirmPassword && confirmPassword === password && (
                    <p className="text-xs text-green-600 mt-1">✓ รหัสผ่านตรงกัน</p>
                  )}
                </div>
              )}

              {/* กรอบลงทะเบียนใบหน้า (แสดงเฉพาะตอนสมัครสมาชิก และเป็นนักศึกษา) */}
              {authMode === 'register' && isStudent && (
                <div className="pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300 delay-200">
                  {!isFaceRegistered ? (
                    <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-5 text-center hover:bg-slate-100 transition-colors">
                      <div className="w-10 h-10 rounded-full mx-auto flex items-center justify-center mb-2 bg-blue-100 text-blue-600"><Camera size={20} /></div>
                      <p className="text-sm font-bold text-slate-800 mb-1">ลงทะเบียนข้อมูลใบหน้า (Face ID)</p>
                      <p className="text-xs text-slate-500 mb-3">จำเป็นต้องใช้ใบหน้าเพื่อเช็กชื่อเข้าเรียน</p>
                      <button onClick={handleStartFaceReg} type="button" className="text-sm font-bold px-4 py-2 rounded-lg border border-blue-200 bg-white text-blue-600 hover:bg-blue-50 transition-colors shadow-sm">+ สแกนใบหน้าตอนนี้</button>
                    </div>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center animate-in zoom-in-95">
                      <div className="w-10 h-10 rounded-full mx-auto flex items-center justify-center mb-2 bg-green-100 text-green-600 shadow-sm"><CheckCircle size={24} strokeWidth={2.5} /></div>
                      <p className="text-sm font-bold text-green-800 mb-1">ลงทะเบียนใบหน้าสำเร็จ</p>
                      <p className="text-xs text-green-600">ข้อมูลถูกบันทึกเข้าระบบเรียบร้อยแล้ว</p>
                    </div>
                  )}
                </div>
              )}

              {/* แสดง Error จาก Backend */}
              {error && (
                <p className="text-red-500 text-sm font-medium text-center bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 animate-in fade-in">
                  {error}
                </p>
              )}

              <button type="submit" disabled={isLoading}
                className="w-full mt-2 py-3.5 rounded-xl font-bold text-white shadow-sm transition-all active:scale-95 flex justify-center items-center disabled:opacity-70 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#1a237e' }}>
                {isLoading ? 'กำลังตรวจสอบ...' : (authMode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก')}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-500 animate-in fade-in duration-500">
              {authMode === 'login' ? (
                <p>
                  ยังไม่มีบัญชีใช่ไหม?{' '}
                  <button
                    type="button"
                    onClick={() => { setAuthMode('register'); setIsFaceRegistered(false); }}
                    className="font-bold hover:underline"
                    style={{ color: '#1a237e' }}
                  >
                    สมัครสมาชิก
                  </button>
                </p>
              ) : (
                <p>
                  มีบัญชีอยู่แล้ว?{' '}
                  <button
                    type="button"
                    onClick={() => setAuthMode('login')}
                    className="font-bold hover:underline"
                    style={{ color: '#1a237e' }}
                  >
                    เข้าสู่ระบบ
                  </button>
                </p>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Modal Face Registration */}
      {showFaceRegModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-300 border border-white/20">
            {faceRegStep !== 3 && <button onClick={() => setShowFaceRegModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 z-10 bg-white/50 rounded-full p-1.5 transition-colors"><X size={24} strokeWidth={2.5} /></button>}
            <div className="p-10">
              <h3 className="text-[26px] font-black text-center mb-1 text-slate-800 tracking-tight">ลงทะเบียนใบหน้า</h3>
              <p className="text-center text-slate-500 font-medium text-sm mb-8">ขยับใบหน้าให้อยู่ในกรอบที่กำหนด</p>

              <div className="bg-slate-900 aspect-[3/4] sm:aspect-square rounded-[2rem] overflow-hidden relative flex flex-col items-center justify-center text-white mb-6 shadow-inner border border-slate-800">
                {faceRegStep === 0 && (
                  <div className="flex flex-col items-center animate-pulse">
                    <div className="bg-blue-500/20 p-5 rounded-full mb-4 shadow-[0_0_20px_rgba(59,130,246,0.3)]"><Camera size={40} className="text-blue-400" /></div>
                    <p className="font-bold tracking-wide">กำลังเตรียมกล้อง...</p>
                  </div>
                )
                }
                {faceRegStep === 1 && (
                  <>
                    <video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-90 scale-105" />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-48 h-64 border-[4px] border-blue-400 rounded-[100px] shadow-[0_0_30px_rgba(96,165,250,0.5)]"></div>
                    </div>
                  </>
                )}
                {faceRegStep === 3 && (
                  <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 absolute inset-0 flex flex-col items-center justify-center">
                    <div className="bg-white/20 p-5 rounded-full mb-4 shadow-lg backdrop-blur-sm"><CheckCircle size={56} className="text-white" strokeWidth={2.5} /></div>
                    <h4 className="text-4xl font-black text-white mb-2 tracking-tight">สำเร็จ!</h4>
                    <p className="text-emerald-50 font-bold">ระบบจดจำใบหน้าเรียบร้อย</p>
                  </div>
                )}
              </div>

              {/* ส่วนที่ย้ายออกมาด้านนอกกรอบกล้อง */}
              {faceRegStep === 1 && (
                <div className="flex flex-col items-center mb-4">
                  <div className="w-full px-5 py-3 rounded-xl text-sm font-bold tracking-wide bg-blue-50 text-[#1a237e] border border-blue-200 mb-3 text-center shadow-sm">
                    {faceStatus}
                  </div>
                  <button type="button" onClick={handleScanFace} className="bg-[#1a237e] hover:opacity-90 text-white font-bold py-3 px-8 rounded-2xl shadow-xl transition-all active:scale-95 w-full text-lg">
                    สแกนใบหน้า
                  </button>
                </div>
              )}

              {faceRegStep === 3 && <button onClick={() => setShowFaceRegModal(false)} className="w-full mt-2 bg-[#1a237e] text-white py-4 rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-xl active:scale-95">ดำเนินการต่อ</button>}
            </div>
          </div>
        </div>
      )}

      {/* Modal สมัครสมาชิกสำเร็จ */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl relative p-8 text-center animate-in zoom-in-95 duration-300">
            <div className="w-24 h-24 rounded-full mx-auto flex items-center justify-center mb-6 bg-green-50 text-green-500 shadow-[0_0_20px_rgba(34,197,94,0.2)]">
              <CheckCircle size={48} strokeWidth={2.5} />
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">
              สมัครสมาชิกสำเร็จ!
            </h3>
            <p className="text-slate-500 font-medium mb-8 text-sm leading-relaxed">
              บัญชีของคุณถูกสร้างเรียบร้อยแล้ว <br /> 
              กรุณาเข้าสู่ระบบเพื่อเริ่มต้นใช้งาน FaceCheck
            </p>
            <button
              type="button"
              onClick={() => {
                setShowSuccessModal(false);
                setAuthMode('login');
                setPassword('');
                setConfirmPassword('');
                setIsFaceRegistered(false);
                setFaceDescriptor(null); 
              }}
              className="w-full text-white font-bold py-4 rounded-2xl shadow-xl transition-all active:scale-95 text-lg hover:opacity-90 bg-[#1a237e]"
            >
              ไปหน้าเข้าสู่ระบบ
            </button>
          </div>
        </div>
      )}

    </div>
  );
}