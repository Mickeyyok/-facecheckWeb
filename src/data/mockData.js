export const mockStudentData = {
  stats: { present: 15, late: 2, absent: 0 },
  activeCourseStats: { courseName: 'Software Engineering', present: 15, late: 2, absent: 0 },
  overallStats: { present: 42, late: 5, absent: 1 },
  history: [
    { id: 1, course: 'SP344 Software Eng.', time: '09:05', status: 'late', date: '19 มี.ค. 2026' },
    { id: 2, course: 'IT201 Database', time: '13:00', status: 'present', date: '18 มี.ค. 2026' },
  ],
  todaySchedule: [
    { id: 'SP344', name: 'Software Engineering', time: '09:00 - 12:00', room: '21509', status: 'active' },
    { id: 'IT201', name: 'Mobile App Dev', time: '13:00 - 16:00', room: '21402', status: 'upcoming' }
  ],
  upcomingAlert: { show: true, course: 'Software Engineering', timeRemaining: '15 นาที' }
};

export const mockStudentList = [
  { id: '640001', name: 'นายกฤษณะ สุริยวงษ์', status: 'present', time: '09:00', aiRisk: 'low', absentCount: 0 },
  { id: '640002', name: 'นายวนนนท์ แสงทอง', status: 'absent', time: '-', aiRisk: 'high', absentCount: 3 },
  { id: '640003', name: 'นายคฑาพงษ์ มากรุง', status: 'late', time: '09:25', aiRisk: 'low', absentCount: 0 },
];

export const mockCourseInfo = {
  name: 'Software Engineering',
  code: 'SP344',
  instructor: 'อ. น้ำฝน อัศวเมฆิน',
  room: '21509',
  term: '2568 / 1'
};