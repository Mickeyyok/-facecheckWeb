import React from 'react';
import { FileText, Edit, CheckCircle, Clock, Calendar, Plus, Trash2, MapPin, Target, AlertTriangle } from 'lucide-react';
import { MapContainer, TileLayer, Circle, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function ChangeMapView({ center }) {
  const map = useMap();
  map.setView(center, map.getZoom());
  return null;
}

export default function CourseInfoTab({
  courseInfo,
  setCourseInfo,
  isEditingCourseInfo,
  setIsEditingCourseInfo,
  editCourseForm,
  setEditCourseForm,
  classService,
  courseId,
  showSuccess,
  showError,
  courseTimeSettings,
  scanStatus,
  scheduledDates,
  setGenerateForm,
  setShowGenerateModal,
  setNewDateForm,
  setShowAddDateModal,
  handleClearAllDates,
  isDatePast,
  isDateToday,
  formatThaiDate,
  setDateToDelete,
  locationSettings,
  setEditLocationForm,
  setShowSetLocationModal,
  maxAbsences,
  isClassCanceled,
  setIsClassCanceled,
  setShowCancelClassConfirm,
  setEditTimeForm,
  setShowSetTimeModal
}) {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <h4 className="text-base sm:text-lg font-bold text-slate-800 flex items-center"><FileText className="mr-2 text-indigo-600 shrink-0" size={18} /> ข้อมูลวิชาเบื้องต้น</h4>
          {!isEditingCourseInfo ? (
            <button onClick={() => { setEditCourseForm(courseInfo); setIsEditingCourseInfo(true); }} className="text-sm bg-indigo-50 text-indigo-600 font-bold px-4 py-2 rounded-lg hover:bg-indigo-100 transition shadow-sm flex items-center w-full sm:w-auto justify-center">
              <Edit size={14} className="mr-1.5" /> แก้ไขข้อมูล
            </button>
          ) : (
            <div className="flex space-x-2 w-full sm:w-auto">
              <button onClick={() => setIsEditingCourseInfo(false)} className="flex-1 sm:flex-none text-sm bg-slate-100 text-slate-600 font-bold px-4 py-2 rounded-lg hover:bg-slate-200 transition shadow-sm">ยกเลิก</button>
              <button onClick={async () => {
                try {
                  const payload = {
                    subjectName: editCourseForm.name,
                    subjectCode: editCourseForm.code,
                    instructorName: editCourseForm.instructor,
                    room: editCourseForm.room,
                    term: editCourseForm.term
                  };
                  await classService.updateClass(courseId, payload);
                  setCourseInfo(editCourseForm);
                  setIsEditingCourseInfo(false);
                  showSuccess("บันทึกข้อมูลสำเร็จ");
                } catch (error) {
                  showError("บันทึกข้อมูลไม่สำเร็จ", error.response?.data?.message || error.message);
                }
              }} className="flex-1 sm:flex-none justify-center text-sm bg-indigo-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-indigo-700 transition shadow-sm flex items-center"><CheckCircle size={14} className="mr-1.5" /> บันทึก</button>
            </div>
          )}
        </div>

        <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
          {!isEditingCourseInfo ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div><span className="text-slate-500 block mb-1 text-xs font-bold uppercase tracking-wide">ชื่อวิชา</span><span className="font-bold text-slate-800 block text-[15px]">{courseInfo.name}</span></div>
              <div><span className="text-slate-500 block mb-1 text-xs font-bold uppercase tracking-wide">รหัสวิชา</span><span className="font-bold text-slate-800 block text-[15px]">{courseInfo.code}</span></div>
              <div><span className="text-slate-500 block mb-1 text-xs font-bold uppercase tracking-wide">ชื่ออาจารย์</span><span className="font-bold text-slate-800 block text-[15px]">{courseInfo.instructor}</span></div>
              <div><span className="text-slate-500 block mb-1 text-xs font-bold uppercase tracking-wide">ห้องเรียน</span><span className="font-bold text-slate-800 block text-[15px]">{courseInfo.room}</span></div>
              <div><span className="text-slate-500 block mb-1 text-xs font-bold uppercase tracking-wide">ปีการศึกษา / เทอม</span><span className="font-bold text-slate-800 block text-[15px]">{courseInfo.term}</span></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {['name', 'code', 'instructor', 'room'].map(field => (
                <div key={field}>
                  <label className="text-slate-500 block mb-1.5 text-xs font-bold uppercase tracking-wide">
                    {field === 'name' ? 'ชื่อวิชา' : field === 'code' ? 'รหัสวิชา' : field === 'instructor' ? 'ชื่ออาจารย์' : 'ห้องเรียน'}
                  </label>
                  <input type="text" value={editCourseForm[field]} onChange={(e) => setEditCourseForm({ ...editCourseForm, [field]: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold text-slate-800 shadow-sm" />
                </div>
              ))}
              <div>
                <label className="text-slate-500 block mb-1.5 text-xs font-bold uppercase tracking-wide">
                  ปีการศึกษา / เทอม
                </label>
                <div className="flex space-x-2">
                  <input 
                    type="number" 
                    placeholder="ปี เช่น 2568" 
                    value={editCourseForm.term ? editCourseForm.term.split(' / ')[0] : ''} 
                    onChange={(e) => {
                      const t = editCourseForm.term && editCourseForm.term.includes(' / ') ? editCourseForm.term.split(' / ')[1] : '1';
                      setEditCourseForm({ ...editCourseForm, term: `${e.target.value} / ${t}` });
                    }} 
                    className="w-1/2 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold text-slate-800 shadow-sm" 
                  />
                  <select 
                    value={editCourseForm.term && editCourseForm.term.includes(' / ') ? editCourseForm.term.split(' / ')[1] : '1'} 
                    onChange={(e) => {
                      const y = editCourseForm.term && editCourseForm.term.includes(' / ') ? editCourseForm.term.split(' / ')[0] : '';
                      setEditCourseForm({ ...editCourseForm, term: `${y} / ${e.target.value}` });
                    }} 
                    className="w-1/2 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold text-slate-800 shadow-sm"
                  >
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">ฤดูร้อน</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <h4 className="text-base sm:text-lg font-bold text-slate-800 flex items-center"><Clock className="mr-2 text-indigo-600 shrink-0" size={18} /> กำหนดเวลาและวันที่เช็คชื่อ</h4>
          <button onClick={() => { setEditTimeForm(courseTimeSettings); setShowSetTimeModal(true); }} className="text-sm bg-indigo-50 text-indigo-600 font-bold px-4 py-2 rounded-lg hover:bg-indigo-100 transition shadow-sm w-full sm:w-auto text-center">แก้ไขเวลา</button>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-5">
          <div className="border border-green-200 bg-green-50 p-3 sm:p-5 rounded-xl shadow-sm"><span className="text-green-600 font-bold text-[10px] sm:text-sm block mb-1">ตรงเวลา</span><span className="text-lg sm:text-2xl font-bold text-green-800">{courseTimeSettings.start} <span className="hidden sm:inline">น.</span></span></div>
          <div className="border border-yellow-200 bg-yellow-50 p-3 sm:p-5 rounded-xl shadow-sm"><span className="text-yellow-600 font-bold text-[10px] sm:text-sm block mb-1">สาย</span><span className="text-lg sm:text-2xl font-bold text-yellow-800">{courseTimeSettings.late} <span className="hidden sm:inline">น.</span></span></div>
          <div className="border border-red-200 bg-red-50 p-3 sm:p-5 rounded-xl shadow-sm"><span className="text-red-600 font-bold text-[10px] sm:text-sm block mb-1">ขาดเรียน</span><span className="text-lg sm:text-2xl font-bold text-red-800">{courseTimeSettings.absent} <span className="hidden sm:inline">น.</span></span></div>
        </div>

        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold mb-5 ${scanStatus.isOpen ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-slate-100 border border-slate-200 text-slate-500'}`}>
          <div className={`w-2.5 h-2.5 rounded-full ${scanStatus.isOpen ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-slate-400'}`}></div>
          <span>{scanStatus.label}</span>
        </div>

        <div className="border-t border-slate-100 pt-5">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 sm:p-5 md:p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-5">
              <div>
                <p className="text-[15px] font-bold text-slate-700 flex items-center">
                  <Calendar size={18} className="mr-2 text-indigo-500" /> วันที่เปิดให้เช็คชื่อ
                  {scheduledDates.length > 0 && <span className="ml-2 bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-full">{scheduledDates.length} วัน</span>}
                </p>
                <p className="text-sm text-slate-500 mt-1">กำหนดตารางทั้งเทอม หรือเพิ่มวันพิเศษได้จากส่วนนี้</p>
              </div>
              <div className="flex flex-wrap gap-2.5 w-full lg:w-auto">
                <button onClick={() => { setGenerateForm({ selectedDays: [], startDate: '', endDate: '' }); setShowGenerateModal(true); }} className="text-sm bg-indigo-600 text-white font-bold px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition shadow-sm flex items-center justify-center min-w-[170px]">
                  สร้างตารางอัตโนมัติ
                </button>
                <button onClick={() => { setNewDateForm({ date: '', note: '' }); setShowAddDateModal(true); }} className="text-sm bg-white text-indigo-600 border border-indigo-200 font-bold px-4 py-2.5 rounded-xl hover:bg-indigo-50 transition shadow-sm flex items-center justify-center min-w-[140px]">
                  <Plus size={15} className="mr-1.5" /> เพิ่มวันเดี่ยว
                </button>
                {scheduledDates.length > 0 && (
                  <button onClick={handleClearAllDates} className="text-sm bg-white text-red-500 border border-red-200 font-bold px-4 py-2.5 rounded-xl hover:bg-red-50 transition shadow-sm flex items-center justify-center min-w-[130px]">
                    <Trash2 size={15} className="mr-1.5" /> ล้างทั้งหมด
                  </button>
                )}
              </div>
            </div>

            {scheduledDates.length === 0 ? (
              <div className="bg-white border border-slate-200 border-dashed rounded-2xl p-10 text-center">
                <Calendar size={36} className="mx-auto text-slate-300 mb-3" />
                <p className="font-bold text-slate-500 text-base">ยังไม่มีวันที่กำหนดเช็คชื่อ</p>
                <p className="text-slate-400 text-sm mt-2 leading-relaxed">กดปุ่ม <span className="font-bold text-indigo-600">"สร้างตารางอัตโนมัติ"</span> เพื่อเลือกวันในสัปดาห์ + ช่วงเทอม<br />หรือกด "เพิ่มวันเดี่ยว" สำหรับวันพิเศษ เช่น สอนชดเชย</p>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-5">
                  <div className="bg-white border border-indigo-100 rounded-2xl px-3 sm:px-5 py-3 sm:py-4 text-center shadow-sm">
                    <p className="text-2xl sm:text-3xl font-extrabold text-indigo-700 leading-none">{scheduledDates.filter(d => !isDatePast(d.date)).length}</p>
                    <p className="text-[10px] sm:text-xs font-bold text-indigo-500 mt-1.5 sm:mt-2 uppercase tracking-wide">วันที่เหลือ</p>
                  </div>
                  <div className="bg-white border border-emerald-100 rounded-2xl px-3 sm:px-5 py-3 sm:py-4 text-center shadow-sm">
                    <p className="text-2xl sm:text-3xl font-extrabold text-emerald-700 leading-none">{scheduledDates.filter(d => isDatePast(d.date)).length}</p>
                    <p className="text-[10px] sm:text-xs font-bold text-emerald-500 mt-1.5 sm:mt-2 uppercase tracking-wide">ผ่านไปแล้ว</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl px-3 sm:px-5 py-3 sm:py-4 text-center shadow-sm">
                    <p className="text-2xl sm:text-3xl font-extrabold text-slate-700 leading-none">{scheduledDates.length}</p>
                    <p className="text-[10px] sm:text-xs font-bold text-slate-500 mt-1.5 sm:mt-2 uppercase tracking-wide">ทั้งหมด</p>
                  </div>
                </div>

                <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                  {scheduledDates.map((item, idx) => {
                    const past = isDatePast(item.date);
                    const today = isDateToday(item.date);
                    return (
                      <div key={item.id} className={`flex items-center justify-between px-3 sm:px-5 py-3 sm:py-4 rounded-xl border shadow-sm transition-all ${today ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-200' : past ? 'bg-white border-slate-200 opacity-55' : 'bg-white border-slate-200 hover:border-indigo-200'}`}>
                        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                          <span className={`text-xs font-bold w-5 sm:w-7 text-center shrink-0 ${past ? 'text-slate-400' : 'text-slate-500'}`}>{idx + 1}</span>
                          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${today ? 'bg-indigo-600 text-white' : past ? 'bg-slate-200 text-slate-400' : 'bg-indigo-100 text-indigo-600'}`}>
                            <Calendar size={14} className="sm:hidden" />
                            <Calendar size={16} className="hidden sm:block" />
                          </div>
                          <div className="min-w-0">
                            <p className={`font-bold text-sm sm:text-[15px] truncate ${today ? 'text-indigo-800' : past ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                              {formatThaiDate(item.date)}
                              {today && <span className="ml-1.5 sm:ml-2 text-[10px] bg-indigo-600 text-white px-1.5 sm:px-2 py-0.5 rounded-full font-bold animate-pulse">วันนี้</span>}
                            </p>
                            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 truncate">{item.note || (item.auto ? 'สร้างอัตโนมัติ' : 'เพิ่มเอง')}</p>
                          </div>
                        </div>
                        <button onClick={() => setDateToDelete(item)} className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 sm:p-2 rounded-lg transition shrink-0 ml-2" title="ลบวัน">
                          <Trash2 size={14} className="sm:hidden" />
                          <Trash2 size={16} className="hidden sm:block" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <h4 className="text-base sm:text-lg font-bold text-slate-800 flex items-center"><MapPin className="mr-2 text-indigo-600 shrink-0" size={18} /> กำหนดพิกัดและพื้นที่เช็กชื่อ</h4>
          <button onClick={() => { setEditLocationForm(locationSettings); setShowSetLocationModal(true); }} className="text-sm bg-indigo-50 text-indigo-600 font-bold px-4 py-2 rounded-lg hover:bg-indigo-100 transition shadow-sm flex items-center w-full sm:w-auto justify-center"><Target size={14} className="mr-1.5" /> ตั้งค่าพิกัด</button>
        </div>
        <div className="bg-slate-50 p-4 sm:p-6 rounded-2xl border border-slate-100 flex flex-col md:flex-row gap-4 sm:gap-6 items-center shadow-sm">
          <div className="w-full md:w-1/3 h-48 sm:h-56 rounded-xl overflow-hidden shadow-inner border border-slate-300 relative z-0">
            {locationSettings.lat && locationSettings.lng ? (
              <MapContainer
                center={[parseFloat(locationSettings.lat), parseFloat(locationSettings.lng)]}
                zoom={17}
                scrollWheelZoom={false}
                dragging={false}
                zoomControl={false}
                attributionControl={false}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <ChangeMapView center={[parseFloat(locationSettings.lat), parseFloat(locationSettings.lng)]} />
                <Marker position={[parseFloat(locationSettings.lat), parseFloat(locationSettings.lng)]} />
                <Circle
                  center={[parseFloat(locationSettings.lat), parseFloat(locationSettings.lng)]}
                  radius={locationSettings.radius || 50}
                  pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.15 }}
                />
              </MapContainer>
            ) : (
              <div className="w-full h-full bg-slate-200/50 flex flex-col items-center justify-center text-slate-400">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3">
                  <MapPin size={24} className="text-slate-300" />
                </div>
                <p className="font-bold text-sm text-slate-500">ยังไม่มีข้อมูลพิกัด</p>
                <p className="text-xs mt-1 font-medium text-slate-400">คลิกที่ "ตั้งค่าพิกัด" เพื่อระบุ</p>
              </div>
            )}
          </div>
          <div className="w-full md:w-2/3 space-y-3 sm:space-y-4">
            <div>
              <span className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wide">จุดอ้างอิงสถานที่</span>
              <p className={`font-bold text-base sm:text-lg mt-0.5 ${locationSettings.name ? 'text-slate-800' : 'text-slate-400 italic'}`}>
                {locationSettings.name || 'ยังไม่ได้ตั้งค่า'}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row flex-wrap gap-x-8 gap-y-2 sm:gap-y-3">
              <div>
                <span className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wide">พิกัด (Lat, Lng)</span>
                <p className={`font-medium mt-0.5 text-sm sm:text-base ${locationSettings.lat ? 'text-slate-700' : 'text-slate-400 italic'}`}>
                  {locationSettings.lat && locationSettings.lng ? `${locationSettings.lat}, ${locationSettings.lng}` : 'ยังไม่ได้ตั้งค่า'}
                </p>
              </div>
              <div><span className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wide">ระยะที่อนุญาต</span><p className="font-bold text-indigo-600 bg-indigo-100 px-2 sm:px-2.5 py-0.5 rounded-md mt-0.5 inline-block text-sm sm:text-base">รัศมี {locationSettings.radius} เมตร</p></div>
              <div><span className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wide">เกณฑ์การขาดเรียน</span><p className="font-bold text-rose-600 bg-rose-100 px-2 sm:px-2.5 py-0.5 rounded-md mt-0.5 inline-block text-sm sm:text-base">ขาดได้ไม่เกิน {maxAbsences} ครั้ง</p></div>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-base sm:text-lg font-bold text-slate-800 flex items-center"><AlertTriangle className="mr-2 text-rose-500 shrink-0" size={18} /> จัดการสถานะคลาสเรียน</h4>
        </div>
        <div className={`border rounded-2xl p-4 sm:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all shadow-sm ${isClassCanceled ? 'bg-slate-50 border-slate-200' : 'bg-rose-50/50 border-rose-200'}`}>
          <div>
            <h5 className={`font-bold mb-1 ${isClassCanceled ? 'text-slate-700' : 'text-rose-800'}`}>{isClassCanceled ? 'คลาสเรียนวันนี้ถูกยกเลิกแล้ว' : 'ยกเลิกคลาสเรียน (Cancel Class)'}</h5>
            <p className={`text-sm font-medium ${isClassCanceled ? 'text-slate-500' : 'text-rose-600/80'}`}>ปิดการสแกนใบหน้าสำหรับวันนี้ และส่งแจ้งเตือนไปยังนักศึกษาทั้งหมดทันที</p>
          </div>
          {isClassCanceled ? (
            <button onClick={() => setIsClassCanceled(false)} className="bg-white text-slate-700 border border-slate-200 font-bold px-6 py-3 rounded-xl hover:bg-slate-100 transition shadow-sm shrink-0 w-full md:w-auto">ยกเลิกการยกคลาส (เปิดปกติ)</button>
          ) : (
            <button onClick={() => setShowCancelClassConfirm(true)} className="bg-rose-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-rose-600 transition shadow-md active:scale-95 shrink-0 w-full md:w-auto">แจ้งยกคลาสเรียนวันนี้</button>
          )}
        </div>
      </div>
    </div>
  );
}
