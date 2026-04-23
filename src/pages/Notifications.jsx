import React, { useState, useEffect } from 'react';
import { AlertTriangle, Mail, CheckCircle, Trash2, XCircle, FileText, CheckCircle2, X, Loader2, Brain, Send, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificationService } from '../services/notificationService';
import { classService } from '../services/classService';
import { attendanceService } from '../services/attendanceService';
import { showSuccess, showError } from '../utils/alertPopup';

export default function Notifications({ role }) {
  const { user } = useAuth();
  const context = useOutletContext();
  const fetchUnreadCount = context?.fetchUnreadCount;
  const setUnreadNotificationsCount = context?.setUnreadNotificationsCount;
  
  // Student specific
  const [notifications, setNotifications] = useState([]);
  
  // Teacher AI Alerts
  const [riskAlerts, setRiskAlerts] = useState([]);
  
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [notificationToDelete, setNotificationToDelete] = useState(null);
  const [loading, setLoading] = useState(true);

  // Send Alert Modal
  const [showSendAlertModal, setShowSendAlertModal] = useState(false);
  const [alertToSend, setAlertToSend] = useState(null);
  const [aiMessage, setAiMessage] = useState("");
  const [processingAlertId, setProcessingAlertId] = useState(null);

  // AI Analysis states
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiError, setAiError] = useState('');
  const [allCourseStats, setAllCourseStats] = useState([]);
  const [courseList, setCourseList] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('all');

  useEffect(() => {
    if (user?.id) {
      if (role === 'student') {
        fetchStudentNotifications();
      } else if (role === 'teacher') {
        fetchTeacherAiAlerts();
      }
    }
  }, [user, role]);

  const fetchStudentNotifications = async () => {
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

  const fetchTeacherAiAlerts = async () => {
    try {
      setLoading(true);
      const classes = await classService.getClassesByTeacher(user.id);
      setCourseList(classes.map(c => ({ id: c.id, code: c.subjectCode, name: c.subjectName })));
      let allRiskAlerts = [];
      let allStudentStats = [];
      let alertIdCounter = 1;
      
      for (const course of classes) {
         const students = await classService.getStudentsByClass(course.id);
         if (students.length === 0) continue;
         
         const data = await attendanceService.getAttendanceByClass(course.id);
         
         let scheduledDates = [];
         if (course.scheduledDates) {
            try { scheduledDates = JSON.parse(course.scheduledDates); } catch (e) {}
         }
         
         const maxAbsences = course.maxAbsences || 0;
         if (maxAbsences === 0) continue;
         
         const today = new Date(); today.setHours(0, 0, 0, 0);
         const pastDatesCount = scheduledDates.filter(d => {
             const dDate = new Date(d.date);
             return dDate < today || d.date === today.toISOString().split('T')[0];
         }).length;
         
         students.forEach(student => {
             const studentRecords = data.filter(a =>
                a.studentId === student.studentId ||
                a.userId === student.studentUserId ||
                a.userId === student.id
             );
             
             const presentCount = studentRecords.filter(r => ['PRESENT', 'ON_TIME'].includes(r.status?.toUpperCase())).length;
             const lateCount = studentRecords.filter(r => r.status?.toUpperCase() === 'LATE').length;
             const recordedAbsent = studentRecords.filter(r => r.status?.toUpperCase() === 'ABSENT').length;
             
             const missingCount = Math.max(0, pastDatesCount - (presentCount + lateCount + recordedAbsent));
             const totalAbsent = recordedAbsent + missingCount;
             const absentPercent = pastDatesCount > 0 ? Math.round((totalAbsent / pastDatesCount) * 100) : 0;
             
             const isRisk = pastDatesCount > 0 && (absentPercent >= 20 || totalAbsent >= (maxAbsences - 1));
             
              allStudentStats.push({
                  name: student.name, studentId: student.studentId,
                  courseName: course.subjectName, courseCode: course.subjectCode,
                  presentCount, lateCount, absentCount: totalAbsent,
                  attendancePercent: pastDatesCount > 0 ? Math.round(((presentCount + lateCount) / pastDatesCount) * 100) : 100,
                  isRisk
              });

              if (isRisk) {
                 allRiskAlerts.push({
                     id: alertIdCounter++,
                     studentUserId: student.studentUserId || student.id,
                     studentId: student.studentId,
                     studentName: student.name,
                     courseName: course.subjectName,
                     courseCode: course.subjectCode,
                     issue: totalAbsent >= maxAbsences ? `ขาดเรียนสะสม ${totalAbsent} ครั้ง (เกินเกณฑ์หักคะแนน)` : `ขาดเรียนสะสม ${totalAbsent} ครั้ง (เริ่มมีความเสี่ยง)`,
                     status: 'pending'
                 });
             }
         });
      }
      
      setRiskAlerts(allRiskAlerts);
      setAllCourseStats(allStudentStats);
    } catch (err) {
      console.error('Error fetching AI alerts:', err);
    } finally {
      setLoading(false);
    }
  };


  // Gemini AI Analysis
  const callGeminiAnalysis = async (stats) => {
    setLoadingAi(true); setAiError(''); setAiAnalysis(null);
    try {
      const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
      if (!GEMINI_API_KEY) throw new Error('ไม่พบ GEMINI API Key ใน .env');
      const riskStudents = stats.filter(s => s.isRisk);
      const avgAtt = stats.length > 0 ? Math.round(stats.reduce((sum, s) => sum + s.attendancePercent, 0) / stats.length) : 0;
      const top5 = [...stats].sort((a, b) => b.absentCount - a.absentCount).slice(0, 5);
      const coursesInvolved = [...new Set(stats.map(s => s.courseCode + ' ' + s.courseName))].join(', ');
      const prompt = `คุณคือผู้เชี่ยวชาญด้านการศึกษา วิเคราะห์ข้อมูลการเข้าเรียนของนักศึกษาแล้วให้รายงานเป็นภาษาไทย:\n\nรายวิชาที่วิเคราะห์: ${coursesInvolved}\nสรุปข้อมูล:\n- จำนวนนักศึกษาทั้งหมด: ${stats.length} คน\n- ค่าเฉลี่ยการเข้าเรียน: ${avgAtt}%\n- นักศึกษาที่มีความเสี่ยง: ${riskStudents.length} คน\n- นักศึกษาเข้าเรียนดี (>=90%): ${stats.filter(s => s.attendancePercent >= 90).length} คน\n\nนักศึกษาขาดเรียนมากที่สุด 5 อันดับ:\n${top5.map((s, i) => `${i + 1}. ${s.name} (${s.studentId}) - ${s.courseName} - ขาด ${s.absentCount} ครั้ง, เข้าเรียน ${s.attendancePercent}%`).join('\n')}\n\nตอบในรูปแบบ JSON เท่านั้น (ไม่ต้องใส่ markdown):\n{\n  "overallSummary": "สรุปภาพรวม 2-3 ประโยค",\n  "riskLevel": "ต่ำ หรือ ปานกลาง หรือ สูง หรือ วิกฤต",\n  "keyInsights": ["insight 1", "insight 2", "insight 3"],\n  "recommendations": ["คำแนะนำ 1", "คำแนะนำ 2", "คำแนะนำ 3"],\n  "urgentActions": "สิ่งที่ควรทำทันทีในประโยคเดียว หรือ null ถ้าไม่มี"\n}`;
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.4, maxOutputTokens: 1024 } })
      });
      if (!response.ok) { const errData = await response.json(); throw new Error(errData?.error?.message || `HTTP ${response.status}`); }
      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('รูปแบบผลลัพธ์จาก AI ไม่ถูกต้อง');
      setAiAnalysis(JSON.parse(jsonMatch[0]));
    } catch (err) { console.error('Gemini AI Error:', err); setAiError(err.message || 'ไม่สามารถเชื่อมต่อ AI ได้'); }
    finally { setLoadingAi(false); }
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

  const openAlertModal = (alert) => {
    setAlertToSend(alert);
    setAiMessage(`ถึง ${alert.studentName},\n\nเนื่องจากคุณมีสถานะการเข้าเรียนในวิชา ${alert.courseCode} ${alert.courseName} เข้าข่ายความเสี่ยง (${alert.issue})\n\nขอให้ติดต่ออาจารย์ผู้สอนโดยด่วนเพื่อชี้แจงเหตุผล\n\nจึงเรียนมาเพื่อทราบและดำเนินการ`);
    setShowSendAlertModal(true);
  };
  const handleSendAlertToStudent = async () => {
    if (!alertToSend || !aiMessage.trim()) return;

    try {
      setProcessingAlertId(alertToSend.id);
      await notificationService.sendAiAlert(alertToSend.studentUserId, aiMessage);
      
      setRiskAlerts(riskAlerts.map(a => a.id === alertToSend.id ? { ...a, status: 'sent' } : a));
      setShowSendAlertModal(false);
      setAlertToSend(null);
      showSuccess('ส่งการแจ้งเตือนเรียบร้อยแล้ว', 'แจ้งเตือนเข้าระบบของนักศึกษาแล้ว');
    } catch (error) {
      showError('ไม่สามารถส่งแจ้งเตือนได้', error.response?.data?.message || error.message);
    } finally {
      setProcessingAlertId(null);
    }
  };

  return (
    <div className="p-8 lg:p-10 space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex justify-between items-end border-b border-slate-200 pb-4">
        <div>
          <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            {role === 'teacher' ? (
              <>AI ผู้ช่วยวิเคราะห์ความเสี่ยง</>
            ) : 'การแจ้งเตือน'}
          </h3>
          <p className="text-slate-500 text-sm mt-1">
            {role === 'teacher' ? 'ระบบจะวิเคราะห์ประมวลผลสถิติและคัดกรองนักศึกษาจากทุกรายวิชาของคุณ' : 'ข้อความจากระบบและอาจารย์ผู้สอน'}
          </p>
        </div>
        {role === 'student' && notifications.filter(n => !n.isRead).length > 0 && (
          <button onClick={markAllAsRead} className="text-sm text-indigo-600 hover:underline font-medium">
            ทำเครื่องหมายว่าอ่านแล้วทั้งหมด
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
           <Loader2 className="animate-spin text-indigo-500" size={36} />
        </div>
      ) : role === 'student' ? (
        /* ============================================ */
        /* STUDENT VIEW (General Notifications) */
        /* ============================================ */
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
                  className={`p-5 rounded-xl border flex gap-4 transition-all cursor-pointer relative group pr-14 shadow-sm hover:shadow-md ${note.isRead ? 'bg-white border-slate-200' : 'bg-indigo-50/50 border-indigo-200'}`}
                >
                  <div className={`mt-1 flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                    note.type === 'warning' ? 'bg-yellow-100 text-yellow-600' : 
                    note.type === 'danger' ? 'bg-red-100 text-red-600' : 
                    'bg-indigo-100 text-indigo-600'
                  }`}>
                    {note.type === 'warning' && <AlertTriangle size={24} />}
                    {note.type === 'danger' && <Mail size={24} />}
                    {note.type === 'info' && <CheckCircle size={24} />}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h4 className={`font-bold text-lg ${note.isRead ? 'text-slate-700' : 'text-indigo-900'}`}>{note.title}</h4>
                      <span className="text-xs text-slate-400 font-medium ml-4">{note.time}</span>
                    </div>
                    <p className={`mt-1 text-sm ${note.isRead ? 'text-slate-500' : 'text-slate-800'} line-clamp-2 leading-relaxed`}>{note.message}</p>
                  </div>
                  
                  {!note.isRead && (
                    <div className="absolute top-1/2 -translate-y-1/2 right-14">
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
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
      ) : (
        /* ============================================ */
        /* TEACHER VIEW (AI Alerts across all courses) */
        /* ============================================ */
        <>

          {/* === AI Analysis Card (Gemini) === */}
          <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-purple-50 shadow-sm overflow-hidden mb-6">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center"><Brain size={20} className="text-white" /></div>
                <div>
                  <h4 className="text-white font-extrabold text-sm sm:text-base">AI ผู้ช่วยวิเคราะห์ความเสี่ยง</h4>
                  <p className="text-indigo-200 text-[11px] sm:text-xs"> Google Gemini AI · วิเคราะห์ข้อมูลจากระบบ</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select value={selectedCourse} onChange={e => { setSelectedCourse(e.target.value); setAiAnalysis(null); setAiError(''); }} className="bg-white/20 text-white text-xs font-bold pl-3 pr-6 py-2 rounded-xl border border-white/30 outline-none cursor-pointer" style={{WebkitAppearance:'none',MozAppearance:'none',backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,backgroundRepeat:'no-repeat',backgroundPosition:'right 8px center'}}>
                  <option value="all" style={{color:'#1e293b'}}>ทุกรายวิชา</option>
                  {courseList.map(c => (<option key={c.id} value={c.code} style={{color:'#1e293b'}}>{c.code} {c.name}</option>))}
                </select>
                <button onClick={() => { const filtered = selectedCourse === 'all' ? allCourseStats : allCourseStats.filter(s => s.courseCode === selectedCourse); if (filtered.length > 0) callGeminiAnalysis(filtered); }} disabled={loadingAi || loading || allCourseStats.length === 0} className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold px-3 py-2 rounded-xl transition border border-white/30">
                  <RefreshCw size={13} className={loadingAi ? 'animate-spin' : ''} />
                  <span className="hidden sm:inline">{loadingAi ? 'กำลังวิเคราะห์...' : 'วิเคราะห์ใหม่'}</span>
                </button>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              {loadingAi ? (
                <div className="space-y-3 py-2">
                  <div className="flex items-center gap-3 text-indigo-600">
                    <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin shrink-0"></div>
                    <span className="text-sm font-semibold animate-pulse"> Gemini AI กำลังวิเคราะห์ข้อมูลการเข้าเรียน...</span>
                  </div>
                  <div className="space-y-2 mt-2">
                    <div className="h-3 bg-indigo-100 rounded-full animate-pulse w-full"></div>
                    <div className="h-3 bg-indigo-100 rounded-full animate-pulse w-4/5"></div>
                    <div className="h-3 bg-indigo-100 rounded-full animate-pulse w-3/5"></div>
                  </div>
                </div>
              ) : aiError ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
                  <AlertCircle size={28} className="mx-auto text-red-400 mb-2" />
                  <p className="text-red-600 font-bold text-sm">ไม่สามารถเชื่อมต่อ AI ได้</p>
                  <p className="text-red-400 text-xs mt-1 font-mono break-all">{aiError}</p>
                  <button onClick={() => { const filtered = selectedCourse === 'all' ? allCourseStats : allCourseStats.filter(s => s.courseCode === selectedCourse); callGeminiAnalysis(filtered); }} className="mt-3 text-xs bg-red-100 text-red-600 font-bold px-4 py-2 rounded-lg hover:bg-red-200 transition">ลองใหม่อีกครั้ง</button>
                </div>
              ) : aiAnalysis ? (
                <div className="space-y-5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className={`text-xs font-extrabold px-3 py-1.5 rounded-full border ${aiAnalysis.riskLevel === 'วิกฤต' ? 'bg-red-100 text-red-700 border-red-300' : aiAnalysis.riskLevel === 'สูง' ? 'bg-orange-100 text-orange-700 border-orange-300' : aiAnalysis.riskLevel === 'ปานกลาง' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' : 'bg-emerald-100 text-emerald-700 border-emerald-300'}`}>
                        {aiAnalysis.riskLevel === 'วิกฤต' ? '' : aiAnalysis.riskLevel === 'สูง' ? '' : aiAnalysis.riskLevel === 'ปานกลาง' ? '' : ''} ความเสี่ยงระดับ: {aiAnalysis.riskLevel}
                      </span>
                    </div>
                    <p className="text-slate-700 text-sm leading-relaxed font-medium">{aiAnalysis.overallSummary}</p>
                  </div>
                  {aiAnalysis.keyInsights?.length > 0 && (
                    <div>
                      <h5 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Sparkles size={13} className="text-indigo-500" /> ข้อสังเกตสำคัญจาก AI</h5>
                      <ul className="space-y-2.5">{aiAnalysis.keyInsights.map((insight, i) => (<li key={i} className="flex items-start gap-2.5 text-sm text-slate-700"><span className="w-5 h-5 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-[10px] font-extrabold shrink-0 mt-0.5">{i + 1}</span>{insight}</li>))}</ul>
                    </div>
                  )}
                  {aiAnalysis.recommendations?.length > 0 && (
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                      <h5 className="text-xs font-extrabold text-indigo-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">คำแนะนำสำหรับอาจารย์</h5>
                      <ul className="space-y-2">{aiAnalysis.recommendations.map((rec, i) => (<li key={i} className="flex items-start gap-2 text-sm text-indigo-800"><CheckCircle size={14} className="text-indigo-500 shrink-0 mt-0.5" />{rec}</li>))}</ul>
                    </div>
                  )}
                  {aiAnalysis.urgentActions && aiAnalysis.urgentActions !== 'null' && (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 flex items-start gap-3">
                      <AlertTriangle size={18} className="text-rose-500 shrink-0 mt-0.5" />
                      <div><p className="text-xs font-extrabold text-rose-600 mb-0.5">ต้องดำเนินการทันที</p><p className="text-sm text-rose-700 font-medium">{aiAnalysis.urgentActions}</p></div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Brain size={36} className="mx-auto text-indigo-200 mb-3" />
                  <p className="text-slate-600 font-bold text-sm">พร้อมวิเคราะห์ด้วย AI</p>
                  <p className="text-slate-400 text-xs mt-1 mb-4">เลือกรายวิชา แล้วกดปุ่ม <span className="font-semibold text-indigo-500">วิเคราะห์ใหม่</span></p>
                </div>
              )}
            </div>
          </div>
          {riskAlerts.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-slate-200 text-center shadow-sm">
              <CheckCircle size={48} className="text-emerald-400 mx-auto mb-4" />
              <p className="text-lg font-bold text-slate-700">ยอดเยี่ยม!</p>
              <p className="text-slate-500 text-sm mt-1">ไม่มีนักศึกษาที่มีความเสี่ยงในทุกรายวิชาของคุณ</p>
            </div>
          ) : (
            <div className="space-y-4">
              {riskAlerts.map((alert) => (
                <div key={alert.id} className="bg-white rounded-xl border border-red-100 p-5 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                      <Brain size={20} />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-slate-500 mb-0.5">{alert.courseCode} {alert.courseName}</p>
                      <h5 className="font-bold text-slate-800 text-[15px]">{alert.studentName} <span className="text-xs text-slate-400 font-medium ml-1">({alert.studentId})</span></h5>
                      <p className="text-sm text-red-500 font-medium mt-0.5 flex items-center gap-1.5">
                        <AlertTriangle size={14} /> {alert.issue}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => openAlertModal(alert)}
                    disabled={alert.status === 'sent' || processingAlertId === alert.id}
                    className={`shrink-0 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${
                      alert.status === 'sent' 
                        ? 'bg-emerald-50 text-emerald-600 cursor-not-allowed' 
                        : 'bg-red-50 text-red-600 hover:bg-red-500 hover:text-white border border-red-200 hover:border-transparent'
                    }`}
                  >
                    {processingAlertId === alert.id ? <Loader2 size={16} className="animate-spin" /> : 
                     alert.status === 'sent' ? <CheckCircle2 size={16} /> : <Send size={16} />}
                    {alert.status === 'sent' ? 'ส่งแล้ว' : 'ส่งแจ้งเตือน'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* --- Modals --- */}

      {/* Modal อ่านรายละเอียด (Student only) */}
      {selectedNotification && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl relative p-6 animate-in zoom-in-95">
            <button onClick={() => setSelectedNotification(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 z-10"><XCircle size={24} /></button>
            
            <div className="flex items-center space-x-3 mb-4 border-b border-slate-100 pb-4 pr-6">
              <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                selectedNotification.type === 'warning' ? 'bg-yellow-100 text-yellow-600' : 
                selectedNotification.type === 'danger' ? 'bg-red-100 text-red-600' : 
                'bg-indigo-100 text-indigo-600'
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

            <button onClick={() => setSelectedNotification(null)} className="w-full mt-6 text-white py-3 rounded-xl font-bold transition-all active:scale-95 bg-indigo-600 hover:bg-indigo-700 shadow-md">
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}

      {/* Modal ยืนยันการลบ (Student only) */}
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

      {/* Modal ส่งแจ้งเตือน AI (Teacher only) */}
      {showSendAlertModal && alertToSend && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl relative animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-red-50">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-red-500">
                <Brain size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">ส่งแจ้งเตือนรายบุคคล</h3>
                <p className="text-red-600 text-xs font-medium mt-0.5">ระบบจะส่งข้อความนี้ให้นักศึกษาผ่านระบบ FaceCheck</p>
              </div>
            </div>
            
            <div className="p-6">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">ข้อความ (แก้ไขได้)</label>
              </div>
              <textarea 
                className="w-full h-40 p-4 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50 text-sm font-medium text-slate-700 transition-all resize-none"
                value={aiMessage}
                onChange={(e) => setAiMessage(e.target.value)}
              />
              
              <div className="flex gap-3 mt-6">
                <button 
                  onClick={() => setShowSendAlertModal(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  ยกเลิก
                </button>
                <button 
                  onClick={handleSendAlertToStudent}
                  disabled={processingAlertId === alertToSend.id}
                  className="flex-[2] py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 shadow-md shadow-red-500/20 hover:shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {processingAlertId === alertToSend.id ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  ยืนยันส่งข้อความ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
