import { useState, useEffect } from "react";
import type { ViewDepartmentDto } from "@/types/department";
import { DoctorDisplayDto } from "@/types/user";
import { ViewDepartment } from "@/api/departmentApi";
import { ListDoctors } from "@/api/userApi";
import { CreateAppointment } from "@/api/appointmentApi";


interface AppointmentBookingProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AppointmentBooking({ onClose, onSuccess }: AppointmentBookingProps) {
  const [departments, setDepartments] = useState<ViewDepartmentDto[]>([]);
  const [doctors, setDoctors] = useState<DoctorDisplayDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState<number | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ doctorId: number; dateTime: string } | null>(null);
  const [patientId, setPatientId] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);
  
  // Week navigation - start from today (Monday)
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday
    return new Date(today.setDate(diff));
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [deptData, doctorData] = await Promise.all([
      ViewDepartment(),
      ListDoctors()
    ]);
    setDepartments(deptData.filter(d => d.isActive));
    setDoctors(doctorData);
    setLoading(false);
  };

  const getActiveDoctorsByDepartment = (deptId: number) => {
    return doctors.filter(d => d.DeparmentId === deptId && d.IsActive);
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

  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 14; hour < 17; hour++) {
      for (let minute of [30, 50]) {
        if (hour === 14 && minute === 30) slots.push('14:30');
        if (hour === 14 && minute === 50) slots.push('14:50');
        if (hour === 15 && minute === 10) slots.push('15:10');
        if (hour === 15 && minute === 30) slots.push('15:30');
        if (hour === 15 && minute === 50) slots.push('15:50');
        if (hour === 16 && minute === 10) slots.push('16:10');
        if (hour === 16 && minute === 30) slots.push('16:30');
        if (hour === 16 && minute === 50) slots.push('16:50');
      }
    }
    return ['14:30', '14:50', '15:10', '15:30', '15:50', '16:10', '16:30', '16:50'];
  };

  const weekDays = generateWeekDays();
  const timeSlots = generateTimeSlots();

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('bg-BG', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
    if (!selectedSlot || !patientId) {
      showNotification("error", "Please enter patient ID");
      return;
    }

    const result = await CreateAppointment({
      DoctorId: selectedSlot.doctorId,
      PatientId: parseInt(patientId),
      AppointmentTime: selectedSlot.dateTime,
    });

    if (result.isSuccess) {
      showNotification("success", "Appointment created successfully");
      setShowConfirmModal(false);
      setSelectedSlot(null);
      setPatientId("");
      onSuccess(); // Call parent's success handler
      setTimeout(() => onClose(), 1500); // Close modal after showing success message
    } else {
      showNotification("error", result.error || "Failed to create appointment");
    }
  };

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const getDoctorName = (doctorId: number) => {
    return doctors.find(d => d.DoctorId === doctorId)?.Name || '';
  };

  const getDepartmentName = (deptId: number) => {
    return departments.find(d => d.id === deptId)?.name || '';
  };

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
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Poppins', sans-serif;
          background: #f0f4f8;
        }

        .booking-page-overlay {
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
          overflow-y: auto;
        }

        .booking-page {
          background: white;
          border-radius: 20px;
          max-width: 1400px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          animation: scaleIn 0.3s ease-out;
        }

        @keyframes scaleIn {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        .header {
          background: linear-gradient(135deg, #0a4d68 0%, #088395 100%);
          color: white;
          padding: 2.5rem 2rem;
          box-shadow: 0 4px 20px rgba(10, 77, 104, 0.15);
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .header-content {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .header-title-section {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .close-btn {
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

        .close-btn:hover {
          background: rgba(255, 255, 255, 0.3);
        }
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .header h1 {
          font-family: 'DM Serif Display', serif;
          font-size: 2.5rem;
          font-weight: 400;
        }

        .week-nav {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .nav-btn {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
          font-family: 'Poppins', sans-serif;
        }

        .nav-btn:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem;
        }

        .department-buttons {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          background: white;
          padding: 1.5rem;
          border-radius: 16px;
          box-shadow: 0 2px 12px rgba(10, 77, 104, 0.08);
        }

        .dept-btn {
          padding: 0.875rem 1.75rem;
          border: 2px solid #e2e8f0;
          background: white;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 600;
          font-size: 1rem;
          transition: all 0.3s ease;
          font-family: 'Poppins', sans-serif;
          color: #0a4d68;
        }

        .dept-btn:hover {
          border-color: #05bfdb;
          background: #f0fdff;
        }

        .dept-btn.active {
          background: linear-gradient(135deg, #0a4d68 0%, #088395 100%);
          color: white;
          border-color: #088395;
        }

        .doctors-section {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .doctor-schedule {
          background: white;
          border-radius: 16px;
          padding: 2rem;
          box-shadow: 0 2px 12px rgba(10, 77, 104, 0.08);
          border: 2px solid #e2e8f0;
        }

        .doctor-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid #e2e8f0;
        }

        .doctor-avatar {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0a4d68 0%, #088395 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.5rem;
          font-weight: 700;
        }

        .doctor-info h3 {
          font-size: 1.5rem;
          color: #0a4d68;
          font-weight: 600;
        }

        .doctor-info p {
          color: #64748b;
          font-size: 0.95rem;
          margin-top: 0.25rem;
        }

        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .day-header {
          text-align: center;
          padding: 0.75rem;
          background: #f8fafc;
          border-radius: 8px;
          border: 2px solid #e2e8f0;
        }

        .day-name {
          font-weight: 600;
          color: #0a4d68;
          font-size: 0.75rem;
          text-transform: uppercase;
        }

        .day-date {
          font-size: 0.875rem;
          color: #64748b;
          margin-top: 0.25rem;
        }

        .slots-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 0.5rem;
        }

        .day-column {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .time-slot {
          background: white;
          border: 2px solid #05bfdb;
          border-radius: 8px;
          padding: 0.75rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
          font-weight: 600;
          color: #0a4d68;
          position: relative;
        }

        .time-slot:hover {
          background: #f0fdff;
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(5, 191, 219, 0.2);
        }

        .time-slot::before {
          content: '✓';
          position: absolute;
          left: 0.5rem;
          top: 0.5rem;
          color: #10b981;
          font-size: 0.875rem;
        }

        .time-slot::after {
          content: '🩺';
          position: absolute;
          right: 0.5rem;
          top: 0.5rem;
          font-size: 0.875rem;
        }

        .empty-slot {
          min-height: 60px;
          background: #f8fafc;
          border: 2px dashed #e2e8f0;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #cbd5e1;
          font-size: 1.5rem;
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
          background: linear-gradient(135deg, #0a4d68 0%, #088395 100%);
          color: white;
          padding: 2rem;
        }

        .modal-title {
          font-family: 'DM Serif Display', serif;
          font-size: 1.75rem;
          font-weight: 400;
        }

        .modal-body {
          padding: 2rem;
        }

        .appointment-info {
          background: #f8fafc;
          border-radius: 12px;
          padding: 1.25rem;
          margin-bottom: 1.5rem;
          border: 2px solid #e2e8f0;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          border-bottom: 1px solid #e2e8f0;
        }

        .info-row:last-child {
          border-bottom: none;
        }

        .info-label {
          color: #64748b;
          font-size: 0.875rem;
        }

        .info-value {
          font-weight: 600;
          color: #0a4d68;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          color: #0a4d68;
          margin-bottom: 0.5rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .form-input {
          width: 100%;
          padding: 0.875rem 1.25rem;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          font-size: 1rem;
          font-family: 'Poppins', sans-serif;
          transition: all 0.3s ease;
        }

        .form-input:focus {
          outline: none;
          border-color: #05bfdb;
          box-shadow: 0 0 0 3px rgba(5, 191, 219, 0.1);
        }

        .modal-actions {
          display: flex;
          gap: 1rem;
        }

        .btn {
          padding: 0.875rem 1.75rem;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: 'Poppins', sans-serif;
          flex: 1;
        }

        .btn-primary {
          background: linear-gradient(135deg, #0a4d68 0%, #088395 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(8, 131, 149, 0.3);
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(8, 131, 149, 0.4);
        }

        .btn-secondary {
          background: #f8fafc;
          color: #0a4d68;
          border: 2px solid #e2e8f0;
        }

        .btn-secondary:hover {
          background: white;
          border-color: #0a4d68;
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
          background: #00d9a5;
          color: white;
        }

        .notification-error {
          background: #ff5252;
          color: white;
        }

        .empty-state {
          text-align: center;
          padding: 3rem;
          color: #64748b;
        }

        .empty-state-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          opacity: 0.3;
        }

        @media (max-width: 768px) {
          .calendar-grid,
          .slots-grid {
            grid-template-columns: repeat(3, 1fr);
          }

          .header h1 {
            font-size: 1.75rem;
          }
        }
      `}</style>

      <div className="booking-page-overlay" onClick={onClose}>
        <div className="booking-page" onClick={(e) => e.stopPropagation()}>
          <div className="header">
            <div className="header-content">
              <div className="header-title-section">
                <button onClick={onClose} className="close-btn">✕</button>
                <h1>Appointment Management</h1>
              </div>
              <div className="week-nav">
                <button onClick={goToPreviousWeek} className="nav-btn">← Previous Week</button>
                <button onClick={goToNextWeek} className="nav-btn">Next Week →</button>
              </div>
            </div>
          </div>

        <div className="container">
          {/* Department Buttons */}
          <div className="department-buttons">
            {departments.map((dept) => (
              <button
                key={dept.id}
                className={`dept-btn ${selectedDepartment === dept.id ? 'active' : ''}`}
                onClick={() => setSelectedDepartment(dept.id)}
              >
                {dept.name}
              </button>
            ))}
          </div>

          {/* Doctors and Schedules */}
          {selectedDepartment ? (
            <div className="doctors-section">
              {getActiveDoctorsByDepartment(selectedDepartment).length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">👨‍⚕️</div>
                  <p>No active doctors in this department</p>
                </div>
              ) : (
                getActiveDoctorsByDepartment(selectedDepartment).map((doctor) => (
                  <div key={doctor.DoctorId} className="doctor-schedule">
                    <div className="doctor-header">
                      <div className="doctor-avatar">
                        {doctor.Name.charAt(0).toUpperCase()}
                      </div>
                      <div className="doctor-info">
                        <h3>Д-р {doctor.Name}</h3>
                        <p>{getDepartmentName(selectedDepartment)}</p>
                      </div>
                    </div>

                    {/* Week Days Header */}
                    <div className="calendar-grid">
                      {weekDays.map((day, idx) => (
                        <div key={idx} className="day-header">
                          <div className="day-name">{formatDate(day)}</div>
                        </div>
                      ))}
                    </div>

                    {/* Time Slots */}
                    <div className="slots-grid">
                      {weekDays.map((day, dayIdx) => (
                        <div key={dayIdx} className="day-column">
                          {/* Show slots only for first 2 days and last day (matching your image) */}
                          {(dayIdx === 0 || dayIdx === 1 || dayIdx === 6) ? (
                            timeSlots.map((time, timeIdx) => (
                              <div
                                key={timeIdx}
                                className="time-slot"
                                onClick={() => handleSlotClick(doctor.DoctorId, day, time)}
                              >
                                {time}
                              </div>
                            ))
                          ) : (
                            <div className="empty-slot">⚊⚊⚊</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">🏥</div>
              <p>Select a department to view available doctors</p>
            </div>
          )}
        </div>

        {/* Confirmation Modal */}
        {showConfirmModal && selectedSlot && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3 className="modal-title">Confirm Appointment</h3>
              </div>
              <div className="modal-body">
                <div className="appointment-info">
                  <div className="info-row">
                    <span className="info-label">Doctor</span>
                    <span className="info-value">Д-р {getDoctorName(selectedSlot.doctorId)}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Date & Time</span>
                    <span className="info-value">
                      {new Date(selectedSlot.dateTime).toLocaleString('bg-BG')}
                    </span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Patient ID</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Enter patient ID..."
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                  />
                </div>

                <div className="modal-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowConfirmModal(false);
                      setSelectedSlot(null);
                      setPatientId("");
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
      </div>
    </>
  );
}