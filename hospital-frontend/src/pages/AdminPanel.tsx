import { useEffect, useState } from "react";
import { ViewDepartment,CreateDepartment,ChangeDepartmentStatus,ChangeDoctorDepartment} from "../api/departmentApi";
import type { CreateDepartmentDto, ViewDepartmentDto } from "../types/department";
import { Preview } from "@mui/icons-material";

export default  function Department()
{
const [name, setName] = useState("");
const [isSuccess, setIsSuccess] = useState(true);
const[departments,setDepartments] = useState<ViewDepartmentDto[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
 useEffect(() => {
    const fetchDeparments = async() => {
  try{
            const data = await ViewDepartment();
            setDepartments(data);
        }catch(error){
            setError("Failed to load deparments");
        }finally{
            setLoading(false);
        }
        };
      fetchDeparments();
    },[]);

const createDepartment = async() =>{
try{
    const result = await CreateDepartment({Name:name});
       if (!result.isSuccess) {
        console.log(result.error);
        return;
      }
      const data = await ViewDepartment();
      setDepartments(data);
      setName("");
      console.log("Department is created");
    } catch (error) {
      console.error("Create Deparment failed:", error);
    }
};

const changeDepartmentStatus = async (departmentId: number, currentStatus: boolean) => {
  try {
    const result = await ChangeDepartmentStatus({
      DepartmentId: departmentId,
      IsActive: !currentStatus, 
    });

    if (!result.isSuccess) {
      console.log(result.error);
      return;
    }

  
    setDepartments((prev) =>
      prev.map((dept) => dept.DepartmentId === departmentId
          ? { ...dept, IsActive: !currentStatus }
          : dept
      )
    );

  } catch (error) {
    console.error("Status change failed:", error);
  }
};






    if(loading) return<p>Loading deparments</p>
    if (error) return <p>{error}</p>;
return (
        <div>
            <h2>Departments</h2>
            <div>
  <input
    type="text"
    placeholder="Department name"
    value={name}
    onChange={(e) => setName(e.target.value)}
  />
  <button onClick={createDepartment}>Create</button>
</div>

            {departments.length === 0 ? (
                <p>No departments found.</p>
            ) : (
                <table border={1} cellPadding={8}>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                        </tr>
                    </thead>
                    <tbody>
                        {departments.map((dept) => (
                            <tr key={dept.DepartmentId}>
                                <td>{dept.DepartmentId}</td>
                                <td>{dept.Name}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}