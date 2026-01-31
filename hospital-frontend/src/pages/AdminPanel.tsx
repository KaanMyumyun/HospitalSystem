import { useEffect, useState, type SetStateAction } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import {
  ViewDepartment,
  CreateDepartment,
  ChangeDepartmentStatus,
} from "../api/departmentApi";
import { ListDoctors } from "../api/userApi";
import type { ViewDepartmentDto } from "../types/department";
import type { DoctorDisplayDto } from "../types/user";

export default function HospitalAdminPanel() {
  const [departments, setDepartments] = useState<ViewDepartmentDto[]>([]);
  const [doctors, setDoctors] = useState<DoctorDisplayDto[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [deptData, doctorData] = await Promise.all([
        ViewDepartment(),
        ListDoctors(),
      ]);
      setDepartments(deptData);
      setDoctors(doctorData);
    } finally {
      setLoading(false);
    }
  };

  const createDepartment = async () => {
    if (!name.trim()) return;
    await CreateDepartment({ Name: name });
    setName("");
    loadData();
  };

 
  const toggleStatus = async (id: number) => {
    await ChangeDepartmentStatus({ DepartmentId: id, IsActive: false });
  };

  const getDoctorsByDepartment = (departmentId: number) =>
    doctors.filter((d) => d.DeparmentId === departmentId);

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Hospital Admin Panel</h1>
        <div className="space-x-2">
          <Button variant="secondary">Admin ▾</Button>
          <Button variant="destructive">Logout</Button>
        </div>
      </div>

    <Card className="p-4">
  <div className="flex gap-2">
    <Input
      placeholder="Department name"
      value={name}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
        setName(e.target.value)
      }
    />
    <Button onClick={createDepartment} className="flex gap-2">
      <Plus size={16} /> Add Department
    </Button>
  </div>
</Card>
      {departments.map((dept) => {
        const deptDoctors = getDoctorsByDepartment(dept.DepartmentId);

        return (
          <Card key={dept.DepartmentId} className="shadow-md rounded-2xl">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={() =>
                    setExpanded(expanded === dept.DepartmentId ? null : dept.DepartmentId)
                  }
                >
                  {expanded === dept.DepartmentId ? (
                    <ChevronDown size={18} />
                  ) : (
                    <ChevronRight size={18} />
                  )}
                  <span className="font-semibold">{dept.Name} Department</span>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleStatus(dept.DepartmentId)}
                >
                  Deactivate
                </Button>
              </div>

              {expanded === dept.DepartmentId && (
                <div className="mt-4 pl-6 space-y-2 text-sm text-muted-foreground">
                  {deptDoctors.length ? (
                    deptDoctors.map((doc) => (
                      <div key={doc.DoctorId}>
                         Dr. {doc.Name}
                      </div>
                    ))
                  ) : (
                    <div>No doctors assigned</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
