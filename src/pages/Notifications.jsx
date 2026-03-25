import React, { useState, useEffect } from 'react';
import { AlertTriangle, Mail, CheckCircle, Trash2, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { notificationService } from '../services/notificationService';

export default function Notifications({ role }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [notificationToDelete, setNotificationToDelete] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationService.getUserNotifications(user.id);
      
      // แปลงข้อมูล createdAt ให้เป็น time แบบอ่านง่าย
      const formattedData = data.map(n => {
        const date = new Date(n.createdAt);
        return {
          ...n,
          time: date.toLocaleString('th-TH', { 
            day: 'numeric', month: 'short', year: 'numeric', 
            hour: '2-digit', minute: '2-digit' 
          }) // เช่น "24 มี.ค. 2569 23:45"
        };
      });
      
      setNotifications(formattedData);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชันทำเครื่องหมายว่าอ่านแล้วทั้งหมด
  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead(user.id);
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // ฟังก์ชันกดดูรายละเอียด (และตั้งค่าให้อ่านแล้ว)
  const handleViewNotification = async (note) => {
    setSelectedNotification(note); 
    if (!note.isRead) {
      try {
        await notificationService.markAsRead(note.id);
        setNotifications(notifications.map(n => n.id === note.id ? { ...n, isRead: true } : n));
      } catch (error) {
        console.error('Error marking as read:', error);
      }
    }
  };

  // ฟังก์ชันลบการแจ้งเตือน
  const confirmDelete = async () => {
    try {
      await notificationService.deleteNotification(notificationToDelete.id);
      setNotifications(notifications.filter(n => n.id !== notificationToDelete.id));
      setNotificationToDelete(null);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  return (
    <div className="p-8 lg:p-10 space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex justify-between items-end border-b border-slate-200 pb-4">
        <div>
          <h3 className="text-2xl font-bold text-slate-800">การแจ้งเตือน</h3>
          <p className="text-slate-500 text-sm mt-1">ข้อความจากระบบและอาจารย์ผู้สอน</p>
        </div>
        <button onClick={markAllAsRead} className="text-sm text-blue-600 hover:underline font-medium">
          ทำเครื่องหมายว่าอ่านแล้วทั้งหมด
        </button>
      </div>

      {/* List ของการแจ้งเตือน */}
      {notifications.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center shadow-sm">
          <CheckCircle size={48} className="text-slate-300 mx-auto mb-4" />
          <p className="text-lg font-bold text-slate-700">ไม่มีการแจ้งเตือนใหม่</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map(note => (
            <div 
              key={note.id} 
              onClick={() => handleViewNotification(note)}
              className={`p-5 rounded-xl border flex gap-4 transition-all cursor-pointer relative group pr-14 shadow-sm hover:shadow-md ${note.isRead ? 'bg-white border-slate-200' : role === 'student' ? 'bg-blue-50/50 border-blue-200' : 'bg-purple-50/50 border-purple-200'}`}
            >
              <div className={`mt-1 flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                note.type === 'warning' ? 'bg-yellow-100 text-yellow-600' : 
                note.type === 'danger' ? 'bg-red-100 text-red-600' : 
                role === 'instructor' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
              }`}>
                {note.type === 'warning' && <AlertTriangle size={24} />}
                {note.type === 'danger' && <Mail size={24} />}
                {note.type === 'info' && <CheckCircle size={24} />}
              </div>
              
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h4 className={`font-bold text-lg ${note.isRead ? 'text-slate-700' : role === 'student' ? 'text-blue-900' : 'text-purple-900'}`}>{note.title}</h4>
                  <span className="text-xs text-slate-400 font-medium ml-4">{note.time}</span>
                </div>
                <p className={`mt-1 text-sm ${note.isRead ? 'text-slate-500' : 'text-slate-800'} line-clamp-2 leading-relaxed`}>{note.message}</p>
              </div>
              
              {/* จุดสีบอกสถานะว่ายังไม่ได้อ่าน */}
              {!note.isRead && (
                <div className="absolute top-1/2 -translate-y-1/2 right-14">
                  <div className={`w-2.5 h-2.5 rounded-full ${role === 'student' ? 'bg-blue-500' : 'bg-purple-500'} shadow-[0_0_8px_rgba(59,130,246,0.6)]`}></div>
                </div>
              )}

              {/* ปุ่มลบ */}
              <div className="absolute top-1/2 -translate-y-1/2 right-3">
                <button 
                  onClick={(e) => { e.stopPropagation(); setNotificationToDelete(note); }}
                  className="text-slate-300 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- Modals --- */}

      {/* Modal อ่านรายละเอียด */}
      {selectedNotification && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl relative p-6 animate-in zoom-in-95">
            <button onClick={() => setSelectedNotification(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 z-10"><XCircle size={24} /></button>
            
            <div className="flex items-center space-x-3 mb-4 border-b border-slate-100 pb-4 pr-6">
              <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                selectedNotification.type === 'warning' ? 'bg-yellow-100 text-yellow-600' : 
                selectedNotification.type === 'danger' ? 'bg-red-100 text-red-600' : 
                role === 'instructor' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
              }`}>
                {selectedNotification.type === 'warning' && <AlertTriangle size={24} />}
                {selectedNotification.type === 'danger' && <Mail size={24} />}
                {selectedNotification.type === 'info' && <CheckCircle size={24} />}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 leading-tight">{selectedNotification.title}</h3>
                <p className="text-xs text-slate-400 mt-1">{selectedNotification.time}</p>
              </div>
            </div>
            
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 min-h-[120px]">
              <p className="text-slate-700 whitespace-pre-wrap text-[15px] leading-relaxed">
                {selectedNotification.message}
              </p>
            </div>

            <button onClick={() => setSelectedNotification(null)} className={`w-full mt-6 text-white py-3 rounded-xl font-bold transition-all active:scale-95 ${role === 'instructor' ? 'bg-purple-600 hover:bg-purple-700 shadow-md' : 'bg-blue-600 hover:bg-blue-700 shadow-md'}`}>
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}

      {/* Modal ยืนยันการลบ */}
      {notificationToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-xs overflow-hidden shadow-xl relative p-6 text-center animate-in zoom-in-95">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">ยืนยันการลบ?</h3>
            <p className="text-slate-500 text-sm mb-6">คุณต้องการลบข้อความแจ้งเตือนนี้ใช่หรือไม่?</p>
            <div className="flex space-x-3">
              <button onClick={() => setNotificationToDelete(null)} className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-lg font-bold hover:bg-slate-200">ยกเลิก</button>
              <button onClick={confirmDelete} className="flex-1 bg-red-500 text-white py-2.5 rounded-lg font-bold hover:bg-red-600">ยืนยันลบ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
