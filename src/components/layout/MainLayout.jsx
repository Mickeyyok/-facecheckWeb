import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Camera, LayoutDashboard, BookOpen, History, Activity, Bell, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../../services/notificationService';

export default function MainLayout({ role }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  useEffect(() => {
    if (user?.id) {
      notificationService.getUserNotifications(user.id).then(data => {
        const unreadCount = data.filter(n => !n.isRead).length;
        setUnreadNotificationsCount(unreadCount);
      }).catch(err => console.error(err));
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans selection:bg-blue-100">
      
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-white flex flex-col fixed h-full z-20">
        <div className="p-6 flex items-center space-x-3 border-b border-slate-800">
          <img src="/src/assets/UTCC-Official-1.png" alt="UTCC Logo" className="w-10 h-10 object-contain relative z-10 drop-shadow-sm inline-block alignment-adjust" />
          <span className="text-xl font-bold tracking-wide">FaceCheck</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {/* เมนูหน้าหลัก */}
          <NavLink 
            to={`/${role}/dashboard`} 
            className={({ isActive }) => `w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${isActive ? 'bg-[#1a237e] text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <LayoutDashboard size={20} /><span>{role === 'student' ? 'หน้าหลัก' : 'จัดการรายวิชา'}</span>
          </NavLink>
          
          {/* เมนูรายวิชาของฉัน (เฉพาะนักศึกษา) */}
          {role === 'student' && (
            <NavLink 
              to="/student/courses" 
              className={({ isActive }) => `w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${isActive ? 'bg-[#1a237e] text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <BookOpen size={20} /><span>รายวิชาของฉัน</span>
            </NavLink>
          )}

          {/* เมนูประวัติ / แดชบอร์ดคลาส */}
          <NavLink 
            to={`/${role === 'student' ? 'student/history' : 'instructor/course/SP344'}`} 
            className={({ isActive }) => `w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${isActive ? 'bg-[#1a237e] text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            {role === 'student' ? <History size={20} /> : <Activity size={20} />}
            <span>{role === 'student' ? 'ประวัติการเข้าเรียน' : 'แดชบอร์ดคลาส'}</span>
          </NavLink>

          {/* เมนูแจ้งเตือน */}
          <NavLink 
            to={`/${role}/notifications`} 
            className={({ isActive }) => `w-full flex items-center justify-between px-4 py-3 rounded-lg transition ${isActive ? 'bg-[#1a237e] text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <div className="flex items-center space-x-3">
              <Bell size={20} /><span>การแจ้งเตือน</span>
            </div>
            {unreadNotificationsCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {unreadNotificationsCount}
              </span>
            )}
          </NavLink>
        </nav>
        
        {/* เมนูออกจากระบบ */}
        <div className="p-4 border-t border-slate-800">
          <button onClick={logout} className="flex items-center space-x-3 w-full px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition">
            <LogOut size={20} /><span>ออกจากระบบ</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="ml-64 w-full flex flex-col min-h-screen">
        
        {/* Top Navbar */}
        <header className="bg-white h-16 px-8 flex items-center justify-between sticky top-0 z-10 border-b border-slate-200 shadow-sm">
          <h2 className="text-xl font-bold text-slate-800 capitalize">
            {role === 'student' ? 'ระบบนักศึกษา' : 'ระบบอาจารย์ผู้สอน'}
          </h2>
          
          <div className="flex items-center space-x-5">
            <button onClick={() => navigate(`/${role}/notifications`)} className="relative text-slate-400 hover:text-blue-600 transition-colors">
              <Bell size={22} />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500 border-2 border-white"></span>
                </span>
              )}
            </button>

            <div className="flex items-center space-x-3 pl-5 border-l border-slate-200">
              <span className="text-sm font-bold text-slate-700">
                {user?.name}
              </span>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-white shadow-sm ${role === 'student' ? 'bg-blue-600' : 'bg-purple-600'}`}>
                {user?.name?.[0]}
              </div>
            </div>
          </div>
        </header>

        {/* พื้นที่สำหรับแสดง Content ของแต่ละหน้า (Outlet) */}
        <main className="flex-1 overflow-x-hidden">
          <Outlet />
        </main>
      </div>

    </div>
  );
}
