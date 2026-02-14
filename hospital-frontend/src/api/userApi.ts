import type {
  ChangeRoleResultDto,
  ChangeRoleDto,
  UserDisplayDto,
  DoctorDisplayDto,
  ResetPasswordDto,
  ResetPasswordResultDto,
  CreateDoctorDto,
  CreateDoctorResultDto,
  ChangeDoctorsStatus,
  ChangeDoctorsStatusResult,
} from "../types/user";
import type { ServiceResult } from "@/types/serviceResult";

const Base_URL = "http://localhost:5272/api/Users";

export async function ListDoctors(): Promise<DoctorDisplayDto[]> {
  const token = localStorage.getItem("token");
  
  // Fixed: Added parentheses around template literal
  const response = await fetch(`${Base_URL}/ListDoctors`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  
  const result: ServiceResult<DoctorDisplayDto[]> = await response.json();
  
  if (!result.isSuccess) {
    console.error(result.error);
    return [];
  }
  
  return result.data ?? [];
}

export async function ListUsers(): Promise<UserDisplayDto[]> {
  const token = localStorage.getItem("token");
  
  // Fixed: Added parentheses around template literal
  const response = await fetch(`${Base_URL}/ListUsers`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  
  const result: ServiceResult<UserDisplayDto[]> = await response.json();
  
  if (!result.isSuccess) {
    console.error(result.error);
    return [];
  }
  
  return result.data ?? [];
}

export async function ChangeRole(dto: ChangeRoleDto) {
  const token = localStorage.getItem("token");

  const response = await fetch(`${Base_URL}/change-role`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(dto),
  });

  if (!response.ok) {
    const text = await response.text();
    return {
      isSuccess: false,
      error: text || "Server error",
    };
  }

  const contentType = response.headers.get("content-type");

  if (contentType?.includes("application/json")) {
    return await response.json();
  }

  return { isSuccess: true };
}


export async function ChangeDoctorStatus(
  dto: ChangeDoctorsStatus
): Promise<ChangeDoctorsStatusResult> {
  try {
    const token = localStorage.getItem("token");
    
    // Fixed: Added parentheses around template literal
    const response = await fetch(`${Base_URL}/change-doctor-status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(dto),
    });
    
    const result = await response.json();
    
    if (!result.isSuccess) {
      console.error("ChangeDoctorStatus failed:", result);
    }
    
    return result;
  } catch (error) {
    console.error("ChangeDoctorStatus network error:", error);
    return {
      isSuccess: false,
      error: "Network error",
    };
  }
}

// export async function CreateDoctor(
//   dto: CreateDoctorDto
// ): Promise<CreateDoctorResultDto> {
//   try {
//     const token = localStorage.getItem("token");

//     if (!token) {
//       return {
//         isSuccess: false,
//         error: "Not authenticated",
//       };
//     }

//     const response = await fetch(`${Base_URL}/create-doctor`, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${token}`,
//       },
//       body: JSON.stringify(dto),
//     });

//     // Read response as text first (handles non-JSON errors)
//     const text = await response.text();

//     // If HTTP status is not OK, return server error message
//     if (!response.ok) {
//       return {
//         isSuccess: false,
//         error: text || `HTTP ${response.status}`,
//       };
//     }

//     // Try parsing JSON safely
//     try {
//       return JSON.parse(text) as CreateDoctorResultDto;
//     } catch {
//       return {
//         isSuccess: false,
//         error: "Invalid JSON response from server",
//       };
//     }
//   } catch (err) {
//     console.error("CreateDoctor failed:", err);
//     return {
//       isSuccess: false,
//       error: "Network error",
//     };
//   }
// }


export async function ResetPassword(
  dto: ResetPasswordDto
): Promise<ResetPasswordResultDto> {
  try {
    const token = localStorage.getItem("token");
    
    // Fixed: Added parentheses around template literal
    const response = await fetch(`${Base_URL}/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(dto),
    });
    
    const result = await response.json();
    
    if (!result.isSuccess) {
      console.error("ResetPassword failed:", result);
    }
    
    return result;
  } catch (error) {
    console.error("ResetPassword network error:", error);
    return {
      isSuccess: false,
      error: "Network error",
    };
  }
}