import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, User, Users, CheckCircle, X, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import * as faceapi from 'face-api.js';
import Swal from 'sweetalert2';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import utccLogo from '../../assets/UTCC-Official-1.png';

// ─────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STUDENT_ID_RE = /^\d{13}$/;

/** คำนวณความแข็งแกร่งของรหัสผ่าน 0–4 */
function getPasswordStrength(pw) {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

const strengthMeta = [
  { label: 'อ่อนมาก', color: '#ef4444' },
  { label: 'อ่อน',    color: '#f97316' },
  { label: 'พอใช้',   color: '#eab308' },
  { label: 'ดี',      color: '#22c55e' },
  { label: 'แข็งแกร่ง', color: '#15803d' },
];

// ─────────────────────────────────────────
//  Component
// ─────────────────────────────────────────
export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  // --- 1. States ---
  const [authMode, setAuthMode] = useState('login');
  const [authRole, setAuthRole] = useState('student');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Face Registration States
  const [showFaceRegModal, setShowFaceRegModal] = useState(false);
  const [faceRegStep, setFaceRegStep] = useState(0);
  const [isFaceRegistered, setIsFaceRegistered] = useState(false);
  const [currentPoseIndex, setCurrentPoseIndex] = useState(0);
  const [poseDescriptors, setPoseDescriptors] = useState({});
  const [faceDescriptor, setFaceDescriptor] = useState(null);

  // AI & Camera States
  const videoRef = useRef(null);
  const detectionLoopRef = useRef(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [faceStatus, setFaceStatus] = useState('กำลังเตรียมกล้อง...');
  const [isPoseCorrect, setIsPoseCorrect] = useState(false);

  const poses = ['straight', 'left', 'right', 'up'];
  const poseTexts = {
    straight: 'มองตรงมาที่กล้อง',
    left: 'หันหน้าไปทางซ้าย',
    right: 'หันหน้าไปทางขวา',
    up: 'เงยหน้าขึ้นเล็กน้อย',
  };

  const pwStrength = getPasswordStrength(password);
  const pwMeta = strengthMeta[pwStrength];

  // --- Reset form เมื่อสลับ mode/role ---
  const resetForm = useCallback(() => {
    setIdentifier('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setError('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setIsFaceRegistered(false);
    setFaceDescriptor(null);
    setPoseDescriptors({});
    setCurrentPoseIndex(0);
    setFaceRegStep(0);
  }, []);

  const switchMode = (mode) => { setAuthMode(mode); resetForm(); };
  const switchRole = (role) => { setAuthRole(role); resetForm(); };

  // --- 2. Face API Models ---
  useEffect(() => {
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
        ]);
        setModelsLoaded(true);
      } catch (err) {
        console.error('โหลดโมเดลไม่สำเร็จ:', err);
      }
    };
    loadModels();
  }, []);

  // --- 3. Face Detection Loop ---
  const checkPoseFromLandmarks = (landmarks, requiredPose) => {
    const pts = landmarks.positions;
    const nose = pts[30];
    const faceW = Math.abs(pts[16].x - pts[0].x);
    const centerX = (pts[0].x + pts[16].x) / 2;
    const centerY = (pts[27].y + pts[8].y) / 2;
    const yaw = (nose.x - centerX) / faceW;
    const pitch = (nose.y - centerY) / Math.abs(pts[8].y - pts[27].y);
    switch (requiredPose) {
      case 'straight': return Math.abs(yaw) < 0.35 && Math.abs(pitch) < 0.35;
      case 'left':  return yaw < -0.05;
      case 'right': return yaw > 0.05;
      case 'up':    return pitch < -0.05;
      default:      return false;
    }
  };

  useEffect(() => {
    let streamRef = null;
    let active = true;

    const runDetectionLoop = async (requiredPose) => {
      if (!active || !videoRef.current || !modelsLoaded) return;
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks();
      if (!active) return;
      if (detection) {
        const ok = checkPoseFromLandmarks(detection.landmarks, requiredPose);
        setIsPoseCorrect(ok);
        setFaceStatus(ok ? `✅ พร้อมสแกน!` : `👉 ${poseTexts[requiredPose]}`);
      } else {
        setIsPoseCorrect(false);
        setFaceStatus('ไม่พบใบหน้า กรุณาเข้ามาในกรอบ');
      }
      detectionLoopRef.current = setTimeout(() => runDetectionLoop(requiredPose), 100);
    };

    if (showFaceRegModal && faceRegStep === 1) {
      navigator.mediaDevices
        .getUserMedia({ video: { width: 400, height: 300 } })
        .then((stream) => {
          streamRef = stream;
          if (videoRef.current) videoRef.current.srcObject = stream;
          setTimeout(() => { if (active) runDetectionLoop(poses[currentPoseIndex]); }, 500);
        })
        .catch(() => setFaceStatus('เปิดกล้องไม่ได้ กรุณาตรวจสอบสิทธิ์'));
    }

    return () => {
      active = false;
      clearTimeout(detectionLoopRef.current);
      if (streamRef) streamRef.getTracks().forEach((t) => t.stop());
    };
  }, [showFaceRegModal, faceRegStep, currentPoseIndex, modelsLoaded]);

  // --- 4. Event Handlers ---
  const handleStartFaceReg = () => {
    setShowFaceRegModal(true);
    setFaceRegStep(1);
    setCurrentPoseIndex(0);
    setPoseDescriptors({});
    setFaceStatus('กำลังเตรียมกล้อง...');
  };

  const handleCapturePose = async () => {
    if (!modelsLoaded || !videoRef.current || !isPoseCorrect) return;
    clearTimeout(detectionLoopRef.current);
    setFaceStatus('กำลังประมวลผล...');

    const detection = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (detection) {
      const updated = { ...poseDescriptors, [poses[currentPoseIndex]]: Array.from(detection.descriptor) };
      setPoseDescriptors(updated);
      if (currentPoseIndex < poses.length - 1) {
        setCurrentPoseIndex((prev) => prev + 1);
      } else {
        const finalArray = poses.map((p) => updated[p]);
        setFaceDescriptor(finalArray);
        setFaceRegStep(3);
        setIsFaceRegistered(true);
      }
    }
  };

  // Validation
  const validate = () => {
    const isStudent = authRole === 'student';

    if (authMode === 'register') {
      if (!fullName.trim()) return 'กรุณากรอกชื่อ - นามสกุล';
      if (isStudent && !STUDENT_ID_RE.test(identifier))
        return 'รหัสนักศึกษาต้องเป็นตัวเลข 13 หลัก';
      if (!isStudent && !EMAIL_RE.test(identifier))
        return 'รูปแบบอีเมลไม่ถูกต้อง';
      if (password.length < 8) return 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร';
      if (password !== confirmPassword) return 'รหัสผ่านไม่ตรงกัน';
      if (isStudent && !isFaceRegistered) return 'กรุณาลงทะเบียนใบหน้าให้ครบ 4 มุม';
    } else {
      // login validation
      if (isStudent && identifier && !STUDENT_ID_RE.test(identifier))
        return 'รหัสนักศึกษาต้องเป็นตัวเลข 13 หลัก';
      if (!isStudent && identifier.trim().length > 0 && !EMAIL_RE.test(identifier))
        return 'รูปแบบอีเมลไม่ถูกต้อง';
    }
    return null;
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const isStudent = authRole === 'student';

    try {
      setIsLoading(true);

      if (authMode === 'register') {
        // นักศึกษา: username = รหัสนักศึกษา | อาจารย์: username = ตั้งเอง
        const userData = {
          role: authRole,
          username: identifier.trim(),
          password,
          fullName,
          faceDescriptor: faceDescriptor || [],
        };
        await authService.register(userData);

        await Swal.fire({
          icon: 'success',
          title: 'สร้างบัญชีสำเร็จ!',
          text: 'บัญชีของคุณพร้อมใช้งานแล้ว โปรดเข้าสู่ระบบเพื่อเริ่มใช้งาน',
          confirmButtonText: 'เข้าสู่ระบบ',
          confirmButtonColor: '#1a237e',
          customClass: { popup: 'rounded-3xl' },
        });
        switchMode('login');

      } else {
        // ใช้ username ทั้งนักศึกษาและอาจารย์ (นักศึกษาส่งรหัสนักศึกษาเป็น username)
        const loginData = { username: identifier.trim(), password };
        const response = await authService.login(loginData);

        // รองรับ response structure หลายรูปแบบ
        const userData  = response.user  || response;
        const tokenData = response.token || response.accessToken || null;

        login(userData, tokenData);

        // React Router navigate (ไม่ reload หน้า)
        const role = userData.role || authRole;
        navigate(role === 'student' ? '/student' : '/teacher', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setIsLoading(false);
    }
  };

  // --- 5. Render ---
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center font-sans selection:bg-blue-100">
      <div className="bg-white w-full h-screen flex overflow-hidden relative shadow-2xl">

        {/* Left Branding */}
        <div className="hidden md:flex w-1/2 p-12 text-white flex-col justify-center items-center bg-[#1a237e] relative overflow-hidden">
          <img src={utccLogo} alt="Logo" className="mb-6 w-44 object-contain z-10 drop-shadow-lg" />
          <h1 className="text-4xl font-black z-10 tracking-tight">FaceCheck UTCC</h1>
          <p className="z-10 mt-4 opacity-80 text-center font-medium">Smart Attendance &amp; Geo-Location System</p>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl -ml-10 -mb-10" />
        </div>

        {/* Right Form */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-white overflow-y-auto">
          <div className="max-w-md w-full mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-black text-slate-800">
                {authMode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
              </h2>
              <p className="text-slate-500 mt-2 font-medium">
                {authMode === 'login' ? 'ยินดีต้อนรับกลับเข้าสู่ระบบ' : 'สร้างบัญชีเพื่อเริ่มต้นใช้งาน'}
              </p>
            </div>

            {/* Role Toggle */}
            <div className="flex p-1 bg-slate-100 rounded-2xl mb-8 border border-slate-200">
              <button
                type="button"
                onClick={() => switchRole('student')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                  authRole === 'student' ? 'bg-white text-[#1a237e] shadow-md' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <User size={18} /><span>นักศึกษา</span>
              </button>
              <button
                type="button"
                onClick={() => switchRole('teacher')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                  authRole === 'teacher' ? 'bg-white text-[#1a237e] shadow-md' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Users size={18} /><span>อาจารย์</span>
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-5">
              {/* ชื่อ (register เท่านั้น) */}
              {authMode === 'register' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 ml-1">ชื่อ - นามสกุล</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="เช่น นายสมชาย ใจดี"
                    required
                    className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 focus:border-[#1a237e] focus:ring-4 focus:ring-blue-50 outline-none transition-all"
                  />
                </div>
              )}

              {/* รหัสนักศึกษา / username */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 ml-1">
                  {authRole === 'student' ? 'รหัสนักศึกษา' : 'อีเมล (Email)'}
                </label>
                <input
                  type={authRole === 'student' ? 'text' : 'email'}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={authRole === 'student' ? 'ระบุ 13 หลัก' : 'เช่น teacher@utcc.ac.th'}
                  required
                  inputMode={authRole === 'student' ? 'numeric' : 'email'}
                  maxLength={authRole === 'student' ? 13 : undefined}
                  className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 focus:border-[#1a237e] focus:ring-4 focus:ring-blue-50 outline-none transition-all"
                />
              </div>

              {/* รหัสผ่าน */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 ml-1">รหัสผ่าน</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 focus:border-[#1a237e] focus:ring-4 focus:ring-blue-50 outline-none transition-all tracking-widest"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#1a237e] transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                {/* Password Strength (แสดงเฉพาะตอน register) */}
                {authMode === 'register' && password.length > 0 && (
                  <div className="pt-1 space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((lvl) => (
                        <div
                          key={lvl}
                          className="h-1.5 flex-1 rounded-full transition-all duration-300"
                          style={{ backgroundColor: pwStrength >= lvl ? pwMeta.color : '#e2e8f0' }}
                        />
                      ))}
                    </div>
                    <p className="text-xs ml-1 font-semibold" style={{ color: pwMeta.color }}>
                      <ShieldCheck size={11} className="inline mr-1 mb-0.5" />
                      ความแข็งแกร่ง: {pwMeta.label}
                      {pwStrength < 2 && ' — แนะนำให้เพิ่มตัวพิมพ์ใหญ่และตัวเลข'}
                    </p>
                  </div>
                )}
              </div>

              {/* ยืนยันรหัสผ่าน + Face (register เท่านั้น) */}
              {authMode === 'register' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 ml-1">ยืนยันรหัสผ่าน</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 focus:border-[#1a237e] focus:ring-4 focus:ring-blue-50 outline-none transition-all tracking-widest"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#1a237e] transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                    {/* realtime mismatch hint */}
                    {confirmPassword && confirmPassword !== password && (
                      <p className="text-xs text-red-500 ml-1 font-medium">รหัสผ่านไม่ตรงกัน</p>
                    )}
                    {confirmPassword && confirmPassword === password && (
                      <p className="text-xs text-green-600 ml-1 font-medium">✓ รหัสผ่านตรงกัน</p>
                    )}
                  </div>

                  {/* Face ID (นักศึกษาเท่านั้น) */}
                  {authRole === 'student' && (
                    <div className="pt-2">
                      {!isFaceRegistered ? (
                        <button
                          onClick={handleStartFaceReg}
                          type="button"
                          className="w-full py-4 border-2 border-dashed border-blue-200 rounded-2xl text-[#1a237e] font-bold hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                        >
                          <Camera size={20} />ลงทะเบียนใบหน้า (Face ID)
                        </button>
                      ) : (
                        <div className="bg-green-50 text-green-700 p-4 rounded-2xl text-center font-bold border border-green-200 flex items-center justify-center gap-2">
                          <CheckCircle size={20} />สแกนใบหน้าครบ 4 มุมแล้ว
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Error Message */}
              {error && (
                <div className="text-red-500 text-sm text-center bg-red-50 py-3 rounded-xl font-medium">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 rounded-2xl font-bold text-white bg-[#1a237e] hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-blue-900/20 mt-4"
              >
                {isLoading
                  ? 'กำลังประมวลผล...'
                  : authMode === 'login' ? 'เข้าสู่ระบบ' : 'สร้างบัญชีผู้ใช้'}
              </button>
            </form>

            <div className="mt-10 text-center">
              <button
                onClick={() => switchMode(authMode === 'login' ? 'register' : 'login')}
                className="text-slate-500 font-medium hover:text-[#1a237e] transition-colors"
              >
                {authMode === 'login'
                  ? <span>ยังไม่มีบัญชี? <span className="font-bold text-[#1a237e] underline">สมัครสมาชิก</span></span>
                  : <span>มีบัญชีอยู่แล้ว? <span className="font-bold text-[#1a237e] underline">เข้าสู่ระบบที่นี่</span></span>
                }
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Face Registration Modal ─── */}
      {showFaceRegModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 text-center relative shadow-2xl">
            {faceRegStep !== 3 && (
              <button
                onClick={() => setShowFaceRegModal(false)}
                className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={24} />
              </button>
            )}
            <h3 className="text-2xl font-black mb-2 text-slate-800">
              สแกนใบหน้า ({Math.min(currentPoseIndex + 1, 4)}/4)
            </h3>
            <p className="text-slate-500 mb-6 text-sm font-medium">สแกนใบหน้าให้ครบทุกมุมเพื่อความแม่นยำ</p>
            <div className="aspect-square bg-slate-100 rounded-[2rem] mb-6 overflow-hidden relative shadow-inner border-4 border-slate-50">
              {faceRegStep === 1 && (
                <>
                  <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
                  <div className="absolute inset-0 border-[4px] border-blue-400/40 rounded-full m-10 pointer-events-none" />
                </>
              )}
              {faceRegStep === 3 && (
                <div className="h-full flex flex-col items-center justify-center bg-emerald-500 text-white">
                  <CheckCircle size={80} strokeWidth={2.5} className="mb-4" />
                  <p className="font-black text-2xl tracking-tight">ลงทะเบียนสำเร็จ!</p>
                </div>
              )}
            </div>
            <p className="text-center font-bold text-blue-600 mb-8 bg-blue-50 py-2 rounded-xl">{faceStatus}</p>
            {faceRegStep === 1 && (
              <button
                onClick={handleCapturePose}
                disabled={!isPoseCorrect}
                className={`w-full py-4 rounded-2xl font-bold text-white transition-all shadow-xl ${
                  isPoseCorrect ? 'bg-[#1a237e] hover:shadow-blue-900/40' : 'bg-slate-300 cursor-not-allowed'
                }`}
              >
                บันทึกมุม {poses[currentPoseIndex].toUpperCase()}
              </button>
            )}
            {faceRegStep === 3 && (
              <button
                onClick={() => setShowFaceRegModal(false)}
                className="w-full py-4 bg-[#1a237e] text-white rounded-2xl font-bold shadow-xl"
              >
                ดำเนินการต่อ
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}