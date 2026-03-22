import React, { useState } from 'react';
import { Camera, User, Users, CheckCircle, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const { login } = useAuth();

  // State สำหรับจัดการหน้าฟอร์ม
  const [authMode, setAuthMode] = useState('login'); // 'login', 'register'
  const [authRole, setAuthRole] = useState('student'); // 'student', 'instructor'

  // State สำหรับลงทะเบียนใบหน้า (Face Registration)
  const [showFaceRegModal, setShowFaceRegModal] = useState(false);
  const [faceRegStep, setFaceRegStep] = useState(0);
  const [isFaceRegistered, setIsFaceRegistered] = useState(false);

  const isStudent = authRole === 'student';

  const handleStartFaceReg = () => {
    setShowFaceRegModal(true);
    setFaceRegStep(0);
    setTimeout(() => setFaceRegStep(1), 1500); // ให้มองตรง
    setTimeout(() => setFaceRegStep(2), 3500); // ให้หันซ้ายขวา
    setTimeout(() => {
      setFaceRegStep(3); // สำเร็จ
      setIsFaceRegistered(true);
    }, 5500); 
  };

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    if (authMode === 'register' && isStudent && !isFaceRegistered) {
      alert('กรุณาลงทะเบียนข้อมูลใบหน้า (Face ID) ให้เรียบร้อยก่อนกดสมัครสมาชิกครับ');
      return;
    }
    
    // เรียกใช้ login โดยส่ง role และข้อมูลจำลองชื่อผู้ใช้ไป
    const mockName = isStudent ? 'กฤษณะ สุริยวงษ์' : 'อ. น้ำฝน อัศวเมฆิน';
    login(authRole, { name: mockName });
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans selection:bg-blue-100">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl flex overflow-hidden border border-slate-200 min-h-[600px] relative">
        
        {/* Left Side: Branding */}
        <div className={`hidden md:flex w-1/2 p-12 text-white flex-col justify-center items-center relative overflow-hidden transition-colors duration-500 ${isStudent ? 'bg-blue-600' : 'bg-purple-600'}`}>
          <Camera size={72} className="mb-6 text-white/90 drop-shadow-md relative z-10" strokeWidth={1.5} />
          <h1 className="text-4xl font-extrabold mb-3 tracking-tight relative z-10">FaceCheck</h1>
          <p className="text-center text-white/80 text-[15px] font-medium relative z-10 leading-relaxed">
            {authMode === 'login' 
              ? 'ระบบเช็กชื่อด้วยใบหน้าและพิกัด\nUTCC Smart System'
              : 'ลงทะเบียนใบหน้าครั้งเดียว\nใช้งานได้ตลอดไป ปลอดภัยและแม่นยำ'}
          </p>
          {/* พื้นหลังตกแต่ง */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-black opacity-10 rounded-full blur-2xl -ml-10 -mb-10"></div>
        </div>
        
        {/* Right Side: Form */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col bg-white overflow-y-auto relative justify-center">
          <div className="max-w-md w-full mx-auto animate-in fade-in duration-300">
            
            {/* Header */}
            <div className="mb-8 text-center md:text-left">
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
                {authMode === 'login' ? 'เข้าสู่ระบบ' : 'สร้างบัญชีใหม่'}
              </h2>
              <p className="text-slate-500 mt-2 text-sm font-medium">
                {authMode === 'login' ? 'ยินดีต้อนรับกลับสู่ FaceCheck' : 'ลงทะเบียนเพื่อเริ่มต้นใช้งานระบบ'}
              </p>
            </div>

            {/* Role Toggle */}
            <div className="flex p-1 bg-slate-100 rounded-xl mb-6 border border-slate-200">
              <button 
                type="button"
                onClick={() => setAuthRole('student')}
                className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${isStudent ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <User size={16} />
                <span>นักศึกษา</span>
              </button>
              <button 
                type="button"
                onClick={() => setAuthRole('instructor')}
                className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${!isStudent ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Users size={16} />
                <span>อาจารย์ผู้สอน</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode === 'register' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">ชื่อ - สกุล</label>
                  <input type="text" placeholder="เช่น นายกฤษณะ สุริยวงษ์" required className={`w-full px-4 py-3 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 transition-all text-sm ${isStudent ? 'focus:border-blue-500 focus:ring-blue-200' : 'focus:border-purple-500 focus:ring-purple-200'}`} />
                </div>
              )}

              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 delay-75">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">{isStudent ? 'รหัสนักศึกษา' : 'อีเมลมหาวิทยาลัย'}</label>
                <input type={isStudent ? 'text' : 'email'} placeholder={isStudent ? 'เช่น 640001...' : 'instructor@utcc.ac.th'} required className={`w-full px-4 py-3 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 transition-all text-sm ${isStudent ? 'focus:border-blue-500 focus:ring-blue-200' : 'focus:border-purple-500 focus:ring-purple-200'}`} />
              </div>

              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 delay-150">
                <div className="flex justify-between items-end mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">รหัสผ่าน</label>
                  {authMode === 'login' && <a href="#" className={`text-xs font-bold hover:underline ${isStudent ? 'text-blue-600' : 'text-purple-600'}`}>ลืมรหัสผ่าน?</a>}
                </div>
                <input type="password" placeholder="••••••••" required className={`w-full px-4 py-3 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 transition-all text-sm tracking-widest ${isStudent ? 'focus:border-blue-500 focus:ring-blue-200' : 'focus:border-purple-500 focus:ring-purple-200'}`} />
              </div>

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

              <button type="submit" className={`w-full mt-6 py-3.5 rounded-xl font-bold text-white shadow-sm transition-all active:scale-95 flex justify-center items-center ${isStudent ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'}`}>
                {authMode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-500 animate-in fade-in duration-500">
              {authMode === 'login' ? (
                <p>ยังไม่มีบัญชีใช่ไหม? <button type="button" onClick={() => { setAuthMode('register'); setIsFaceRegistered(false); }} className={`font-bold hover:underline ${isStudent ? 'text-blue-600' : 'text-purple-600'}`}>สมัครสมาชิก</button></p>
              ) : (
                <p>มีบัญชีอยู่แล้ว? <button type="button" onClick={() => setAuthMode('login')} className={`font-bold hover:underline ${isStudent ? 'text-blue-600' : 'text-purple-600'}`}>เข้าสู่ระบบ</button></p>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Modal Face Registration */}
      {showFaceRegModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-300 border border-white/20">
            {faceRegStep !== 3 && <button onClick={() => setShowFaceRegModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 z-10 bg-white/50 rounded-full p-1.5 transition-colors"><X size={24} strokeWidth={2.5}/></button>}
            <div className="p-10">
              <h3 className="text-[26px] font-black text-center mb-1 text-slate-800 tracking-tight">ลงทะเบียนใบหน้า</h3>
              <p className="text-center text-slate-500 font-medium text-sm mb-8">ขยับใบหน้าให้อยู่ในกรอบที่กำหนด</p>
              
              <div className="bg-slate-900 aspect-[3/4] sm:aspect-square rounded-[2rem] overflow-hidden relative flex flex-col items-center justify-center text-white mb-8 shadow-inner border border-slate-800">
                {faceRegStep === 0 && (
                  <div className="flex flex-col items-center animate-pulse">
                    <div className="bg-blue-500/20 p-5 rounded-full mb-4 shadow-[0_0_20px_rgba(59,130,246,0.3)]"><Camera size={40} className="text-blue-400" /></div>
                    <p className="font-bold tracking-wide">กำลังเตรียมกล้อง...</p>
                  </div>
                )}
                {(faceRegStep === 1 || faceRegStep === 2) && (
                  <>
                    <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop" alt="Webcam" className="absolute inset-0 w-full h-full object-cover opacity-90 scale-105" />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className={`w-48 h-64 border-[4px] rounded-[100px] transition-colors duration-500 ${faceRegStep === 1 ? 'border-blue-400 shadow-[0_0_30px_rgba(96,165,250,0.5)]' : 'border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.5)]'}`}></div>
                    </div>
                    <div className="absolute bottom-8 left-0 w-full flex justify-center">
                      <span className={`px-5 py-2.5 rounded-full text-sm font-black tracking-widest backdrop-blur-md shadow-xl border transition-colors duration-500 ${faceRegStep === 1 ? 'bg-blue-600/80 border-blue-400 text-white' : 'bg-amber-500/80 border-amber-300 text-amber-900'}`}>
                        {faceRegStep === 1 ? 'มองตรงมาที่กล้อง' : 'หันหน้าซ้าย-ขวา ช้าๆ'}
                      </span>
                    </div>
                  </>
                )}
                {faceRegStep === 3 && (
                  <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 absolute inset-0 flex flex-col items-center justify-center">
                    <div className="bg-white/20 p-5 rounded-full mb-4 shadow-lg backdrop-blur-sm"><CheckCircle size={56} className="text-white" strokeWidth={2.5}/></div>
                    <h4 className="text-4xl font-black text-white mb-2 tracking-tight">สำเร็จ!</h4>
                    <p className="text-emerald-50 font-bold">ระบบจดจำใบหน้าเรียบร้อย</p>
                  </div>
                )}
              </div>

              {faceRegStep === 3 && <button onClick={() => setShowFaceRegModal(false)} className="w-full mt-2 bg-[#2b4cdd] text-white py-4 rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-xl active:scale-95">ดำเนินการต่อ</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
