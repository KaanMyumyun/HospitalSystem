import { useEffect, useState } from "react";
import {
  ViewDepartment,
  CreateDepartment,
  ChangeDepartmentStatus,
  ChangeDoctorDepartment,
} from "../api/departmentApi";
import { 
  ListDoctors, 
  ListUsers, 
  ChangeRole,
  CreateDoctor,
   ChangeDoctorStatus
} from "../api/userApi";
import type { UserRole } from "../types/userRole";
import type { ViewDepartmentDto } from "../types/department";
import type { DoctorDisplayDto, UserDisplayDto } from "../types/user";

export default function AdminPanel() {
  const [departments, setDepartments] = useState<ViewDepartmentDto[]>([]);
  const [doctors, setDoctors] = useState<DoctorDisplayDto[]>([]);
  const [users, setUsers] = useState<UserDisplayDto[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [deptName, setDeptName] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAddDept, setShowAddDept] = useState(false);
  const [showUserMgmt, setShowUserMgmt] = useState(false);
  const [showDoctorMgmt, setShowDoctorMgmt] = useState(false);
  const [showAddDoctor, setShowAddDoctor] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  // New doctor form state
  const [newDoctor, setNewDoctor] = useState({
    userId: "",
    departmentId: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [deptData, doctorData, userData] = await Promise.all([
      ViewDepartment(),
      ListDoctors(),
      ListUsers(),
    ]);
    setDepartments(deptData);
    setDoctors(doctorData);
    setUsers(userData);
    setLoading(false);
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const createDepartment = async () => {
    if (!deptName.trim()) return;
    const result = await CreateDepartment({ Name: deptName });
    if (result.isSuccess) {
      setDeptName("");
      setShowAddDept(false);
      loadData();
      showNotification('success', 'Department created successfully');
    } else {
      showNotification('error', result.error || 'Failed to create department');
    }
  };

  const toggleDepartmentStatus = async (dept: ViewDepartmentDto) => {
  const result = await ChangeDepartmentStatus({
    DepartmentId: (dept as any).Id ?? dept.departmentId,
    IsActive: !dept.isActive,
  });

  if (result.isSuccess) {
    loadData();
    showNotification(
      'success',
      `Department ${dept.isActive ? 'deactivated' : 'activated'}`
    );
  } else {
    showNotification('error', result.error || 'Failed to update department');
  }
};


  const assignDoctor = async (doctorId: number, departmentId: number) => {
    const result = await ChangeDoctorDepartment({ DoctorId: doctorId, DepartmentId: departmentId });
    if (result.isSuccess) {
      loadData();
      showNotification('success', 'Doctor assigned successfully');
    } else {
      showNotification('error', result.error || 'Failed to assign doctor');
    }
  };

  const changeRole = async (userId: number, role: UserRole) => {
    const result = await ChangeRole({ UserId: userId, NewRole: role });
    if (!result.isSuccess) {
      showNotification('error', result.error || 'Failed to change role');
      return;
    }
    loadData();
    showNotification('success', 'User role updated');
  };

  const createDoctor = async () => {
    if (!newDoctor.userId || !newDoctor.departmentId) {
      showNotification('error', 'Please select both user and department');
      return;
    }

    const result = await CreateDoctor({
      UserId: parseInt(newDoctor.userId),
      DeparmentId: parseInt(newDoctor.departmentId),
      NewRole: "Doctor" as UserRole
    });

    if (result.isSuccess) {
      setNewDoctor({ userId: "", departmentId: "" });
      setShowAddDoctor(false);
      loadData();
      showNotification('success', 'Doctor created successfully');
    } else {
      showNotification('error', result.error || 'Failed to create doctor');
    }
  };

 const toggleDoctorStatus = async (
  doctorId: number, 
  currentStatus: boolean,
  userId: number,      
  userName: string      
) => {
  const result = await ChangeDoctorStatus({
    DoctorId: doctorId,
    IsActive: !currentStatus,
    UserId: userId,       
    UserName: userName     
  });

  if (result.isSuccess) {
    loadData();
    showNotification('success', `Doctor ${currentStatus ? 'deactivated' : 'activated'}`);
  } else {
    showNotification('error', result.error || 'Failed to update doctor status');
  }
};

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const getDoctorsByDepartment = (id: number) =>
    doctors.filter((d) => d.DeparmentId === id);
  
  const activeDoctors = doctors.filter((d) => d.IsActive);
  const inactiveDoctors = doctors.filter((d) => !d.IsActive);
  
  // Get users who are not yet doctors
  const eligibleUsers = users.filter(
    user => !doctors.some(doc => doc.UserId === user.UserId)
  );

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading Healthcare System...</p>
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

        .admin-panel {
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

        .section:nth-child(2) { animation-delay: 0.1s; }
        .section:nth-child(3) { animation-delay: 0.2s; }
        .section:nth-child(4) { animation-delay: 0.3s; }

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

        .btn-success {
          background: var(--success);
          color: white;
        }

        .btn-success:hover {
          background: #00c494;
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

        .input-group {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
          padding: 1.5rem;
          background: var(--bg);
          border-radius: 12px;
          border: 2px dashed var(--border);
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-label {
          display: block;
          font-weight: 500;
          color: var(--text);
          margin-bottom: 0.5rem;
          font-size: 0.95rem;
        }

        .input {
          flex: 1;
          padding: 0.875rem 1.25rem;
          border: 2px solid var(--border);
          border-radius: 10px;
          font-size: 1rem;
          font-family: 'Poppins', sans-serif;
          transition: all 0.3s ease;
          background: white;
          width: 100%;
        }

        .input:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(5, 191, 219, 0.1);
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
          margin-bottom: 1rem;
        }

        .dept-info h3 {
          font-size: 1.5rem;
          color: var(--primary);
          margin-bottom: 0.25rem;
          font-weight: 600;
        }

        .dept-meta {
          display: flex;
          gap: 1rem;
          font-size: 0.875rem;
          color: var(--text-muted);
        }

        .badge {
          display: inline-flex;
          align-items: center;
          padding: 0.25rem 0.75rem;
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

        .badge-inactive {
          background: rgba(100, 116, 139, 0.15);
          color: var(--text-muted);
        }

        .dept-actions {
          display: flex;
          gap: 0.75rem;
        }

        .doctor-list {
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 2px solid var(--border);
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .doctor-item {
          background: var(--bg);
          padding: 1rem 1.25rem;
          border-radius: 10px;
          margin-bottom: 0.75rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border: 1px solid var(--border);
          transition: all 0.2s ease;
        }

        .doctor-item:hover {
          background: white;
          border-color: var(--accent);
        }

        .doctor-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .doctor-name {
          font-weight: 600;
          color: var(--text);
          font-size: 1.05rem;
        }

        .doctor-meta {
          font-size: 0.875rem;
          color: var(--text-muted);
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .doctor-actions {
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }

        .select {
          padding: 0.5rem 1rem;
          border: 2px solid var(--border);
          border-radius: 8px;
          font-family: 'Poppins', sans-serif;
          cursor: pointer;
          transition: all 0.2s ease;
          background: white;
        }

        .select:focus {
          outline: none;
          border-color: var(--accent);
        }

        .user-item {
          background: white;
          padding: 1.25rem;
          border-radius: 12px;
          margin-bottom: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border: 2px solid var(--border);
          transition: all 0.2s ease;
        }

        .user-item:hover {
          border-color: var(--accent);
          box-shadow: 0 2px 8px var(--shadow);
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .user-info h4 {
          font-weight: 600;
          color: var(--text);
          margin-bottom: 0.25rem;
        }

        .user-role {
          font-size: 0.875rem;
          color: var(--text-muted);
        }

        .user-role-section {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .user-role-label {
          font-size: 0.875rem;
          color: var(--text-muted);
          font-weight: 500;
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

        .empty-state svg {
          width: 80px;
          height: 80px;
          margin-bottom: 1rem;
          opacity: 0.3;
        }

        .inactive-section {
          margin-top: 2rem;
          padding: 1.5rem;
          background: linear-gradient(135deg, rgba(100, 116, 139, 0.05) 0%, rgba(100, 116, 139, 0.02) 100%);
          border-radius: 12px;
          border: 2px dashed var(--text-muted);
        }

        .inactive-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-muted);
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          padding: 1.5rem;
          background: var(--bg);
          border-radius: 12px;
          border: 2px dashed var(--border);
          margin-bottom: 1.5rem;
        }

        .form-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          grid-column: 1 / -1;
        }

        .tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          border-bottom: 2px solid var(--border);
        }

        .tab {
          padding: 0.75rem 1.5rem;
          background: none;
          border: none;
          border-bottom: 3px solid transparent;
          font-weight: 500;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: 'Poppins', sans-serif;
          font-size: 1rem;
        }

        .tab:hover {
          color: var(--primary);
        }

        .tab.active {
          color: var(--primary);
          border-bottom-color: var(--primary);
        }
      `}</style>

      <div className="admin-panel">
        <div className="header">
          <div className="header-content">
            <h1>Healthcare Administration</h1>
            <p>Manage departments, doctors, and system users</p>
          </div>
        </div>

        <div className="container">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Total Departments</div>
              <div className="stat-value">{departments.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Active Doctors</div>
              <div className="stat-value">{activeDoctors.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Inactive Doctors</div>
              <div className="stat-value">{inactiveDoctors.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">System Users</div>
              <div className="stat-value">{users.length}</div>
            </div>
          </div>

          {/* Department Management Section */}
          <div className="section">
            <div className="section-header">
              <h2 className="section-title">Department Management</h2>
              <button
                className={showAddDept ? "btn btn-secondary" : "btn btn-primary"}
                onClick={() => setShowAddDept(!showAddDept)}
              >
                {showAddDept ? "✕ Cancel" : "+ Add Department"}
              </button>
            </div>

            {showAddDept && (
              <div className="input-group">
                <input
                  className="input"
                  placeholder="Enter department name..."
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createDepartment()}
                />
                <button className="btn btn-success" onClick={createDepartment}>
                  Create Department
                </button>
              </div>
            )}

            {departments.map((dept) => (
              <div key={dept.departmentId} className="dept-card">
                <div className="dept-header">
                  <div className="dept-info">
                    <h3>{dept.name}</h3>
                    <div className="dept-meta">
                      <span className={`badge ${dept.isActive ? 'badge-success' : 'badge-inactive'}`}>
                        {dept.isActive ? "● Active" : "○ Inactive"}
                      </span>
                      <span>{getDoctorsByDepartment(dept.departmentId).length} Doctors</span>
                    </div>
                  </div>
                  <div className="dept-actions">
                    <button
                      className={`btn btn-sm ${dept.isActive ? "btn-danger" : "btn-success"}`}
                      
                      onClick={() => toggleDepartmentStatus(dept)}
                    >
                      {dept.isActive ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => toggleExpand(dept.departmentId)}
                    >
                      {expanded.has(dept.departmentId) ? "Hide Doctors ▲" : "Show Doctors ▼"}
                    </button>
                  </div>
                </div>

                {expanded.has(dept.departmentId) && (
                  <div className="doctor-list">
                    {getDoctorsByDepartment(dept.departmentId).length === 0 ? (
                      <div className="empty-state">
                        <p>No doctors assigned to this department</p>
                      </div>
                    ) : (
                      getDoctorsByDepartment(dept.departmentId).map((doctor) => (
                        <div key={doctor.DoctorId} className="doctor-item">
                          <span className="doctor-name">{doctor.Name}</span>
                          <span className={`badge ${doctor.IsActive ? 'badge-success' : 'badge-inactive'}`}>
                            {doctor.IsActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

  {/* Doctor Management Section */}
  <div className="section">
    <div className="section-header">
      <h2 className="section-title">Doctor Management</h2>
      <button
        className={showDoctorMgmt ? "btn btn-secondary" : "btn btn-primary"}
        onClick={() => setShowDoctorMgmt(!showDoctorMgmt)}
      >
        {showDoctorMgmt ? "Hide Doctors" : "Manage Doctors"}
      </button>
    </div>

    {showDoctorMgmt && (
      <>
        <button
          className={showAddDoctor ? "btn btn-secondary btn-sm" : "btn btn-primary btn-sm"}
          onClick={() => setShowAddDoctor(!showAddDoctor)}
          style={{ marginBottom: '1.5rem' }}
        >
          {showAddDoctor ? "✕ Cancel" : "+ Create Doctor"}
        </button>

        {showAddDoctor && (
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Select User</label>
              <select
                className="input"
                value={newDoctor.userId}
                onChange={(e) => setNewDoctor({ ...newDoctor, userId: e.target.value })}
              >
                <option value="">Choose a user...</option>
                {eligibleUsers.map((user) => (
                  <option key={user.UserId} value={user.UserId}>
                    {user.UserName} ({user.Role})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Select Department</label>
              <select
                className="input"
                value={newDoctor.departmentId}
                onChange={(e) => setNewDoctor({ ...newDoctor, departmentId: e.target.value })}
              >
                <option value="">Choose a department...</option>
                {departments.filter(d => d.isActive).map((dept) => (
                  <option key={dept.departmentId} value={dept.departmentId}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-actions">
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  setShowAddDoctor(false);
                  setNewDoctor({ userId: "", departmentId: "" });
                }}
              >
                Cancel
              </button>
              <button className="btn btn-success" onClick={createDoctor}>
                Create Doctor
              </button>
            </div>
          </div>
        )}

        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--primary)' }}>
            Active Doctors ({activeDoctors.length})
          </h3>
          {activeDoctors.length === 0 ? (
            <div className="empty-state">
              <p>No active doctors</p>
            </div>
          ) : (
            activeDoctors.map((doctor) => {
              const dept = departments.find(d => d.departmentId === doctor.DeparmentId);
              return (
                <div key={doctor.DoctorId} className="doctor-item">
                  <div className="doctor-info">
                    <div className="doctor-name">{doctor.Name}</div>
                    <div className="doctor-meta">
                      <span>🏥 {dept?.name || 'Unassigned'}</span>
                      <span className="badge badge-success">Active</span>
                    </div>
                  </div>
                  <div className="doctor-actions">
                    <select
                      className="select"
                      value={doctor.DeparmentId}
                      onChange={(e) => assignDoctor(doctor.DoctorId, parseInt(e.target.value))}
                    >
                      <option value={doctor.DeparmentId}>
                        {dept?.name || 'Select department...'}
                      </option>
                      {departments.filter(d => d.isActive && d.departmentId !== doctor.DeparmentId).map((d) => (
                        <option key={d.departmentId} value={d.departmentId}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => toggleDoctorStatus(
                        doctor.DoctorId, 
                        doctor.IsActive,
                        doctor.UserId,
                        doctor.Name
                      )}
                    >
                      Deactivate
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {inactiveDoctors.length > 0 && (
          <div className="inactive-section">
            <h3 className="inactive-title">
              ⊘ Inactive Doctors ({inactiveDoctors.length})
            </h3>
            {inactiveDoctors.map((doctor) => {
              const dept = departments.find(d => d.departmentId === doctor.DeparmentId);
              return (
                <div key={doctor.DoctorId} className="doctor-item">
                  <div className="doctor-info">
                    <div className="doctor-name" style={{ opacity: 0.6 }}>{doctor.Name}</div>
                    <div className="doctor-meta">
                      <span>🏥 {dept?.name || 'Unassigned'}</span>
                      <span className="badge badge-inactive">Inactive</span>
                    </div>
                  </div>
                  <div className="doctor-actions">
                    <button
                      className="btn btn-sm btn-success"
                      onClick={() => toggleDoctorStatus(
                        doctor.DoctorId, 
                        doctor.IsActive,
                        doctor.UserId,
                        doctor.Name
                      )}
                    >
                      Activate
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </>
    )}
  </div>

          {/* User Management Section */}
          <div className="section">
            <div className="section-header">
              <h2 className="section-title">User Management</h2>
              <button
                className={showUserMgmt ? "btn btn-secondary" : "btn btn-primary"}
                onClick={() => setShowUserMgmt(!showUserMgmt)}
              >
                {showUserMgmt ? "Hide Users" : "Manage Users"}
              </button>
            </div>

            {showUserMgmt && (
              <div>
                {users.length === 0 ? (
                  <div className="empty-state">
                    <p>No users found</p>
                  </div>
                ) : (
                  users.map((user) => (
                    <div key={user.UserId} className="user-item">
                      <div className="user-info">
                        <span style={{ 
                          fontSize: '1.5rem', 
                          color: 'var(--primary)' 
                        }}>👤</span>
                        <div>
                          <h4>
                            {user.UserName || 
                             (user as any).userName || 
                             (user as any).username || 
                             (user as any).name || 
                             (user as any).Name || 
                             `User #${user.UserId}`}
                          </h4>
                        </div>
                      </div>
                      <div className="user-role-section">
                        <span className="user-role-label">Current Role:</span>
                        <select
                          className="select"
                          value={
                            user.Role || 
                            (user as any).role || 
                            (user as any).userRole || 
                            "Pending"
                          }
                          onChange={(e) => changeRole(user.UserId, e.target.value as UserRole)}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Admin">Admin</option>
                          <option value="Doctor">Doctor</option>
                          <option value="FrontDesk">Front Desk</option>
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
        
        {notification && (
          <div className={`notification notification-${notification.type}`}>
            {notification.type === 'success' ? '✓' : '✕'} {notification.message}
          </div>
        )}
      </div>
    </>
  );
}