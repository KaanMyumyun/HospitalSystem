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
  ChangeDoctorStatus,
} from "../api/userApi";
import {
  ViewSchedule,
  CreateSchedule,
  ChangeSchedule,
} from "../api/scheduleApi";
import type { UserRole } from "../types/userRole";
import type { ViewDepartmentDto } from "../types/department";
import type { DoctorDisplayDto, UserDisplayDto } from "../types/user";
import type {
  ViewSchedule as ViewScheduleDto,
  CreateScheduleDto as CreateScheduleDto,
  ChangeScheduleDto,
} from "../types/schedule";
import { CreateUser } from "../api/authApi";

export default function AdminPanel() {
  // Demo Role Check
  const currentRole = localStorage.getItem("role");
  const isDemo = currentRole === "DemoAdmin" || currentRole === "DemoFrontDesk";

  const [departments, setDepartments] = useState<ViewDepartmentDto[]>([]);
  const [doctors, setDoctors] = useState<DoctorDisplayDto[]>([]);
  const [users, setUsers] = useState<UserDisplayDto[]>([]);
  const [schedules, setSchedules] = useState<ViewScheduleDto[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [deptName, setDeptName] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAddDept, setShowAddDept] = useState(false);
  const [showDeptList, setShowDeptList] = useState(false);
  const [showDoctorMgmt, setShowDoctorMgmt] = useState(false);
  const [showUserMgmt, setShowUserMgmt] = useState(false);
  const [showScheduleMgmt, setShowScheduleMgmt] = useState(false);
  const [showCreateSchedule, setShowCreateSchedule] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [assigningDept, setAssigningDept] = useState<number | null>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");

  const [newScheduleDoctorId, setNewScheduleDoctorId] = useState<number | "">(
    ""
  );
  const [newScheduleStartHour, setNewScheduleStartHour] = useState("");
  const [newScheduleEndHour, setNewScheduleEndHour] = useState("");
  const [newScheduleSlotDuration, setNewScheduleSlotDuration] = useState("30");
  const [editingScheduleId, setEditingScheduleId] = useState<number | null>(
    null
  );
  const [editScheduleStartHour, setEditScheduleStartHour] = useState("");
  const [editScheduleEndHour, setEditScheduleEndHour] = useState("");
  const [editScheduleSlotDuration, setEditScheduleSlotDuration] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const getUserDisplayName = (user: UserDisplayDto) =>
    user.UserName ||
    (user as any).userName ||
    (user as any).username ||
    (user as any).name ||
    (user as any).Name ||
    `User ${user.UserId}`;

  const loadData = async () => {
    const [deptData, doctorData, userData, scheduleData] = await Promise.all([
      ViewDepartment(),
      ListDoctors(),
      ListUsers(),
      ViewSchedule(),
    ]);

    const normalizedUsers = userData.map((user: any) => ({
      UserId: user.UserId ?? user.userId ?? user.id ?? user.Id,
      UserName: user.UserName ?? user.userName ?? user.name ?? user.Name,
      Role: user.Role ?? user.role,
    }));

    const normalizedSchedules = (scheduleData || []).map((s: any, index: number) => ({
      ScheduleId: s.ScheduleId ?? s.scheduleId ?? s.id ?? `fallback-${index}`,
      DoctorId: s.DoctorId ?? s.doctorId,
      StartTime: s.StartTime ?? s.startTime,
      EndTime: s.EndTime ?? s.endTime,
      SlotDurationMin: s.SlotDurationMin ?? s.slotDurationMin ?? 30,
    }));

    setDepartments(deptData);
    setDoctors(doctorData);
    setUsers(normalizedUsers as UserDisplayDto[]);
    setSchedules(normalizedSchedules as ViewScheduleDto[]);
    setLoading(false);
  };

  const showNotification = (type: "success" | "error", message: string) => {
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
      showNotification("success", "Department created successfully");
    } else {
      showNotification("error", result.error || "Failed to create department");
    }
  };

  const createUser = async () => {
    if (!newUserName.trim() || !newUserPassword.trim()) {
      showNotification("error", "Please enter both username and password");
      return;
    }
    try {
      const result = await CreateUser({
        name: newUserName,
        password: newUserPassword,
      });
      if (result.isSuccess) {
        setNewUserName("");
        setNewUserPassword("");
        setShowCreateUser(false);
        await loadData();
        showNotification("success", "User created successfully");
      } else {
        showNotification("error", result.error || "Failed to create user");
      }
    } catch (error) {
      console.error("Create user failed:", error);
      showNotification("error", "Failed to create user");
    }
  };

  const createSchedule = async () => {
    const startH = parseInt(newScheduleStartHour, 10);
    const endH = parseInt(newScheduleEndHour, 10);
    const slotMin = parseInt(newScheduleSlotDuration, 10);

    if (
      !newScheduleDoctorId ||
      newScheduleStartHour === "" ||
      newScheduleEndHour === "" ||
      newScheduleSlotDuration === ""
    ) {
      showNotification("error", "Please fill in all schedule fields");
      return;
    }
    if (
      isNaN(startH) ||
      startH < 0 ||
      startH > 23 ||
      isNaN(endH) ||
      endH < 0 ||
      endH > 23
    ) {
      showNotification("error", "Hours must be between 0 and 23");
      return;
    }
    if (endH <= startH) {
      showNotification("error", "End hour must be after start hour");
      return;
    }
    if (isNaN(slotMin) || slotMin <= 0) {
      showNotification("error", "Slot duration must be greater than 0 minutes");
      return;
    }

    const dto: CreateScheduleDto = {
      DoctorId: Number(newScheduleDoctorId),
      StartHour: startH,
      EndHour: endH,
      SlotDurationMin: slotMin,
    };

    try {
      const result = await CreateSchedule(dto);
      if (result.IsSuccess) {
        setNewScheduleDoctorId("");
        setNewScheduleStartHour("");
        setNewScheduleEndHour("");
        setNewScheduleSlotDuration("30"); // Reset
        setShowCreateSchedule(false);
        await loadData();
        showNotification("success", "Schedule created successfully");
      } else {
        showNotification("error", result.Error || "Failed to create schedule");
      }
    } catch (error) {
      console.error("Create schedule failed:", error);
      showNotification("error", "Failed to create schedule");
    }
  };

  const startEditSchedule = (schedule: ViewScheduleDto) => {
    setEditingScheduleId(schedule.ScheduleId);

    // Safety check for dates during edit
    const startDate = new Date(schedule.StartTime);
    const endDate = new Date(schedule.EndTime);

    setEditScheduleStartHour(
      isNaN(startDate.getTime()) ? "" : String(startDate.getUTCHours())
    );
    setEditScheduleEndHour(
      isNaN(endDate.getTime()) ? "" : String(endDate.getUTCHours())
    );
    // Set slot duration for editing
    setEditScheduleSlotDuration(String(schedule.SlotDurationMin || 30));
  };

  const cancelEditSchedule = () => {
    setEditingScheduleId(null);
    setEditScheduleStartHour("");
    setEditScheduleEndHour("");
    setEditScheduleSlotDuration(""); // Reset edit state
  };

  const saveScheduleEdit = async (scheduleId: number) => {
    const startH = parseInt(editScheduleStartHour, 10);
    const endH = parseInt(editScheduleEndHour, 10);
    const slotMin = parseInt(editScheduleSlotDuration, 10); // Parse edit value

    if (editScheduleStartHour === "" || editScheduleEndHour === "" || editScheduleSlotDuration === "") {
      showNotification("error", "Please fill in start, end hours, and slot duration");
      return;
    }
    if (
      isNaN(startH) ||
      startH < 0 ||
      startH > 23 ||
      isNaN(endH) ||
      endH < 0 ||
      endH > 23
    ) {
      showNotification("error", "Hours must be between 0 and 23");
      return;
    }
    if (endH <= startH) {
      showNotification("error", "End hour must be after start hour");
      return;
    }
    if (isNaN(slotMin) || slotMin <= 0) {
      showNotification("error", "Slot duration must be greater than 0 minutes");
      return;
    }

    const dto: ChangeScheduleDto = {
      ScheduleId: scheduleId,
      StartHour: startH,
      EndHour: endH,
      SlotDurationMin: slotMin,
    };

    try {
      const result = await ChangeSchedule(dto);
      if (result.IsSuccess) {
        cancelEditSchedule();
        await loadData();
        showNotification("success", "Schedule updated successfully");
      } else {
        showNotification("error", result.Error || "Failed to update schedule");
      }
    } catch (error) {
      console.error("Update schedule failed:", error);
      showNotification("error", "Failed to update schedule");
    }
  };
  const formatHour = (iso: string) => {
    if (!iso) return "00:00";
    const date = new Date(iso);
    if (isNaN(date.getTime())) return "00:00";
    const hour = date.getUTCHours();
    return `${hour.toString().padStart(2, "0")}:00`;
  };

  const schedulesByDoctor = schedules.reduce((acc, s) => {
    const doctorId = s.DoctorId;
    if (doctorId === undefined || doctorId === null) return acc;
    if (!acc[doctorId]) acc[doctorId] = [];
    acc[doctorId].push(s);
    return acc;
  }, {} as Record<number, ViewScheduleDto[]>);

  const toggleDepartmentStatus = async (dept: ViewDepartmentDto) => {
    const result = await ChangeDepartmentStatus({
      DepartmentId: (dept as any).Id ?? dept.id,
      IsActive: !dept.isActive,
    });
    if (result.isSuccess) {
      loadData();
      showNotification(
        "success",
        `Department ${dept.isActive ? "deactivated" : "activated"}`
      );
    } else {
      showNotification("error", result.error || "Failed to update department");
    }
  };

  const assignDoctor = async (doctorId: number, departmentId: number) => {
    const result = await ChangeDoctorDepartment({
      DoctorId: doctorId,
      DepartmentId: departmentId,
    });
    if (result.isSuccess) {
      setAssigningDept(null);
      loadData();
      showNotification("success", "Doctor assigned successfully");
    } else {
      showNotification("error", result.error || "Failed to assign doctor");
    }
  };

  const changeRole = async (userId: number, role: UserRole) => {
    const result = await ChangeRole({ UserId: userId, NewRole: role });
    if (!result.isSuccess) {
      showNotification("error", result.Error || "Failed to change role");
      return;
    }
    await loadData();
    showNotification("success", "User role updated");
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
      UserName: userName,
    });
    if (result.isSuccess) {
      loadData();
      showNotification(
        "success",
        `Doctor ${currentStatus ? "deactivated" : "activated"}`
      );
    } else {
      showNotification(
        "error",
        result.error || "Failed to update doctor status"
      );
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

  const buildCurrentDoctors = () => {
    if (users.length === 0) return [];
    const doctorUsers = users.filter((u) => u.Role === "Doctor");
    if (doctorUsers.length === 0) return [];
    return doctorUsers.map((user) => {
      const doctorRecord = doctors.find((d) => {
        const dUserId = (d as any).UserId ?? (d as any).userId ?? d.UserId;
        return String(dUserId) === String(user.UserId);
      });
      if (doctorRecord) {
        return {
          DoctorId:
            (doctorRecord as any).DoctorId ??
            (doctorRecord as any).doctorId ??
            doctorRecord.DoctorId,
          UserId:
            (doctorRecord as any).UserId ??
            (doctorRecord as any).userId ??
            doctorRecord.UserId,
          Name:
            user.UserName ||
            (doctorRecord as any).Name ||
            (doctorRecord as any).name ||
            doctorRecord.Name,
          DeparmentId:
            (doctorRecord as any).DeparmentId ??
            (doctorRecord as any).deparmentId ??
            (doctorRecord as any).departmentId ??
            doctorRecord.DeparmentId ??
            0,
          IsActive:
            (doctorRecord as any).IsActive ??
            (doctorRecord as any).isActive ??
            doctorRecord.IsActive ??
            false,
          user,
        } as DoctorDisplayDto & { user: UserDisplayDto };
      } else {
        return {
          DoctorId: user.UserId,
          UserId: user.UserId,
          Name: user.UserName,
          DeparmentId: 0,
          IsActive: false,
          user,
        } as DoctorDisplayDto & { user: UserDisplayDto };
      }
    });
  };

  const currentDoctors = buildCurrentDoctors();
  const activeDoctors = currentDoctors.filter((d) => d.IsActive === true);
  const inactiveDoctors = currentDoctors.filter((d) => d.IsActive === false);

  const getDoctorsByDepartment = (id: number) =>
    currentDoctors.filter((d) => d.DeparmentId === id && d.IsActive);

  const getDoctorName = (doctorId: number): string => {
    if (isNaN(doctorId)) return "Unknown Doctor"; // Safety check
    const doc = currentDoctors.find((d) => d.DoctorId === doctorId);
    if (doc) return doc.Name;
    const rawDoc = doctors.find((d) => {
      const dId = (d as any).DoctorId ?? (d as any).doctorId ?? d.DoctorId;
      return Number(dId) === doctorId;
    });
    return (
      (rawDoc as any)?.Name ??
      (rawDoc as any)?.name ??
      `Doctor ${doctorId}`
    );
  };

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
            border: 4px solid rgba(255,255,255,0.2);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
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

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
          font-family: 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif;
          background: var(--bg);
          color: var(--text);
          line-height: 1.6;
        }

        .admin-panel { min-height: 100vh; background: linear-gradient(135deg, #f8fafc 0%, #e0f2f7 100%); }

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
          top: -50%; right: -10%;
          width: 500px; height: 500px;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
          border-radius: 50%;
        }
        .header-content {
          max-width: 1400px; margin: 0 auto; position: relative; z-index: 1;
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 1rem;
        }
        .header-text h1 {
          font-family: 'DM Serif Display', serif;
          font-size: 3rem; font-weight: 400;
          margin-bottom: 0.5rem; letter-spacing: -0.5px;
        }
        .header-text p { font-size: 1.1rem; opacity: 0.95; font-weight: 300; }

        /* Logout button — ghost style to match the header */
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
        .btn-logout:active {
          transform: translateY(0);
          background: rgba(255, 255, 255, 0.08);
        }

        .container { max-width: 1400px; margin: 0 auto; padding: 2rem; }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem; margin-bottom: 3rem;
          animation: slideUp 0.6s ease-out;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .stat-card {
          background: var(--surface);
          padding: 1.75rem; border-radius: 16px;
          box-shadow: 0 2px 12px var(--shadow);
          border: 1px solid var(--border);
          transition: all 0.3s ease;
          position: relative; overflow: hidden;
        }
        .stat-card::before {
          content: '';
          position: absolute; top: 0; left: 0;
          width: 4px; height: 100%;
          background: linear-gradient(to bottom, var(--accent), var(--secondary));
        }
        .stat-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px var(--shadow-lg); }
        .stat-label {
          font-size: 0.875rem; color: var(--text-muted); font-weight: 500;
          text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.5rem;
        }
        .stat-value { font-size: 2.5rem; font-weight: 700; color: var(--primary); line-height: 1; }

        .section {
          background: var(--surface); border-radius: 20px;
          padding: 2rem; margin-bottom: 2rem;
          box-shadow: 0 2px 16px var(--shadow);
          border: 1px solid var(--border);
          animation: slideUp 0.6s ease-out; animation-fill-mode: both;
        }
        .section:nth-child(2) { animation-delay: 0.1s; }
        .section:nth-child(3) { animation-delay: 0.2s; }
        .section:nth-child(4) { animation-delay: 0.3s; }
        .section:nth-child(5) { animation-delay: 0.4s; }

        .section-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 2rem; padding-bottom: 1rem;
          border-bottom: 2px solid var(--border);
        }
        .section-title {
          font-family: 'DM Serif Display', serif;
          font-size: 2rem; color: var(--primary); font-weight: 400;
        }
        .section-subtitle {
          font-size: 1.25rem; font-weight: 600;
          color: var(--text); margin-bottom: 1rem; margin-top: 1.5rem;
        }

        .btn {
          padding: 0.75rem 1.5rem; border: none; border-radius: 10px;
          font-weight: 600; font-size: 0.95rem; cursor: pointer;
          transition: all 0.3s ease; font-family: 'Poppins', sans-serif;
          display: inline-flex; align-items: center; gap: 0.5rem;
        }
        .btn-primary {
          background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
          color: white; box-shadow: 0 4px 12px rgba(8,131,149,0.3);
        }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(8,131,149,0.4); }
        .btn-secondary { background: var(--bg); color: var(--primary); border: 2px solid var(--border); }
        .btn-secondary:hover { background: white; border-color: var(--primary); }
        .btn-success { background: var(--success); color: white; }
        .btn-success:hover { background: #00c494; }
        .btn-danger { background: var(--danger); color: white; }
        .btn-danger:hover { background: #ff3838; }
        .btn-warning { background: var(--warning); color: white; }
        .btn-warning:hover { background: #ff9800; }
        .btn-sm { padding: 0.5rem 1rem; font-size: 0.875rem; }

        .input-group {
          display: flex; gap: 1rem; margin-bottom: 1.5rem;
          padding: 1.5rem; background: var(--bg);
          border-radius: 12px; border: 2px dashed var(--border); flex-wrap: wrap;
        }
        .input {
          flex: 1; padding: 0.875rem 1.25rem;
          border: 2px solid var(--border); border-radius: 10px;
          font-size: 1rem; font-family: 'Poppins', sans-serif;
          transition: all 0.3s ease; background: white;
          width: 100%; min-width: 140px;
        }
        .input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px rgba(5,191,219,0.1); }

        .dept-card {
          background: white; border: 2px solid var(--border);
          border-radius: 16px; padding: 1.5rem; margin-bottom: 1rem;
          transition: all 0.3s ease;
        }
        .dept-card:hover { border-color: var(--accent); box-shadow: 0 4px 16px var(--shadow); }
        .dept-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
        .dept-info h3 { font-size: 1.5rem; color: var(--primary); margin-bottom: 0.25rem; font-weight: 600; }
        .dept-meta { display: flex; gap: 1rem; font-size: 0.875rem; color: var(--text-muted); }
        .dept-actions { display: flex; gap: 0.75rem; }

        .badge {
          display: inline-flex; align-items: center;
          padding: 0.25rem 0.75rem; border-radius: 20px;
          font-size: 0.75rem; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.5px;
        }
        .badge-success { background: rgba(0,217,165,0.15); color: var(--success); }
        .badge-inactive { background: rgba(100,116,139,0.15); color: var(--text-muted); }
        .badge-secondary { background: rgba(8,131,149,0.15); color: var(--secondary); }

        .doctor-list {
          margin-top: 1.5rem; padding-top: 1.5rem;
          border-top: 2px solid var(--border);
          animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .doctor-item {
          background: var(--bg); padding: 1rem 1.25rem; border-radius: 10px;
          margin-bottom: 0.75rem; display: flex;
          justify-content: space-between; align-items: center;
          border: 1px solid var(--border); transition: all 0.2s ease;
        }
        .doctor-item:hover { background: white; border-color: var(--accent); }
        .doctor-info { display: flex; flex-direction: column; gap: 0.25rem; }
        .doctor-name { font-weight: 600; color: var(--text); font-size: 1.05rem; }
        .doctor-meta { font-size: 0.875rem; color: var(--text-muted); display: flex; gap: 1rem; align-items: center; }
        .doctor-actions { display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; }

        .select {
          padding: 0.5rem 1rem; border: 2px solid var(--border);
          border-radius: 8px; font-family: 'Poppins', sans-serif;
          cursor: pointer; transition: all 0.2s ease; background: white;
        }
        .select:focus { outline: none; border-color: var(--accent); }

        .user-item {
          background: white; padding: 1.25rem; border-radius: 12px;
          margin-bottom: 1rem; display: flex;
          justify-content: space-between; align-items: center;
          border: 2px solid var(--border); transition: all 0.2s ease;
        }
        .user-item:hover { border-color: var(--accent); box-shadow: 0 2px 8px var(--shadow); }
        .user-info { display: flex; align-items: center; gap: 1rem; }
        .user-info h4 { font-weight: 600; color: var(--text); margin-bottom: 0.25rem; }
        .user-role { font-size: 0.875rem; color: var(--text-muted); }
        .user-role-section { display: flex; align-items: center; gap: 1rem; }
        .user-role-label { font-size: 0.875rem; color: var(--text-muted); font-weight: 500; }

        /* Schedule styles */
        .schedule-group {
          background: white; border: 2px solid var(--border);
          border-radius: 16px; padding: 1.5rem; margin-bottom: 1rem;
          transition: all 0.3s ease;
        }
        .schedule-group:hover { border-color: var(--accent); box-shadow: 0 4px 16px var(--shadow); }
        .schedule-group-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 1rem; padding-bottom: 0.75rem;
          border-bottom: 1px solid var(--border);
        }
        .schedule-group-title {
          font-size: 1.15rem; font-weight: 600; color: var(--primary);
          display: flex; align-items: center; gap: 0.5rem;
        }
        .schedule-item {
          background: var(--bg); padding: 1rem 1.25rem; border-radius: 10px;
          margin-bottom: 0.75rem; display: flex;
          justify-content: space-between; align-items: flex-start;
          border: 1px solid var(--border); transition: all 0.2s ease;
          gap: 1rem; flex-wrap: wrap;
        }
        .schedule-item:last-child { margin-bottom: 0; }
        .schedule-item:hover { background: white; border-color: var(--accent); }
        .schedule-item.editing { border-color: var(--accent); background: rgba(5,191,219,0.04); }
        .schedule-times { display: flex; flex-direction: column; gap: 0.35rem; min-width: 0; }
        .schedule-time-row { display: flex; align-items: center; gap: 0.5rem; font-size: 0.925rem; color: var(--text); }
        .schedule-time-label {
          font-size: 0.75rem; font-weight: 600; text-transform: uppercase;
          letter-spacing: 0.5px; color: var(--text-muted); min-width: 36px;
        }
        .schedule-edit-fields { display: flex; flex-direction: column; gap: 0.5rem; flex: 1; min-width: 220px; }
        .schedule-edit-row { display: flex; align-items: center; gap: 0.75rem; }
        .schedule-edit-label {
          font-size: 0.8rem; font-weight: 600; text-transform: uppercase;
          letter-spacing: 0.5px; color: var(--text-muted); min-width: 40px;
        }
        .schedule-edit-input {
          flex: 1; padding: 0.5rem 0.75rem; border: 2px solid var(--border);
          border-radius: 8px; font-size: 0.9rem; font-family: 'Poppins', sans-serif;
          background: white; transition: all 0.2s ease;
        }
        .schedule-edit-input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px rgba(5,191,219,0.1); }
        .schedule-actions { display: flex; gap: 0.5rem; align-items: center; flex-shrink: 0; }
        .schedule-id-badge {
          font-size: 0.75rem; color: var(--text-muted); background: var(--bg);
          border: 1px solid var(--border); border-radius: 6px;
          padding: 0.2rem 0.5rem; font-weight: 500;
        }

        /* Notification */
        .notification {
          position: fixed; top: 2rem; right: 2rem;
          padding: 1.25rem 1.75rem; border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.15);
          animation: slideInRight 0.4s ease; z-index: 1000;
          display: flex; align-items: center; gap: 0.75rem;
          font-weight: 500; max-width: 400px;
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .notification-success { background: var(--success); color: white; }
        .notification-error { background: var(--danger); color: white; }

        .empty-state { text-align: center; padding: 3rem; color: var(--text-muted); }

        .inactive-section {
          margin-top: 2rem; padding: 1.5rem;
          background: linear-gradient(135deg, rgba(100,116,139,0.05) 0%, rgba(100,116,139,0.02) 100%);
          border-radius: 12px; border: 2px dashed var(--text-muted);
        }
        .inactive-title {
          font-size: 1.25rem; font-weight: 600; color: var(--text-muted);
          margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;
        }

        .dept-assignment-dropdown { position: relative; display: inline-block; }
        .dept-dropdown-content {
          position: absolute; top: 100%; right: 0;
          background: white; border: 2px solid var(--border);
          border-radius: 8px; box-shadow: 0 4px 12px var(--shadow);
          min-width: 200px; margin-top: 0.5rem; z-index: 100;
          max-height: 300px; overflow-y: auto;
        }
        .dept-dropdown-item {
          padding: 0.75rem 1rem; cursor: pointer;
          transition: all 0.2s ease; border-bottom: 1px solid var(--border);
        }
        .dept-dropdown-item:last-child { border-bottom: none; }
        .dept-dropdown-item:hover { background: var(--bg); color: var(--primary); }
        .dept-dropdown-item.selected { background: rgba(5,191,219,0.1); color: var(--primary); font-weight: 600; }

        .warning-badge {
          background: rgba(255,167,38,0.15); color: var(--warning);
          padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.875rem;
          display: inline-flex; align-items: center; gap: 0.5rem;
        }
      `}</style>

      <div className="admin-panel">
        {/* Header */}
        <div className="header">
          <div className="header-content">
            <div className="header-text">
              <h1>Healthcare Administration</h1>
              <p>Manage departments, doctors, schedules, and system users</p>
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
          {/* Stats */}
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
              <div className="stat-label">Total Schedules</div>
              <div className="stat-value">{schedules.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">System Users</div>
              <div className="stat-value">{users.length}</div>
            </div>
          </div>

          {/* Department Management */}
          <div className="section">
            <div className="section-header">
              <h2 className="section-title">Department Management</h2>
              <div style={{ display: "flex", gap: "1rem" }}>
                <button
                  className={showAddDept ? "btn btn-secondary" : "btn btn-primary"}
                  onClick={() => {
                    setShowAddDept(!showAddDept);
                    if (!showAddDept) setShowDeptList(false);
                  }}
                >
                  {showAddDept ? "Cancel" : "+ Add Department"}
                </button>
                <button
                  className={showDeptList ? "btn btn-secondary" : "btn btn-primary"}
                  onClick={() => setShowDeptList(!showDeptList)}
                >
                  {showDeptList ? "Hide Departments" : "View Departments"}
                </button>
              </div>
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

            {showDeptList && (
              <>
                {departments.length === 0 ? (
                  <div className="empty-state"><p>No departments found</p></div>
                ) : (
                  departments.map((dept) => (
                    <div key={dept.id} className="dept-card">
                      <div className="dept-header">
                        <div className="dept-info">
                          <h3>{dept.name}</h3>
                          <div className="dept-meta">
                            <span className={`badge ${dept.isActive ? "badge-success" : "badge-inactive"}`}>
                              {dept.isActive ? "Active" : "Inactive"}
                            </span>
                            <span>{getDoctorsByDepartment(dept.id).length} Doctors</span>
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
                            onClick={() => toggleExpand(dept.id)}
                          >
                            {expanded.has(dept.id) ? "Hide Doctors" : "Show Doctors"}
                          </button>
                        </div>
                      </div>
                      {expanded.has(dept.id) && (
                        <div className="doctor-list">
                          {getDoctorsByDepartment(dept.id).length === 0 ? (
                            <div className="empty-state">
                              <p>No doctors assigned to this department</p>
                            </div>
                          ) : (
                            getDoctorsByDepartment(dept.id).map((doctor) => (
                              <div key={doctor.DoctorId} className="doctor-item">
                                <span className="doctor-name">{doctor.Name}</span>
                                <span className={`badge ${doctor.IsActive ? "badge-success" : "badge-inactive"}`}>
                                  {doctor.IsActive ? "Active" : "Inactive"}
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

          {/* Doctor Management */}
          <div className="section">
            <div className="section-header">
              <h2 className="section-title">Doctor Management</h2>
              <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                <span className="badge badge-secondary">Total: {currentDoctors.length}</span>
                <button
                  className={showDoctorMgmt ? "btn btn-secondary" : "btn btn-primary"}
                  onClick={() => setShowDoctorMgmt(!showDoctorMgmt)}
                >
                  {showDoctorMgmt ? "Hide Doctors" : "View Doctors"}
                </button>
              </div>
            </div>

            {showDoctorMgmt && (
              <>
                <h3 className="section-subtitle">Active Doctors ({activeDoctors.length})</h3>
                {activeDoctors.length === 0 ? (
                  <div className="empty-state"><p>No active doctors</p></div>
                ) : (
                  activeDoctors.map((doctor) => {
                    const dept = departments.find((d) => d.id === doctor.DeparmentId);
                    return (
                      <div key={doctor.DoctorId} className="doctor-item">
                        <div className="doctor-info">
                          <h4 className="doctor-name">{doctor.Name}</h4>
                          <div className="doctor-meta">
                            <span className="badge badge-success">Active</span>
                            <span>{dept?.name || "Unassigned"}</span>
                          </div>
                        </div>
                        <div className="doctor-actions">
                          <div className="dept-assignment-dropdown">
                            <button
                              className="btn btn-sm btn-warning"
                              onClick={() =>
                                setAssigningDept(
                                  assigningDept === doctor.DoctorId ? null : doctor.DoctorId
                                )
                              }
                            >
                              Assign Department
                            </button>
                            {assigningDept === doctor.DoctorId && (
                              <div className="dept-dropdown-content">
                                {departments
                                  .filter((d) => d.isActive)
                                  .map((d) => (
                                    <div
                                      key={d.id}
                                      className={`dept-dropdown-item ${d.id === doctor.DeparmentId ? "selected" : ""}`}
                                      onClick={() => assignDoctor(doctor.DoctorId, d.id)}
                                    >
                                      {d.name}
                                      {d.id === doctor.DeparmentId && " ✓"}
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() =>
                              toggleDoctorStatus(
                                doctor.DoctorId,
                                doctor.IsActive,
                                doctor.UserId,
                                doctor.Name
                              )
                            }
                          >
                            Deactivate
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}

                {inactiveDoctors.length > 0 && (
                  <div className="inactive-section">
                    <h3 className="inactive-title">⊘ Inactive Doctors ({inactiveDoctors.length})</h3>
                    {inactiveDoctors.map((doctor) => {
                      const dept = departments.find((d) => d.id === doctor.DeparmentId);
                      const hasNoDoctorRecord =
                        doctors.findIndex(
                          (d) => String(d.UserId) === String(doctor.UserId)
                        ) === -1;
                      return (
                        <div key={doctor.DoctorId} className="doctor-item">
                          <div className="doctor-info">
                            <h4 className="doctor-name" style={{ opacity: 0.6 }}>
                              {doctor.Name}
                              {hasNoDoctorRecord && (
                                <span className="warning-badge" style={{ marginLeft: "0.5rem" }}>
                                  New - Needs Activation
                                </span>
                              )}
                            </h4>
                            <div className="doctor-meta">
                              <span className="badge badge-inactive">Inactive</span>
                              <span>{dept?.name || "Unassigned"}</span>
                            </div>
                          </div>
                          <div className="doctor-actions">
                            <button
                              className="btn btn-sm btn-success"
                              onClick={() =>
                                toggleDoctorStatus(
                                  doctor.DoctorId,
                                  doctor.IsActive,
                                  doctor.UserId,
                                  doctor.Name
                                )
                              }
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

          {/* Schedule Management */}
          <div className="section">
            <div className="section-header">
              <h2 className="section-title">Schedule Management</h2>
              <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                <span className="badge badge-secondary">Total: {schedules.length}</span>
                <button
                  className={showCreateSchedule ? "btn btn-secondary" : "btn btn-primary"}
                  onClick={() => setShowCreateSchedule(!showCreateSchedule)}
                >
                  {showCreateSchedule ? "Cancel" : "+ Add Schedule"}
                </button>
                <button
                  className={showScheduleMgmt ? "btn btn-secondary" : "btn btn-primary"}
                  onClick={() => setShowScheduleMgmt(!showScheduleMgmt)}
                >
                  {showScheduleMgmt ? "Hide Schedules" : "View Schedules"}
                </button>
              </div>
            </div>

            {showCreateSchedule && (
              <div className="input-group">
                <select
                  className="select input"
                  style={{ flex: "1", minWidth: "180px" }}
                  value={newScheduleDoctorId}
                  onChange={(e) => setNewScheduleDoctorId(Number(e.target.value))}
                >
                  <option value="">Select Doctor...</option>
                  {activeDoctors.map((doc) => (
                    <option key={doc.DoctorId} value={doc.DoctorId}>
                      {doc.Name}
                    </option>
                  ))}
                </select>
                <input
                  className="input"
                  type="number"
                  placeholder="Start hour (0–23)"
                  min={0}
                  max={23}
                  value={newScheduleStartHour}
                  onChange={(e) => setNewScheduleStartHour(e.target.value)}
                  style={{ flex: 1, minWidth: "120px" }}
                />
                <input
                  className="input"
                  type="number"
                  placeholder="End hour (0–23)"
                  min={0}
                  max={23}
                  value={newScheduleEndHour}
                  onChange={(e) => setNewScheduleEndHour(e.target.value)}
                  style={{ flex: 1, minWidth: "120px" }}
                />
                {/* NEW: Input for Slot Duration during Creation */}
                <input
                  className="input"
                  type="number"
                  placeholder="Slot (mins)"
                  min={1}
                  value={newScheduleSlotDuration}
                  onChange={(e) => setNewScheduleSlotDuration(e.target.value)}
                  style={{ flex: 1, minWidth: "100px" }}
                />
                <button className="btn btn-success" onClick={createSchedule}>
                  Create Schedule
                </button>
              </div>
            )}

            {showScheduleMgmt && (
              <>
                {schedules.length === 0 ? (
                  <div className="empty-state"><p>No schedules found</p></div>
                ) : (
                  Object.entries(schedulesByDoctor).map(([doctorIdStr, docSchedules]) => {
                    const doctorId = Number(doctorIdStr);
                    const doctorName = getDoctorName(doctorId);
                    return (
                      <div key={`doc-group-${doctorIdStr}`} className="schedule-group">
                        <div className="schedule-group-header">
                          <div className="schedule-group-title">
                            <span>{doctorName}</span>
                          </div>

                        </div>

                        {docSchedules.map((schedule) => {
                          const isEditing = editingScheduleId === schedule.ScheduleId;
                          return (
                            <div
                              key={`schedule-${schedule.ScheduleId}`}
                              className={`schedule-item ${isEditing ? "editing" : ""}`}
                            >
                              {isEditing ? (
                                <div className="schedule-edit-fields">
                                  <div className="schedule-edit-row">
                                    <span className="schedule-edit-label">Start</span>
                                    <input
                                      className="schedule-edit-input"
                                      type="number"
                                      placeholder="0–23"
                                      min={0}
                                      max={23}
                                      value={editScheduleStartHour}
                                      onChange={(e) => setEditScheduleStartHour(e.target.value)}
                                      style={{ width: "80px" }}
                                    />
                                    <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>:00</span>
                                  </div>
                                  <div className="schedule-edit-row">
                                    <span className="schedule-edit-label">End</span>
                                    <input
                                      className="schedule-edit-input"
                                      type="number"
                                      placeholder="0–23"
                                      min={0}
                                      max={23}
                                      value={editScheduleEndHour}
                                      onChange={(e) => setEditScheduleEndHour(e.target.value)}
                                      style={{ width: "80px" }}
                                    />
                                    <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>:00</span>
                                  </div>
                                  {/* NEW: Edit Input for Slot Duration */}
                                  <div className="schedule-edit-row">
                                    <span className="schedule-edit-label">Slot</span>
                                    <input
                                      className="schedule-edit-input"
                                      type="number"
                                      placeholder="Mins"
                                      min={1}
                                      value={editScheduleSlotDuration}
                                      onChange={(e) => setEditScheduleSlotDuration(e.target.value)}
                                      style={{ width: "80px" }}
                                    />
                                    <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>mins</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="schedule-times">

                                  <div className="schedule-time-row">
                                    <span className="schedule-time-label">Start</span>
                                    <span>{formatHour(schedule.StartTime)}</span>
                                  </div>
                                  <div className="schedule-time-row">
                                    <span className="schedule-time-label">End</span>
                                    <span>{formatHour(schedule.EndTime)}</span>
                                  </div>
                                  {/* NEW: Display Slot Duration */}
                                  <div className="schedule-time-row">
                                    <span className="schedule-time-label">Slot</span>
                                    <span>{schedule.SlotDurationMin || 30} mins</span>
                                  </div>
                                </div>
                              )}

                              <div className="schedule-actions">
                                {isEditing ? (
                                  <>
                                    <button
                                      className="btn btn-sm btn-success"
                                      onClick={() => saveScheduleEdit(schedule.ScheduleId)}
                                    >
                                      Save
                                    </button>
                                    <button
                                      className="btn btn-sm btn-secondary"
                                      onClick={cancelEditSchedule}
                                    >
                                      Cancel
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    className="btn btn-sm btn-warning"
                                    onClick={() => startEditSchedule(schedule)}
                                  >
                                    Edit
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })
                )}
              </>
            )}
          </div>

          {/* User Management */}
          <div className="section">
            <div className="section-header">
              <h2 className="section-title">User Management</h2>
              <div style={{ display: "flex", gap: "1rem" }}>
                {/* 1. Only show "Create User" button to REAL Admins */}
                {!isDemo && (
                  <button
                    className={showCreateUser ? "btn btn-secondary" : "btn btn-primary"}
                    onClick={() => {
                      setShowCreateUser(!showCreateUser);
                      if (!showCreateUser) setShowUserMgmt(false);
                    }}
                  >
                    {showCreateUser ? "Cancel" : "+ Create User"}
                  </button>
                )}
                <button
                  className={showUserMgmt ? "btn btn-secondary" : "btn btn-primary"}
                  onClick={() => setShowUserMgmt(!showUserMgmt)}
                >
                  {showUserMgmt ? "Hide Users" : "View All Users"}
                </button>
              </div>
            </div>

            {/* 2. Hide Create User inputs entirely for demo users */}
            {showCreateUser && !isDemo && (
              <div className="input-group">
                <input
                  className="input"
                  type="text"
                  placeholder="Username..."
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && newUserPassword && createUser()}
                />
                <input
                  className="input"
                  type="password"
                  placeholder="Password..."
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && newUserName && createUser()}
                />
                <button className="btn btn-success" onClick={createUser}>
                  Create User
                </button>
              </div>
            )}

            {showUserMgmt && (
              <div>
                {users.length === 0 ? (
                  <div className="empty-state"><p>No users found</p></div>
                ) : (
                  users.map((user) => (
                    <div key={user.UserId || (user as any).userId} className="user-item">
                      <div className="user-info">
                        <span style={{ fontSize: "1.5rem", color: "var(--primary)" }}>👤</span>
                        <div>
                          <h4>{getUserDisplayName(user)}</h4>
                        </div>
                      </div>
                      <div className="user-role-section">
                        <span className="user-role-label">Current Role:</span>
                        {/* 3. Disable the select dropdown for demo users */}
                        <select
                          className="select"
                          disabled={isDemo}
                          style={{
                            cursor: isDemo ? "not-allowed" : "pointer",
                            opacity: isDemo ? 0.7 : 1,
                            backgroundColor: isDemo ? "#f0f0f0" : "white"
                          }}
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
                          <option value="DemoAdmin">Demo Admin</option>
                          <option value="DemoFrontDesk">Demo Front Desk</option>
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

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