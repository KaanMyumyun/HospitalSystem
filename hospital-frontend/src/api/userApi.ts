
import type { ChangeRoleResultDto, ChangeRoleDto, UserDisplayDto, DoctorDisplayDto, ResetPasswordDto, ResetPasswordResultDto } from "../types/user";
const Base_URL = "http://localhost:5272";

export async function ListDoctors() {
    const response = await fetch(`${Base_URL}/ListDoctors`, {
                        method: "GET",
                    });
            
                    const data: DoctorDisplayDto[] = await response.json();
                    return data;
}

export async function ListUsers() {
      const response = await fetch(`${Base_URL}/ListUsers`, {
                        method: "GET",
                    });
            
                    const data: UserDisplayDto[] = await response.json();
                    return data;
}

export async function ChangeRole(dto:ChangeRoleDto):Promise <ChangeRoleResultDto> {
    try {
            const response = await fetch(`${Base_URL}/change-role`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(dto),
            });
    
            const data: ChangeRoleResultDto = await response.json();
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

export async function ResetPassword(dto:ResetPasswordDto):Promise<ResetPasswordResultDto> {
      try {
            const response = await fetch(`${Base_URL}/reset-password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
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