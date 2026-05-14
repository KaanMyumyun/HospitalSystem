import { apiClient } from "../apiClient";
import type { ChangeDoctorsStatus, ChangeDoctorsStatusResult } from "@/types/user";
 
export async function ChangeDoctorStatus(dto: ChangeDoctorsStatus): Promise<ChangeDoctorsStatusResult> {
  try {
    const response = await apiClient.post<ChangeDoctorsStatusResult>("/Users/change-doctor-status", dto);
    return response.data;
  } catch (error: any) {
    return {
      isSuccess: false,
      error: error.response?.data?.message ?? "Network error",
    };
  }
}
