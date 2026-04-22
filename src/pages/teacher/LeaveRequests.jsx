import React, { useState, useEffect } from 'react';
import { AlertTriangle, FileText, CheckCircle, XCircle, Trash2, X, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { leaveRequestService } from '../../services/leaveRequestService';
import { showSuccess, showError } from '../../utils/alertPopup';

export default function LeaveRequests() {
  const { user } = useAuth();
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loadingLeaves, setLoadingLeaves] = useState(false);
  const [processingLeaveId, setProcessingLeaveId] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    if (user?.id) {
      fetchLeaveRequests();
    }
  }, [user]);

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

  const formatLeaveDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="p-8 lg:p-10 space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
      <div className="flex justify-between items-end border-b border-slate-200 pb-4">
        <div>
          <h3 className="text-2xl font-bold text-slate-800">จัดการคำขอลา</h3>
          <p className="text-slate-500 text-sm mt-1">อนุมัติหรือปฏิเสธคำขอลาของนักศึกษาในทุกรายวิชา</p>
        </div>
      </div>

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
