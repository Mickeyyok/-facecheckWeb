import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, BookOpen, History, Bell, LogOut, Users, Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import utccLogo from '../../assets/UTCC-Official-1.png';
import { notificationService } from '../../services/notificationService';

export default function MainLayout({ role }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const fetchUnreadCount = () => {
    if (user?.id) {
      notificationService.getUserNotifications(user.id).then(data => {
        const unreadCount = data.filter(n => !n.isRead).length;
        setUnreadNotificationsCount(unreadCount);
      }).catch(err => console.error(err));
    }
  };

  useEffect(() => {
    fetchUnreadCount();
  }, [user]);

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans selection:bg-blue-100">
      
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 lg:hidden" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      {/* Sidebar */}
      <div className={`w-64 bg-slate-900 text-white flex flex-col fixed h-full z-40 shadow-xl transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <img src={utccLogo} alt="UTCC Logo" className="w-10 h-10 object-contain relative z-10 drop-shadow-sm inline-block alignment-adjust" />
            <span className="text-xl font-bold tracking-wide">FaceCheck</span>
          </div>
          <button className="lg:hidden text-slate-400 hover:text-white" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={24} />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 mt-2">
          {/* เมนูหน้าหลัก */}
          <NavLink 
            to={`/${role}/dashboard`} 
            end // ใส่ end เพื่อให้ Active เฉพาะตอนอยู่หน้า Dashboard จริงๆ
            className={({ isActive }) => `w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium ${isActive ? 'bg-[#1a237e] text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <LayoutDashboard size={20} />
            <span>{role === 'student' ? 'หน้าหลัก' : 'จัดการคลาสเรียน'}</span>
          </NavLink>
          
          {/* เมนูเฉพาะของนักศึกษา */}
          {role === 'student' && (
            <>
              <NavLink 
                to="/student/courses" 
                className={({ isActive }) => `w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium ${isActive ? 'bg-[#1a237e] text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
              >
                <BookOpen size={20} /><span>รายวิชาของฉัน</span>
              </NavLink>

              <NavLink 
                to="/student/history" 
                className={({ isActive }) => `w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium ${isActive ? 'bg-[#1a237e] text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
              >
                <History size={20} /><span>ประวัติการเข้าเรียน</span>
              </NavLink>
            </>
          )}

          {/* เมนูแจ้งเตือน (ใช้ได้ทั้งสองฝั่ง) */}
          <NavLink 
            to={`/${role}/notifications`} 
            className={({ isActive }) => `w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 font-medium ${isActive ? 'bg-[#1a237e] text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <div className="flex items-center space-x-3">
              <Bell size={20} /><span>การแจ้งเตือน</span>
            </div>
            {unreadNotificationsCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                {unreadNotificationsCount}
              </span>
            )}
          </NavLink>
        </nav>
        
        {/* เมนูออกจากระบบ */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <button onClick={logout} className="flex items-center space-x-3 w-full px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors font-medium">
            <LogOut size={20} /><span>ออกจากระบบ</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="lg:ml-64 w-full flex flex-col min-h-screen bg-slate-50/50 transition-all duration-300">
        
        {/* Top Navbar */}
        <header className="bg-white/80 backdrop-blur-md h-16 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-10 border-b border-slate-200 shadow-sm">
          <div className="flex items-center space-x-2 lg:space-x-3">
            <button className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg mr-1 transition-colors" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu size={24} />
            </button>
            <div className={`hidden sm:flex p-2 rounded-lg ${role === 'student' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
               {role === 'student' ? <BookOpen size={20} /> : <Users size={20} />}
            </div>
            <h2 className="text-lg lg:text-xl font-bold text-slate-800 capitalize tracking-tight truncate max-w-[150px] sm:max-w-none">
              {role === 'student' ? 'ระบบนักศึกษา' : 'ระบบอาจารย์ผู้สอน'}
            </h2>
          </div>
          
          <div className="flex items-center space-x-5">
            <button onClick={() => navigate(`/${role}/notifications`)} className="relative text-slate-400 hover:text-[#1a237e] transition-colors">
              <Bell size={22} />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500 border-2 border-white"></span>
                </span>
              )}
            </button>

            <div className="flex items-center space-x-3 pl-3 lg:pl-5 border-l border-slate-200">
              <div className="hidden sm:flex flex-col items-end min-w-0">
                <span className="text-sm font-bold text-slate-700 leading-tight truncate max-w-[120px] lg:max-w-[200px]">
                  {user?.fullName || user?.name || 'ผู้ใช้งาน'}
                </span>
                <span className="text-xs font-medium text-slate-400 capitalize">
                  {role} Account
                </span>
              </div>
              <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm border border-white shrink-0 ${role === 'student' ? 'bg-blue-600' : 'bg-purple-600'}`}>
                {(user?.fullName || user?.name || 'U')[0].toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* พื้นที่สำหรับแสดง Content ของแต่ละหน้า (Outlet) */}
        <main className="flex-1 overflow-x-hidden p-4 lg:p-8">
          <Outlet context={{ fetchUnreadCount, setUnreadNotificationsCount }} />
        </main>
      </div>

    </div>
  );
}