// import { apiClient } from "./apiClient";
// import type {
//   ChangeRoleResultDto,
//   ChangeRoleDto,
//   UserDisplayDto,
//   DoctorDisplayDto,
//   ResetPasswordDto,
//   ResetPasswordResultDto,
//   ChangeDoctorsStatus,
//   ChangeDoctorsStatusResult,
// } from "../types/user";
// import type { ServiceResult } from "@/types/serviceResult";

// export async function ListDoctors(): Promise<DoctorDisplayDto[]> {
//   try {
//     const response = await apiClient.get<ServiceResult<DoctorDisplayDto[]>>("/Users/ListDoctors");
//     const result = response.data;

//     if (!result.isSuccess) {
//       console.error(result.error);
//       return [];
//     }

//     return result.data ?? [];
//   } catch (error: any) {
//     console.error("ListDoctors error:", error);
//     return [];
//   }
// }

// export async function ListUsers(): Promise<UserDisplayDto[]> {
//   try {
//     const response = await apiClient.get<ServiceResult<UserDisplayDto[]>>("/Users/ListUsers");
//     const result = response.data;

//     if (!result.isSuccess) {
//       console.error(result.error);
//       return [];
//     }

//     return result.data ?? [];
//   } catch (error: any) {
//     console.error("ListUsers error:", error);
//     return [];
//   }
// }

// export async function ChangeRole(dto: ChangeRoleDto) {
//   try {
//     const response = await apiClient.post("/Users/change-role", dto);
//     return response.data ?? { isSuccess: true };
//   } catch (error: any) {
//     return {
//       isSuccess: false,
//       error: error.response?.data || "Server error",
//     };
//   }
// }

// export async function ChangeDoctorStatus(dto: ChangeDoctorsStatus): Promise<ChangeDoctorsStatusResult> {
//   try {
//     const response = await apiClient.post<ChangeDoctorsStatusResult>("/Users/change-doctor-status", dto);
    
//     if (!response.data.isSuccess) {
//       console.error("ChangeDoctorStatus failed:", response.data);
//     }
    
//     return response.data;
//   } catch (error: any) {
//     console.error("ChangeDoctorStatus network error:", error);
//     return {
//       isSuccess: false,
//       error: error.response?.data?.message || "Network error",
//     };
//   }
// }

// export async function ResetPassword(dto: ResetPasswordDto): Promise<ResetPasswordResultDto> {
//   try {
//     const response = await apiClient.post<ResetPasswordResultDto>("/Users/reset-password", dto);
    
//     if (!response.data.isSuccess) {
//       console.error("ResetPassword failed:", response.data);
//     }
    
//     return response.data;
//   } catch (error: any) {
//     console.error("ResetPassword network error:", error);
//     return {
//       isSuccess: false,
//       error: error.response?.data?.message || "Network error",
//     };
//   }
// }