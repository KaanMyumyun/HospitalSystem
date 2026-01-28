import type { ChangeDepartmentStatusDto,ChangeDoctorDepartmentDto,CreateDepartmentDto,ViewDepartmentDto,DepartmentActionResultDto } from "../types/department";
const Base_URL = "http://localhost:5272";

export async function ChangeDepartmentStatus(dto:ChangeDepartmentStatusDto):Promise<DepartmentActionResultDto> {
    try
    {
         const response = await fetch(`${Base_URL}/ChangeDepartmentStatus`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(dto),
                });
        
                const data: DepartmentActionResultDto = await response.json();
                return data;
    }catch(error)
    {
 return {
            isSuccess: false,
            error: "Network error",
        };
    }
}

export async function ChangeDoctorDepartment(dto:ChangeDoctorDepartmentDto):Promise<DepartmentActionResultDto> {
    try
    {
        const response = await fetch(`${Base_URL}/ChangeDoctorDepartment`,
            {
                method: "POST",
                headers:{
                    "Content-Type":"application/json",
                },
                body:JSON.stringify(dto),
            });
        const data:DepartmentActionResultDto = await response.json();
        return data;        
    }catch(error)
    {
 return {
            isSuccess: false,
            error: "Network error",
        };
    }
}

export async function CreateDepartment(dto:CreateDepartmentDto):Promise<DepartmentActionResultDto> {
    try
    {
        const response = await fetch(`${Base_URL}/CreateDepartment`,
            {
                method:"POST",
                headers:
                {
                    "Content-Type":"application/json",
                },
                body:JSON.stringify(dto),
            });
            const data:DepartmentActionResultDto = await response.json();
            return data;
    }catch(error)
    {
        return {
            isSuccess:false,
            error:"Network error",
        };
    }
}

export async function  ViewDepartment() {
     const response = await fetch(`${Base_URL}/ViewDepartment`, {
                    method: "GET",
                });
        
                const data: ViewDepartmentDto[] = await response.json();
                return data;
}