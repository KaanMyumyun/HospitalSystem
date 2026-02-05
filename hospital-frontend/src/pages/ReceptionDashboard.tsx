import { useState, useEffect } from "react";
import { ViewAppointment, CreateAppointment, CancelAppointment } from "@/api/appointmentApi";
import type { AppointmentStatus } from "@/types/appointmentStatus";
import type { ViewAppointmentDto } from "@/types/appointment";

export default function ReceptionDashboard() {
  const [appointments, setAppointments] = useState<ViewAppointmentDto[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<ViewAppointmentDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "All">("All");
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [selectedAppointment, setSelectedAppointment] = useState<ViewAppointmentDto | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [createForm, setCreateForm] = useState({
    DoctorId: "",
    PatientId: "",
    AppointmentTime: "",
  });

  const [cancelForm, setCancelForm] = useState({
    Reason: "",
  });

  useEffect(() => {
    loadAppointments();
  }, []);

  useEffect(() => {
    filterAppointments();
  }, [appointments, searchTerm, statusFilter]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const data = await ViewAppointment({} as ViewAppointmentDto);
      setAppointments(data);
    } catch (error) {
      showNotification("error", "Failed to load appointments");
    } finally {
      setLoading(false);
    }
  };

  const filterAppointments = () => {
    let filtered = appointments;

    if (searchTerm) {
      filtered = filtered.filter(
        (apt) =>
          apt.DoctorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          apt.PatientName?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
          apt.AppointmentId.toString().includes(searchTerm)
      );
    }

    if (statusFilter !== "All") {
      filtered = filtered.filter((apt) => apt.Status === statusFilter);
    }

    setFilteredAppointments(filtered);
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await CreateAppointment({
      DoctorId: parseInt(createForm.DoctorId),
      PatientId: parseInt(createForm.PatientId),
      AppointmentTime: createForm.AppointmentTime,
    });

    if (result.isSuccess) {
      showNotification("success", "Appointment created successfully");
      setShowCreateModal(false);
      setCreateForm({ DoctorId: "", PatientId: "", AppointmentTime: "" });
      loadAppointments();
    } else {
      showNotification("error", result.error || "Failed to create appointment");
    }
  };

  const handleCancelAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment) return;

    const result = await CancelAppointment({
      AppointmentId: selectedAppointment.AppointmentId,
      Status: "Cancelled" as AppointmentStatus,
      Reason: cancelForm.Reason,
    });

    if (result.isSuccess) {
      showNotification("success", "Appointment cancelled successfully");
      setShowCancelModal(false);
      setCancelForm({ Reason: "" });
      setSelectedAppointment(null);
      loadAppointments();
    } else {
      showNotification("error", result.error || "Failed to cancel appointment");
    }
  };

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const getStatusColor = (status: AppointmentStatus): string => {
    const colors: Record<AppointmentStatus, string> = {
      Scheduled: "badge-scheduled",
      Completed: "badge-success",
      Cancelled: "badge-cancelled",
      NoShow: "badge-inactive",
    };
    return colors[status] || "badge-inactive";
  };

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return {
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      time: date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    };
  };

  const statusOptions: (AppointmentStatus | "All")[] = ["All", "Scheduled", "Completed", "Cancelled", "NoShow"];

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading Appointments...</p>
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
          --primary-dark: #05334a;
          --secondary: #088395;
          --accent: #05bfdb;
          --success: #00d9a5;
          --warning: #ffa726;
          --danger: #ff5252;
          --scheduled: #3b82f6;
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

        .reception-dashboard {
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
          max-width: 1400px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
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
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.5rem;
          margin-bottom: 3rem;
          animation: slideUp 0.6s ease-out;
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

        .stat-card {
          background: var(--surface);
          padding: 1.75rem;
          border-radius: 16px;
          box-shadow: 0 2px 12px var(--shadow);
          border: 1px solid var(--border);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .stat-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background: linear-gradient(to bottom, var(--accent), var(--secondary));
        }

        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px var(--shadow-lg);
        }

        .stat-label {
          font-size: 0.875rem;
          color: var(--text-muted);
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 0.5rem;
        }

        .stat-value {
          font-size: 2.5rem;
          font-weight: 700;
          color: var(--primary);
          line-height: 1;
        }

        .section {
          background: var(--surface);
          border-radius: 20px;
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 2px 16px var(--shadow);
          border: 1px solid var(--border);
          animation: slideUp 0.6s ease-out;
          animation-fill-mode: both;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid var(--border);
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

        .btn-danger {
          background: var(--danger);
          color: white;
        }

        .btn-danger:hover {
          background: #ff3838;
        }

        .btn-sm {
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
        }

        .search-filter-bar {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          padding: 1.5rem;
          background: var(--bg);
          border-radius: 12px;
          border: 2px dashed var(--border);
          flex-wrap: wrap;
        }

        .search-box {
          flex: 1;
          min-width: 250px;
          position: relative;
        }

        .search-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          font-size: 1.2rem;
        }

        .input {
          width: 100%;
          padding: 0.875rem 1.25rem 0.875rem 2.75rem;
          border: 2px solid var(--border);
          border-radius: 10px;
          font-size: 1rem;
          font-family: 'Poppins', sans-serif;
          transition: all 0.3s ease;
          background: white;
        }

        .input:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(5, 191, 219, 0.1);
        }

        .select {
          padding: 0.875rem 1.25rem;
          border: 2px solid var(--border);
          border-radius: 10px;
          font-family: 'Poppins', sans-serif;
          cursor: pointer;
          transition: all 0.2s ease;
          background: white;
          font-size: 1rem;
          font-weight: 500;
        }

        .select:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(5, 191, 219, 0.1);
        }

        .appointment-card {
          background: white;
          border: 2px solid var(--border);
          border-radius: 16px;
          padding: 1.5rem;
          margin-bottom: 1rem;
          transition: all 0.3s ease;
        }

        .appointment-card:hover {
          border-color: var(--accent);
          box-shadow: 0 4px 16px var(--shadow);
        }

        .appointment-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .appointment-id {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--primary);
        }

        .appointment-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          margin-top: 1rem;
        }

        .appointment-field {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .appointment-label {
          font-size: 0.75rem;
          color: var(--text-muted);
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .appointment-value {
          font-size: 1rem;
          font-weight: 600;
          color: var(--text);
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
          color: var(--scheduled);
        }

        .badge-cancelled {
          background: rgba(255, 82, 82, 0.15);
          color: var(--danger);
        }

        .badge-inactive {
          background: rgba(100, 116, 139, 0.15);
          color: var(--text-muted);
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
          max-width: 600px;
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

        .modal-header.danger {
          background: linear-gradient(135deg, var(--danger) 0%, #ff3838 100%);
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

        .form-input,
        .form-textarea {
          width: 100%;
          padding: 0.875rem 1.25rem;
          border: 2px solid var(--border);
          border-radius: 10px;
          font-size: 1rem;
          font-family: 'Poppins', sans-serif;
          transition: all 0.3s ease;
        }

        .form-input:focus,
        .form-textarea:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(5, 191, 219, 0.1);
        }

        .form-textarea {
          resize: none;
          min-height: 120px;
        }

        .cancel-info {
          background: var(--bg);
          border-radius: 12px;
          padding: 1.25rem;
          margin-bottom: 1.5rem;
          border: 2px solid var(--border);
        }

        .cancel-info-label {
          font-size: 0.875rem;
          color: var(--text-muted);
          margin-bottom: 0.5rem;
          font-weight: 500;
        }

        .cancel-info-value {
          font-weight: 700;
          color: var(--primary);
          font-size: 1.25rem;
        }

        .cancel-info-subvalue {
          font-size: 0.95rem;
          color: var(--text);
          margin-top: 0.5rem;
        }

        .modal-actions {
          display: flex;
          gap: 1rem;
          padding-top: 1rem;
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

        .empty-state {
          text-align: center;
          padding: 3rem;
          color: var(--text-muted);
        }

        .empty-state-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          opacity: 0.3;
        }

        @media (max-width: 768px) {
          .header h1 {
            font-size: 2rem;
          }

          .appointment-grid {
            grid-template-columns: 1fr;
          }

          .search-filter-bar {
            flex-direction: column;
          }

          .appointment-header {
            flex-direction: column;
          }
        }
      `}</style>

      <div className="reception-dashboard">
        <div className="header">
          <div className="header-content">
            <h1>Reception Dashboard</h1>
            <p>Manage appointments and patient scheduling</p>
          </div>
        </div>

        <div className="container">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Total Appointments</div>
              <div className="stat-value">{appointments.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Scheduled</div>
              <div className="stat-value">{appointments.filter((a) => a.Status === "Scheduled").length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Completed</div>
              <div className="stat-value">{appointments.filter((a) => a.Status === "Completed").length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Cancelled</div>
              <div className="stat-value">
                {appointments.filter((a) => a.Status === "Cancelled" || a.Status === "NoShow").length}
              </div>
            </div>
          </div>

          <div className="section">
            <div className="section-header">
              <div>
                <h2 className="section-title">Appointment Management</h2>
                <p className="section-subtitle">{filteredAppointments.length} appointments found</p>
              </div>
              <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                + New Appointment
              </button>
            </div>

            <div className="search-filter-bar">
              <div className="search-box">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  className="input"
                  placeholder="Search by doctor, patient, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as AppointmentStatus | "All")}>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status === "All" ? "All Status" : status === "NoShow" ? "No Show" : status}
                  </option>
                ))}
              </select>
            </div>

            {filteredAppointments.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📅</div>
                <p>No appointments found</p>
              </div>
            ) : (
              filteredAppointments.map((appointment) => {
                const { date, time } = formatDateTime(appointment.AppointmentTime);
                return (
                  <div key={appointment.AppointmentId} className="appointment-card">
                    <div className="appointment-header">
                      <div>
                        <div className="appointment-id">#{appointment.AppointmentId}</div>
                        <span className={`badge ${getStatusColor(appointment.Status)}`}>
                          {appointment.Status === "NoShow" ? "No Show" : appointment.Status}
                        </span>
                      </div>
                      {appointment.Status === "Scheduled" && (
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => {
                            setSelectedAppointment(appointment);
                            setShowCancelModal(true);
                          }}
                        >
                          Cancel Appointment
                        </button>
                      )}
                    </div>

                    <div className="appointment-grid">
                      <div className="appointment-field">
                        <span className="appointment-label">Doctor</span>
                        <span className="appointment-value">{appointment.DoctorName}</span>
                      </div>
                      <div className="appointment-field">
                        <span className="appointment-label">Patient</span>
                        <span className="appointment-value">{appointment.PatientName}</span>
                      </div>
                      <div className="appointment-field">
                        <span className="appointment-label">Date</span>
                        <span className="appointment-value">{date}</span>
                      </div>
                      <div className="appointment-field">
                        <span className="appointment-label">Time</span>
                        <span className="appointment-value">{time}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {notification && (
          <div className={`notification notification-${notification.type}`}>
            {notification.type === "success" ? "✓" : "✕"} {notification.message}
          </div>
        )}

        {showCreateModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <div className="modal-header-content">
                  <h3 className="modal-title">Create New Appointment</h3>
                  <button onClick={() => setShowCreateModal(false)} className="btn-close">
                    ✕
                  </button>
                </div>
              </div>
              <form onSubmit={handleCreateAppointment} className="modal-body">
                <div className="form-group">
                  <label className="form-label">Doctor ID</label>
                  <input
                    type="number"
                    required
                    className="form-input"
                    value={createForm.DoctorId}
                    onChange={(e) => setCreateForm({ ...createForm, DoctorId: e.target.value })}
                    placeholder="Enter doctor ID"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Patient ID</label>
                  <input
                    type="number"
                    required
                    className="form-input"
                    value={createForm.PatientId}
                    onChange={(e) => setCreateForm({ ...createForm, PatientId: e.target.value })}
                    placeholder="Enter patient ID"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Appointment Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    className="form-input"
                    value={createForm.AppointmentTime}
                    onChange={(e) => setCreateForm({ ...createForm, AppointmentTime: e.target.value })}
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                    Create Appointment
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showCancelModal && selectedAppointment && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header danger">
                <div className="modal-header-content">
                  <h3 className="modal-title">Cancel Appointment</h3>
                  <button
                    onClick={() => {
                      setShowCancelModal(false);
                      setSelectedAppointment(null);
                    }}
                    className="btn-close"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="modal-body">
                <div className="cancel-info">
                  <p className="cancel-info-label">You are canceling:</p>
                  <p className="cancel-info-value">Appointment #{selectedAppointment.AppointmentId}</p>
                  <p className="cancel-info-subvalue">
                    Dr. {selectedAppointment.DoctorName} • {selectedAppointment.PatientName}
                  </p>
                </div>
                <form onSubmit={handleCancelAppointment}>
                  <div className="form-group">
                    <label className="form-label">Cancellation Reason</label>
                    <textarea
                      required
                      className="form-textarea"
                      value={cancelForm.Reason}
                      onChange={(e) => setCancelForm({ ...cancelForm, Reason: e.target.value })}
                      placeholder="Please provide a reason for cancellation..."
                    />
                  </div>
                  <div className="modal-actions">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCancelModal(false);
                        setSelectedAppointment(null);
                      }}
                      className="btn btn-secondary"
                      style={{ flex: 1 }}
                    >
                      Keep Appointment
                    </button>
                    <button type="submit" className="btn btn-danger" style={{ flex: 1 }}>
                      Cancel Appointment
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}