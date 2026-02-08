
import { UserRole } from "@/types/userRole";
import type { ChangeRoleResultDto, ChangeRoleDto, UserDisplayDto, DoctorDisplayDto, ResetPasswordDto, ResetPasswordResultDto,CreateDoctorDto, CreateDoctorResultDto, ChangeDoctorsStatus, ChangeDoctorsStatusResult } from "../types/user";
const Base_URL = "http://localhost:5272/api/Users";

export async function ListDoctors() {
  const token = localStorage.getItem("token");
    const response = await fetch(`${Base_URL}/ListDoctors`, {
                        method: "GET",
                         headers: {
      "Authorization": `Bearer ${token}`,
    },
                    });
            
                    const data: DoctorDisplayDto[] = await response.json();
                    return data;
}
ListDoctors
export async function ListUsers() {
  const token = localStorage.getItem("token");

  const response = await fetch(`${Base_URL}/ListUsers`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
    },
  });

  const data: UserDisplayDto[] = await response.json();
  return data;
}

export async function ChangeRole(dto: ChangeRoleDto):Promise<ChangeRoleResultDto> {
 
  try { 
     const token = localStorage.getItem("token");
    const response = await fetch(`${Base_URL}/change-role`, {
      method: "POST",
      headers: { "Content-Type": "application/json" ,
         "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(dto),
    });

    const data: ChangeRoleResultDto = await response.json();
    return data;
  } catch {
    return {
      isSuccess: false,
      error: "Network error",
    };
  }
}

export async function ChangeDoctorStatus(dto:ChangeDoctorsStatus):Promise<ChangeDoctorsStatusResult> {
  try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${Base_URL}/change-doctor-status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(dto),
      });
      const data: ChangeDoctorsStatusResult = await response.json();
      return data;
    } catch (error) {
      return {
        isSuccess: false,
        error: "Network error",
      };
    }
}

export async function CreateDoctor(dto: CreateDoctorDto):Promise<CreateDoctorResultDto> {
  try { 
     const token = localStorage.getItem("token");
    const response = await fetch(`${Base_URL}/create-doctor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" ,
         "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(dto),
    });

    const data: CreateDoctorResultDto = await response.json();
    return data;
  } catch {
    return {
      isSuccess: false,
      error: "Network error",
    };
  }
}





export async function ResetPassword(dto:ResetPasswordDto):Promise<ResetPasswordResultDto> {
      try {
         const token = localStorage.getItem("token");
            const response = await fetch(`${Base_URL}/reset-password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                     "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify(dto),
            });
    
            const data: ResetPasswordResultDto = await response.json();
            return data;
    
        } 
        catch (error) 
        {
            return {
                isSuccess: false,
                error: "Network error",
            };
        }
}