import { useState, useEffect } from "react";
import { ViewDepartment } from "@/api/departmentApi";
import { ListDoctors, ListUsers } from "@/api/userApi";
import { CreateAppointment } from "@/api/appointmentApi";
import { ViewSchedule } from "@/api/scheduleApi"; 
import type { ViewDepartmentDto } from "@/types/department";
import type { DoctorDisplayDto, UserDisplayDto } from "@/types/user";
import type { ViewSchedule as ViewScheduleDto } from "@/types/schedule"; 

export default function SimpleAppointmentBooking() {
  const [departments, setDepartments] = useState<ViewDepartmentDto[]>([]);
  const [doctors, setDoctors] = useState<DoctorDisplayDto[]>([]);
  const [users, setUsers] = useState<UserDisplayDto[]>([]);
  const [schedules, setSchedules] = useState<ViewScheduleDto[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showDeptList, setShowDeptList] = useState(false);
  const [expandedDepts, setExpandedDepts] = useState<Set<number>>(new Set());
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorDisplayDto | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ doctorId: number; dateTime: string } | null>(null);
  const [patientName, setPatientName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(today.setDate(diff));
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
    const [deptData, doctorData, userData, scheduleData] = await Promise.all([
        ViewDepartment(),
        ListDoctors(),
        ListUsers(),
        ViewSchedule() 
      ]);
      
      const normalizedUsers = userData.map((user: any) => ({
        UserId: user.UserId ?? user.userId ?? user.id ?? user.Id,
        UserName: user.UserName ?? user.userName ?? user.name ?? user.Name,
        Role: user.Role ?? user.role,
      }));

      // NEW: Map and normalize schedule data safely
      const normalizedSchedules = (scheduleData || []).map((s: any, index: number) => ({
        ScheduleId: s.ScheduleId ?? s.scheduleId ?? s.id ?? `fallback-${index}`,
        DoctorId: s.DoctorId ?? s.doctorId,
        StartTime: s.StartTime ?? s.startTime,
        EndTime: s.EndTime ?? s.endTime,
        SlotDurationMin: s.SlotDurationMin ?? s.slotDurationMin ?? 30,
      }));
      
      setDepartments(deptData.filter(d => d.isActive));
      setDoctors(doctorData);
      setUsers(normalizedUsers as UserDisplayDto[]);
      setSchedules(normalizedSchedules as ViewScheduleDto[]); // Save schedules
    } catch (error) {
      showNotification("error", "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const buildCurrentDoctors = () => {
    if (users.length === 0) return [];
    
    const doctorUsers = users.filter(u => u.Role === "Doctor");
    if (doctorUsers.length === 0) return [];
    
    return doctorUsers.map(user => {
      const doctorRecord = doctors.find(d => {
        const dUserId = (d as any).UserId ?? (d as any).userId ?? d.UserId;
        return String(dUserId) === String(user.UserId);
      });
      
      if (doctorRecord) {
        return {
          DoctorId: (doctorRecord as any).DoctorId ?? (doctorRecord as any).doctorId ?? doctorRecord.DoctorId,
          UserId: (doctorRecord as any).UserId ?? (doctorRecord as any).userId ?? doctorRecord.UserId,
          Name: user.UserName || (doctorRecord as any).Name || (doctorRecord as any).name || doctorRecord.Name,
          DeparmentId: (doctorRecord as any).DeparmentId ?? (doctorRecord as any).deparmentId ?? (doctorRecord as any).departmentId ?? doctorRecord.DeparmentId ?? 0,
          IsActive: (doctorRecord as any).IsActive ?? (doctorRecord as any).isActive ?? doctorRecord.IsActive ?? false,
        } as DoctorDisplayDto;
      } else {
        return {
          DoctorId: user.UserId,
          UserId: user.UserId,
          Name: user.UserName,
          DeparmentId: 0,
          IsActive: false,
        } as DoctorDisplayDto;
      }
    });
  };

  const currentDoctors = buildCurrentDoctors();

  const getDoctorsByDepartment = (deptId: number) => {
    return currentDoctors.filter(d => d.DeparmentId === deptId && d.IsActive);
  };

  const toggleExpand = (deptId: number) => {
    const newExpanded = new Set(expandedDepts);
    if (newExpanded.has(deptId)) {
      newExpanded.delete(deptId);
    } else {
      newExpanded.add(deptId);
    }
    setExpandedDepts(newExpanded);
  };

  const handleDoctorClick = (doctor: DoctorDisplayDto) => {
    setSelectedDoctor(doctor);
  };

  const generateWeekDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      days.push(date);
    }
    return days;
  };

 const generateTimeSlots = (doctorId: number) => {
    const schedule = schedules.find(s => s.DoctorId === doctorId);
    if (!schedule) return []; 

    const startDate = new Date(schedule.StartTime);
    const endDate = new Date(schedule.EndTime);
    
   if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return [];

    const startHour = startDate.getUTCHours();
    const endHour = endDate.getUTCHours();
    const slotDuration = schedule.SlotDurationMin || 30;

    const slots: string[] = [];
    let currentMinutes = startHour * 60; 
    const endMinutes = endHour * 60;    

   while (currentMinutes < endMinutes) {
      const h = Math.floor(currentMinutes / 60);
      const m = currentMinutes % 60;
      const timeString = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      slots.push(timeString);
      currentMinutes += slotDuration;
    }

    return slots;
  };

  const formatDate = (date: Date) => {
    const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
    const dateStr = date.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit' });
    return `${weekday}, ${dateStr}`;
  };

  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeekStart(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeekStart(newDate);
  };

  const handleSlotClick = (doctorId: number, date: Date, time: string) => {
    const [hours, minutes] = time.split(':');
    const dateTime = new Date(date);
    dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    setSelectedSlot({ doctorId, dateTime: dateTime.toISOString() });
    setShowConfirmModal(true);
  };

  const handleCreateAppointment = async () => {
    if (!selectedSlot || !patientName || !phoneNumber || !dateOfBirth) {
      showNotification("error", "Please fill in all patient details");
      return;
    }

    const result = await CreateAppointment({
      DoctorId: selectedSlot.doctorId,
      PatientName: patientName,
      PhoneNumber: phoneNumber,
      DateOfBirth: dateOfBirth,
      AppointmentTime: selectedSlot.dateTime,
    });

    if (result.isSuccess) {
      showNotification("success", "Appointment created successfully");
      setShowConfirmModal(false);
      setSelectedSlot(null);
      setPatientName("");
      setPhoneNumber("");
      setDateOfBirth("");
      loadData();
    } else {
      showNotification("error", result.error || "Failed to create appointment");
    }
  };

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const getDepartmentName = (deptId: number) => {
    return departments.find(d => d.id === deptId)?.name || '';
  };

  const weekDays = generateWeekDays();
  const timeSlots = selectedDoctor ? generateTimeSlots(selectedDoctor.DoctorId) : [];

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
        <style>{`
          .loading-container {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #0a4d68 0%, #088395 100%);
            color: white;
            font-family: 'Poppins', sans-serif;
            gap: 1.5rem;
          }
          .loading-spinner {
            width: 60px;
            height: 60px;
            border: 4px solid rgba(255, 255, 255, 0.2);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=DM+Serif+Display&display=swap');
        
        :root {
          --primary: #0a4d68;
          --secondary: #088395;
          --accent: #05bfdb;
          --success: #00d9a5;
          --danger: #ff5252;
          --bg: #f8fafc;
          --surface: #ffffff;
          --text: #1e293b;
          --text-muted: #64748b;
          --border: #e2e8f0;
          --shadow: rgba(10, 77, 104, 0.08);
          --shadow-lg: rgba(10, 77, 104, 0.15);
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif;
          background: var(--bg);
          color: var(--text);
          line-height: 1.6;
        }

        .booking-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fafc 0%, #e0f2f7 100%);
        }

        .header {
          background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
          color: white;
          padding: 2.5rem 2rem;
          box-shadow: 0 4px 20px var(--shadow-lg);
          position: relative;
          overflow: hidden;
        }

        .header::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -10%;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
          border-radius: 50%;
        }

        .header-content {
          max-width: 1200px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .header h1 {
          font-family: 'DM Serif Display', serif;
          font-size: 3rem;
          font-weight: 400;
          margin-bottom: 0.5rem;
          letter-spacing: -0.5px;
        }

        .header p {
          font-size: 1.1rem;
          opacity: 0.95;
          font-weight: 300;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }

        .section {
          background: var(--surface);
          border-radius: 20px;
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 2px 16px var(--shadow);
          border: 1px solid var(--border);
          animation: slideUp 0.6s ease-out;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid var(--border);
          flex-wrap: wrap;
          gap: 1rem;
        }

        .section-title {
          font-family: 'DM Serif Display', serif;
          font-size: 2rem;
          color: var(--primary);
          font-weight: 400;
        }

        .section-subtitle {
          font-size: 0.95rem;
          color: var(--text-muted);
          margin-top: 0.25rem;
        }

        .dept-card {
          background: white;
          border: 2px solid var(--border);
          border-radius: 16px;
          padding: 1.5rem;
          margin-bottom: 1rem;
          transition: all 0.3s ease;
        }

        .dept-card:hover {
          border-color: var(--accent);
          box-shadow: 0 4px 16px var(--shadow);
        }

        .dept-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .dept-info h3 {
          font-size: 1.5rem;
          color: var(--primary);
          margin-bottom: 0.5rem;
          font-weight: 600;
        }

        .dept-meta {
          display: flex;
          gap: 1rem;
          align-items: center;
          flex-wrap: wrap;
        }

        .dept-actions {
          display: flex;
          gap: 0.5rem;
        }

        .doctor-list {
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 2px solid var(--border);
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .doctor-item {
          background: var(--bg);
          padding: 1rem 1.5rem;
          border-radius: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 2px solid transparent;
        }

        .doctor-item:hover {
          background: white;
          border-color: var(--accent);
          transform: translateX(4px);
          box-shadow: 0 2px 8px var(--shadow);
        }

        .doctor-item.selected {
          background: linear-gradient(135deg, rgba(10, 77, 104, 0.1) 0%, rgba(8, 131, 149, 0.1) 100%);
          border-color: var(--primary);
          box-shadow: 0 4px 12px var(--shadow);
        }

        .doctor-item-content {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .doctor-avatar-small {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.125rem;
          font-weight: 700;
          box-shadow: 0 2px 8px var(--shadow);
        }

        .doctor-name {
          font-weight: 600;
          color: var(--text);
          font-size: 1rem;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          padding: 0.375rem 0.875rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .badge-success {
          background: rgba(0, 217, 165, 0.15);
          color: var(--success);
        }

        .badge-scheduled {
          background: rgba(59, 130, 246, 0.15);
          color: #3b82f6;
        }

        .badge-cancelled {
          background: rgba(255, 82, 82, 0.15);
          color: var(--danger);
        }

        .badge-inactive {
          background: rgba(100, 116, 139, 0.15);
          color: var(--text-muted);
        }

        .btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: 'Poppins', sans-serif;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }

        .btn-primary {
          background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(8, 131, 149, 0.3);
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(8, 131, 149, 0.4);
        }

        .btn-secondary {
          background: var(--bg);
          color: var(--primary);
          border: 2px solid var(--border);
        }

        .btn-secondary:hover {
          background: white;
          border-color: var(--primary);
        }

        .btn-sm {
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .schedule-section {
          background: var(--surface);
          border-radius: 16px;
          padding: 0;
          box-shadow: none;
          border: none;
        }

        .schedule-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding-bottom: 1.5rem;
          border-bottom: 2px solid var(--border);
          flex-wrap: wrap;
          gap: 1rem;
        }

        .doctor-info {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .doctor-avatar {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.75rem;
          font-weight: 700;
          box-shadow: 0 4px 12px var(--shadow);
        }

        .doctor-details h3 {
          font-size: 1.5rem;
          color: var(--primary);
          font-weight: 600;
          margin-bottom: 0.25rem;
        }

        .doctor-details p {
          color: var(--text-muted);
          font-size: 0.95rem;
        }

        .week-nav {
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }

        .nav-btn {
          background: white;
          border: 2px solid var(--border);
          padding: 0.75rem 1.5rem;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 600;
          color: var(--primary);
          transition: all 0.2s;
          font-family: 'Poppins', sans-serif;
          font-size: 0.95rem;
        }

        .nav-btn:hover {
          border-color: var(--accent);
          background: #f0fdff;
        }

        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }

        .day-header {
          text-align: center;
          padding: 1rem;
          background: linear-gradient(135deg, rgba(10, 77, 104, 0.05) 0%, rgba(8, 131, 149, 0.05) 100%);
          border-radius: 12px;
          border: 2px solid var(--border);
        }

        .day-name {
          font-weight: 600;
          color: var(--primary);
          font-size: 0.875rem;
          text-transform: uppercase;
          margin-bottom: 0.25rem;
        }

        .day-date {
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        .slots-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 0.75rem;
        }

        .day-column {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .time-slot {
          background: white;
          border: 2px solid var(--accent);
          border-radius: 10px;
          padding: 1rem 0.5rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
          font-weight: 600;
          color: var(--primary);
          font-size: 0.875rem;
          position: relative;
          box-shadow: 0 2px 4px rgba(5, 191, 219, 0.1);
        }

        .time-slot:hover {
          background: #f0fdff;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(5, 191, 219, 0.2);
          border-color: var(--secondary);
        }

        .time-slot::before {
          content: '✓';
          position: absolute;
          left: 0.5rem;
          top: 0.5rem;
          color: var(--success);
          font-size: 0.75rem;
        }

        .empty-slot {
          min-height: 65px;
          background: var(--bg);
          border: 2px dashed var(--border);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #cbd5e1;
          font-size: 1.5rem;
        }

        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          color: var(--text-muted);
        }

        .empty-state-icon {
          font-size: 5rem;
          margin-bottom: 1.5rem;
          opacity: 0.3;
        }

        .empty-state h3 {
          font-size: 1.5rem;
          color: var(--text);
          margin-bottom: 0.5rem;
          font-weight: 600;
        }

        .empty-state p {
          font-size: 1.05rem;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(10, 77, 104, 0.4);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 50;
          padding: 1rem;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .modal-content {
          background: white;
          border-radius: 20px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          max-width: 500px;
          width: 100%;
          overflow: hidden;
          animation: scaleIn 0.3s ease-out;
        }

        @keyframes scaleIn {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        .modal-header {
          background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
          color: white;
          padding: 2rem;
          position: relative;
          overflow: hidden;
        }

        .modal-header::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -20%;
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
          border-radius: 50%;
        }

        .modal-header-content {
          position: relative;
          z-index: 1;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-title {
          font-family: 'DM Serif Display', serif;
          font-size: 1.75rem;
          font-weight: 400;
        }

        .btn-close {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 8px;
          transition: all 0.2s;
          font-size: 1.5rem;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-close:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .modal-body {
          padding: 2rem;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text);
          margin-bottom: 0.5rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .appointment-info {
          background: var(--bg);
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          border: 2px solid var(--border);
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 0.75rem 0;
          border-bottom: 1px solid var(--border);
        }

        .info-row:last-child {
          border-bottom: none;
        }

        .info-label {
          color: var(--text-muted);
          font-size: 0.875rem;
          font-weight: 500;
        }

        .info-value {
          font-weight: 600;
          color: var(--primary);
        }

        .form-input {
          width: 100%;
          padding: 1rem 1.25rem;
          border: 2px solid var(--border);
          border-radius: 12px;
          font-size: 1rem;
          font-family: 'Poppins', sans-serif;
          transition: all 0.3s ease;
        }

        .form-input:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(5, 191, 219, 0.1);
        }

        .modal-actions {
          display: flex;
          gap: 1rem;
          margin-top: 1.5rem;
        }

        .btn {
          padding: 1rem 2rem;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: 'Poppins', sans-serif;
          flex: 1;
        }

        .btn-primary {
          background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(8, 131, 149, 0.3);
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(8, 131, 149, 0.4);
        }

        .btn-secondary {
          background: var(--bg);
          color: var(--primary);
          border: 2px solid var(--border);
        }

        .btn-secondary:hover {
          background: white;
          border-color: var(--primary);
        }

        .notification {
          position: fixed;
          top: 2rem;
          right: 2rem;
          padding: 1.25rem 1.75rem;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
          animation: slideInRight 0.4s ease;
          z-index: 1000;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-weight: 500;
          max-width: 400px;
        }

        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .notification-success {
          background: var(--success);
          color: white;
        }

        .notification-error {
          background: var(--danger);
          color: white;
        }

        @media (max-width: 1024px) {
          .calendar-grid,
          .slots-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        @media (max-width: 768px) {
          .header h1 {
            font-size: 2rem;
          }

          .calendar-grid,
          .slots-grid {
            grid-template-columns: repeat(3, 1fr);
          }

          .schedule-header {
            flex-direction: column;
            align-items: flex-start;
          }
        }

        @media (max-width: 480px) {
          .calendar-grid,
          .slots-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        .btn-logout {
          padding: 0.6rem 1.4rem;
          border: 2px solid rgba(255, 255, 255, 0.55);
          border-radius: 10px;
          background: transparent;
          color: white;
          font-family: 'Poppins', sans-serif;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          letter-spacing: 0.3px;
          transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          white-space: nowrap;
          align-self: flex-start;
          margin-top: 0.25rem;
        }
        
        .btn-logout:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.85);
          transform: translateY(-1px);
        }
      `}</style>

    <div className="booking-page">
        {/* --- BOOKING PAGE HEADER --- */}
        <div className="header">
          <div className="header-content">
            
            <div className="header-text">
              <h1>Book Appointment</h1>
              <p>Select department and doctor to book an appointment</p>
            </div>
            
            <button
              className="btn-logout"
              onClick={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("role");
                window.location.href = "/";
              }}
            >
              ↩ Logout
            </button>

          </div>
        </div>

        <div className="container">
          {/* Department Selection Section */}
          <div className="section">
            <div className="section-header">
              <div>
                <h2 className="section-title">Select Doctor</h2>
                <p className="section-subtitle">Browse departments and choose a doctor</p>
              </div>
              <button
                className={showDeptList ? "btn btn-secondary" : "btn btn-primary"}
                onClick={() => setShowDeptList(!showDeptList)}
              >
                {showDeptList ? "Hide Departments" : "Show Departments"}
              </button>
            </div>

            {showDeptList && (
              <>
                {departments.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">🏥</div>
                    <p>No departments found</p>
                  </div>
                ) : (
                  departments.map((dept) => (
                    <div key={dept.id} className="dept-card">
                      <div className="dept-header">
                        <div className="dept-info">
                          <h3>{dept.name}</h3>
                          <div className="dept-meta">
                            <span className="badge badge-success">
                              ● Active
                            </span>
                            <span>{getDoctorsByDepartment(dept.id).length} Doctors</span>
                          </div>
                        </div>
                        <div className="dept-actions">
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => toggleExpand(dept.id)}
                          >
                            {expandedDepts.has(dept.id) ? "Hide Doctors ▲" : "Show Doctors ▼"}
                          </button>
                        </div>
                      </div>

                      {expandedDepts.has(dept.id) && (
                        <div className="doctor-list">
                          {getDoctorsByDepartment(dept.id).length === 0 ? (
                            <div className="empty-state">
                              <p>No doctors in this department</p>
                            </div>
                          ) : (
                            getDoctorsByDepartment(dept.id).map((doctor) => (
                              <div
                                key={doctor.DoctorId}
                                className={`doctor-item ${selectedDoctor?.DoctorId === doctor.DoctorId ? 'selected' : ''}`}
                                onClick={() => handleDoctorClick(doctor)}
                              >
                                <div className="doctor-item-content">
                                  <div className="doctor-avatar-small">
                                    {doctor.Name.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="doctor-name">Dr. {doctor.Name}</span>
                                </div>
                                <span className="badge badge-success">
                                  Active
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </>
            )}
          </div>

          {/* Doctor Schedule Section */}
          {selectedDoctor && (
            <div className="section">
              <div className="schedule-section">
                <div className="schedule-header">
                  <div className="doctor-info">
                    <div className="doctor-avatar">
                      {selectedDoctor.Name.charAt(0).toUpperCase()}
                    </div>
                    <div className="doctor-details">
                      <h3>Dr. {selectedDoctor.Name}</h3>
                      <p>{getDepartmentName(selectedDoctor.DeparmentId)}</p>
                    </div>
                  </div>
                  
                  <div className="week-nav">
                    <button onClick={goToPreviousWeek} className="nav-btn">
                      ← Previous Week
                    </button>
                    <button onClick={goToNextWeek} className="nav-btn">
                      Next Week →
                    </button>
                  </div>
                </div>

                {/* Calendar Header */}
                <div className="calendar-grid">
                  {weekDays.map((day, idx) => (
                    <div key={idx} className="day-header">
                      <div className="day-name">{formatDate(day).split(',')[0]}</div>
                      <div className="day-date">{formatDate(day).split(',')[1]}</div>
                    </div>
                  ))}
                </div>

                {/* Time Slots */}
                <div className="slots-grid">
                  {weekDays.map((day, dayIdx) => (
                    <div key={dayIdx} className="day-column">
                      {/* Show slots Monday through Friday (0-4) */}
                      {dayIdx >= 0 && dayIdx <= 4 ? (
                        timeSlots.length > 0 ? (
                          timeSlots.map((time, timeIdx) => (
                            <div
                              key={timeIdx}
                              className="time-slot"
                              onClick={() => handleSlotClick(selectedDoctor.DoctorId, day, time)}
                            >
                              {time}
                            </div>
                          ))
                        ) : (
                          <div className="empty-slot" style={{ fontSize: '0.85rem' }}>No Schedule</div>
                        )
                      ) : (
                        <div className="empty-slot">⚊</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Confirmation Modal */}
        {showConfirmModal && selectedSlot && selectedDoctor && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <div className="modal-header-content">
                  <h3 className="modal-title">Confirm Appointment</h3>
                  <button
                    onClick={() => {
                      setShowConfirmModal(false);
                      setSelectedSlot(null);
                      setPatientName("");
                      setPhoneNumber("");
                      setDateOfBirth("");
                    }}
                    className="btn-close"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="modal-body">
                <div className="appointment-info">
                  <div className="info-row">
                    <span className="info-label">Doctor</span>
                    <span className="info-value">Dr. {selectedDoctor.Name}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Date & Time</span>
                    <span className="info-value">
                      {new Date(selectedSlot.dateTime).toLocaleString('en-US', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Patient Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter patient name..."
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="Enter phone number..."
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Date of Birth</label>
                  <input
                    type="date"
                    className="form-input"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                  />
                </div>

                <div className="modal-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowConfirmModal(false);
                      setSelectedSlot(null);
                      setPatientName("");
                      setPhoneNumber("");
                      setDateOfBirth("");
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleCreateAppointment}
                  >
                    Book Appointment
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notification */}
        {notification && (
          <div className={`notification notification-${notification.type}`}>
            {notification.type === "success" ? "✓" : "✕"} {notification.message}
          </div>
        )}
      </div>
    </>
  );
}