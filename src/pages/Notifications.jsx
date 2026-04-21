  import React, { useState, useEffect } from 'react';
import { AlertTriangle, Mail, CheckCircle, Trash2, XCircle, FileText, CheckCircle2, X, Loader2 } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificationService } from '../services/notificationService';
import { leaveRequestService } from '../services/leaveRequestService';
import { showSuccess, showError } from '../utils/alertPopup';

export default function Notifications({ role }) {
  const { user } = useAuth();
  const context = useOutletContext();
  const fetchUnreadCount = context?.fetchUnreadCount;
  const setUnreadNotificationsCount = context?.setUnreadNotificationsCount;
  const [notifications, setNotifications] = useState([]);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [notificationToDelete, setNotificationToDelete] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- Leave Request States ---
  const [activeTab, setActiveTab] = useState('notifications');
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loadingLeaves, setLoadingLeaves] = useState(false);
  const [processingLeaveId, setProcessingLeaveId] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
      if (role === 'teacher') {
        fetchLeaveRequests();
      }
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationService.getUserNotifications(user.id);
      
      const formattedData = data.map(n => {
        const date = new Date(n.createdAt);
        return {
          ...n,
          time: date.toLocaleString('th-TH', { 
            day: 'numeric', month: 'short', year: 'numeric', 
            hour: '2-digit', minute: '2-digit' 
          })
        };
      });
      
      setNotifications(formattedData);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveRequests = async () => {
    try {
      setLoadingLeaves(true);
      const data = await leaveRequestService.getByTeacher(user.id);
      setLeaveRequests(data);
    } catch (error) {
      console.error('Error fetching leave requests:', error);
    } finally {
      setLoadingLeaves(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead(user.id);
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      if (setUnreadNotificationsCount) setUnreadNotificationsCount(0);
      else if (fetchUnreadCount) fetchUnreadCount();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleViewNotification = async (note) => {
    setSelectedNotification(note); 
    if (!note.isRead) {
      try {
        await notificationService.markAsRead(note.id);
        setNotifications(notifications.map(n => n.id === note.id ? { ...n, isRead: true } : n));
        if (setUnreadNotificationsCount) setUnreadNotificationsCount(prev => Math.max(0, prev - 1));
        else if (fetchUnreadCount) fetchUnreadCount();
      } catch (error) {
        console.error('Error marking as read:', error);
      }
    }
  };

  const confirmDelete = async () => {
    try {
      await notificationService.deleteNotification(notificationToDelete.id);
      setNotifications(notifications.filter(n => n.id !== notificationToDelete.id));
      if (setUnreadNotificationsCount && !notificationToDelete.isRead) {
        setUnreadNotificationsCount(prev => Math.max(0, prev - 1));
      } else if (!setUnreadNotificationsCount && fetchUnreadCount) {
        fetchUnreadCount();
      }
      setNotificationToDelete(null);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleApproveLeave = async (leaveId) => {
    try {
      setProcessingLeaveId(leaveId);
      await leaveRequestService.approve(leaveId);
      setLeaveRequests(leaveRequests.map(lr => lr.id === leaveId ? { ...lr, status: 'approved' } : lr));
      showSuccess('อนุมัติใบลาเรียบร้อย', 'ระบบแจ้งเตือนนักศึกษาแล้ว');
    } catch (error) {
      showError('อนุมัติไม่สำเร็จ', error.response?.data?.message || error.message);
    } finally {
      setProcessingLeaveId(null);
    }
  };

  const handleRejectLeave = async (leaveId) => {
    try {
      setProcessingLeaveId(leaveId);
      await leaveRequestService.reject(leaveId);
      setLeaveRequests(leaveRequests.map(lr => lr.id === leaveId ? { ...lr, status: 'rejected' } : lr));
      showSuccess('ปฏิเสธใบลาเรียบร้อย', 'ระบบแจ้งเตือนนักศึกษาแล้ว');
    } catch (error) {
      showError('ปฏิเสธไม่สำเร็จ', error.response?.data?.message || error.message);
    } finally {
      setProcessingLeaveId(null);
    }
  };

  const handleDeleteLeave = async (leaveId) => {
    try {
      setProcessingLeaveId(leaveId);
      await leaveRequestService.delete(leaveId);
      setLeaveRequests(leaveRequests.filter(lr => lr.id !== leaveId));
      showSuccess('ลบใบลาเรียบร้อย', '');
    } catch (error) {
      showError('ลบไม่สำเร็จ', error.response?.data?.message || error.message);
    } finally {
      setProcessingLeaveId(null);
    }
  };

  const pendingLeaveCount = leaveRequests.filter(lr => lr.status === 'pending').length;

  const formatLeaveDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="p-8 lg:p-10 space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex justify-between items-end border-b border-slate-200 pb-4">
        <div>
          <h3 className="text-2xl font-bold text-slate-800">การแจ้งเตือน</h3>
          <p className="text-slate-500 text-sm mt-1">
            {role === 'teacher' ? 'ข้อความจากระบบและนักศึกษา' : 'ข้อความจากระบบและอาจารย์ผู้สอน'}
          </p>
        </div>
        {activeTab === 'notifications' && (
          <button onClick={markAllAsRead} className="text-sm text-blue-600 hover:underline font-medium">
            ทำเครื่องหมายว่าอ่านแล้วทั้งหมด
          </button>
        )}
      </div>

      {/* Tabs - เฉพาะอาจารย์ */}
      {role === 'teacher' && (
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2.5 px-6 py-3 rounded-2xl font-bold text-sm transition-all duration-200 ${
              activeTab === 'notifications'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-100'
                : 'bg-white text-slate-500 border border-slate-200 hover:border-purple-300 hover:text-purple-600'
            }`}
          >
            <Mail size={18} />
            <span>แจ้งเตือน</span>
            {notifications.filter(n => !n.isRead).length > 0 && (
              <span className={`ml-1 text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'notifications' ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-600'
              }`}>
                {notifications.filter(n => !n.isRead).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('leave-requests')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2.5 px-6 py-3 rounded-2xl font-bold text-sm transition-all duration-200 ${
              activeTab === 'leave-requests'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-100'
                : 'bg-white text-slate-500 border border-slate-200 hover:border-amber-300 hover:text-amber-600'
            }`}
          >
            <FileText size={18} />
            <span>คำขอลา</span>
            {pendingLeaveCount > 0 && (
              <span className={`ml-1 text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'leave-requests' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-600'
              }`}>
                {pendingLeaveCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* ============================================ */}
      {/* TAB 1: Notifications */}
      {/* ============================================ */}
      {activeTab === 'notifications' && (
        <>
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
                    role === 'teacher' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
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
                  
                  {!note.isRead && (
                    <div className="absolute top-1/2 -translate-y-1/2 right-14">
                      <div className={`w-2.5 h-2.5 rounded-full ${role === 'student' ? 'bg-blue-500' : 'bg-purple-500'} shadow-[0_0_8px_rgba(59,130,246,0.6)]`}></div>
                    </div>
                  )}

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
        </>
      )}

      {/* ============================================ */}
      {/* TAB 2: Leave Requests (เฉพาะอาจารย์) */}
      {/* ============================================ */}
      {activeTab === 'leave-requests' && role === 'teacher' && (
        <>
          {loadingLeaves ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-2xl border border-slate-100 p-6 animate-pulse">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-xl shrink-0"></div>
                    <div className="flex-1 space-y-3">
                      <div className="h-4 bg-slate-100 rounded-lg w-2/3"></div>
                      <div className="h-3 bg-slate-50 rounded-lg w-full"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : leaveRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6">
              <div className="w-24 h-24 rounded-full bg-amber-50 flex items-center justify-center mb-6">
                <FileText size={44} className="text-amber-300" />
              </div>
              <h4 className="text-xl font-extrabold text-slate-700 mb-2">ยังไม่มีคำขอลาจากนักศึกษา</h4>
              <p className="text-slate-400 text-sm text-center max-w-xs leading-relaxed">
                เมื่อนักศึกษาส่งใบลาป่วยหรือลากิจ คำขอจะแสดงที่นี่
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {leaveRequests.map(lr => {
                const isPending = lr.status === 'pending';
                const isApproved = lr.status === 'approved';
                const isRejected = lr.status === 'rejected';
                const isSick = lr.leaveType === 'sick';

                return (
                  <div 
                    key={lr.id} 
                    className={`bg-white rounded-2xl border overflow-hidden transition-all shadow-sm hover:shadow-md ${
                      isPending ? 'border-amber-200 border-l-4 border-l-amber-400' :
                      isApproved ? 'border-emerald-200 border-l-4 border-l-emerald-400 opacity-80' :
                      'border-rose-200 border-l-4 border-l-rose-400 opacity-80'
                    }`}
                  >
                    <div className="p-5">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg ${
                            isSick ? 'bg-rose-50' : 'bg-blue-50'
                          }`}>
                            {isSick ? <AlertTriangle size={20} className="text-rose-500" /> : <FileText size={20} className="text-blue-500" />}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 text-[15px]">{lr.studentName}</h4>
                            <p className="text-xs text-slate-400 font-medium">{lr.studentCode} • {lr.subjectCode} {lr.subjectName}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                            isSick ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-blue-50 text-blue-600 border-blue-200'
                          }`}>
                            {isSick ? 'ลาป่วย' : 'ลากิจ'}
                          </span>
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                            isPending ? 'bg-amber-50 text-amber-600 border-amber-200' :
                            isApproved ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                            'bg-rose-50 text-rose-600 border-rose-200'
                          }`}>
                            {isPending ? 'รออนุมัติ' : isApproved ? 'อนุมัติแล้ว' : <><XCircle size={12} className="mr-1" /> ปฏิเสธแล้ว</>}
                          </span>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 mb-3">
                        <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                          <span className="font-semibold">วันที่ลา:</span>
                          <span className="font-bold text-slate-800">{formatLeaveDate(lr.leaveDate)}</span>
                        </div>
                        {lr.reason && (
                          <div className="text-sm text-slate-600">
                            <span className="font-semibold">เหตุผล:</span>
                            <span className="ml-2 text-slate-700">{lr.reason}</span>
                          </div>
                        )}
                        {lr.attachmentImage && (
                          <div className="mt-3 pt-3 border-t border-slate-100">
                            <p className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1"><FileText size={14} className="text-slate-400" /> เอกสารแนบ</p>
                            <img
                              src={lr.attachmentImage}
                              alt="เอกสารแนบ"
                              className="w-full max-h-48 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => setPreviewImage(lr.attachmentImage)}
                            />
                          </div>
                        )}
                      </div>

                      {/* Action Buttons - เฉพาะ pending */}
                      {isPending && (
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleRejectLeave(lr.id)}
                            disabled={processingLeaveId === lr.id}
                            className="flex-1 py-2.5 rounded-xl font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all active:scale-95 text-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
                          >
                            {processingLeaveId === lr.id ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                            ปฏิเสธ
                          </button>
                          <button
                            onClick={() => handleApproveLeave(lr.id)}
                            disabled={processingLeaveId === lr.id}
                            className="flex-1 py-2.5 rounded-xl font-bold text-white bg-emerald-500 hover:bg-emerald-600 transition-all active:scale-95 shadow-md shadow-emerald-500/20 text-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
                          >
                            {processingLeaveId === lr.id ? <Loader2 size={16} className="animate-spin" /> : null}
                            อนุมัติ
                          </button>
                        </div>
                      )}

                      {/* ปุ่มลบ - แสดงเสมอสำหรับที่อนุมัติ/ปฏิเสธแล้ว */}
                      {!isPending && (
                        <button
                          onClick={() => handleDeleteLeave(lr.id)}
                          disabled={processingLeaveId === lr.id}
                          className="w-full py-2 rounded-xl font-bold text-slate-400 bg-slate-50 hover:bg-rose-50 hover:text-rose-500 border border-slate-100 hover:border-rose-200 transition-all active:scale-95 text-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          {processingLeaveId === lr.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={14} />}
                          ลบรายการนี้
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
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
                role === 'teacher' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
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

            <button onClick={() => setSelectedNotification(null)} className={`w-full mt-6 text-white py-3 rounded-xl font-bold transition-all active:scale-95 ${role === 'teacher' ? 'bg-purple-600 hover:bg-purple-700 shadow-md' : 'bg-blue-600 hover:bg-blue-700 shadow-md'}`}>
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
      {/* Modal ดูรูปขยาย */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in cursor-pointer"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-3xl w-full max-h-[85vh] animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 bg-white text-slate-600 hover:text-slate-800 w-8 h-8 rounded-full flex items-center justify-center shadow-lg z-10 hover:bg-slate-100 transition-colors"
            >
              <X size={18} />
            </button>
            <img
              src={previewImage}
              alt="เอกสารแนบ"
              className="w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
