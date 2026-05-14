import { apiClient } from "../apiClient";
import type { DoctorDisplayDto } from "@/types/user";
import type { ServiceResult } from "@/types/serviceResult";
 
export async function ListDoctors(): Promise<DoctorDisplayDto[]> {
  try {
    const response = await apiClient.get<ServiceResult<DoctorDisplayDto[]>>("/Users/ListDoctors");
 
    if (!response.data.isSuccess) {
      console.error("Failed to fetch doctors:", response.data.error);
      return [];
    }
 
    return response.data.data ?? [];
  } catch (error) {
    console.error("Network error while fetching doctors:", error);
    return [];
  }
}
