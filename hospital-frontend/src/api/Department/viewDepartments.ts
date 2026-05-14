import { ServiceResult } from "@/types/serviceResult";
import { apiClient } from "../apiClient";
import type { ViewDepartmentDto } from "@/types/department";
 
export async function ViewDepartment(): Promise<ViewDepartmentDto[]> {
  try {
    const response = await apiClient.get<ServiceResult<ViewDepartmentDto[]>>("/Department/ViewDepartment");
 
    if (!response.data.isSuccess) {
      console.error("Failed to fetch departments:", response.data.error);
      return [];
    }
 
    return response.data.data ?? [];
  } catch (error) {
    console.error("Network error while fetching departments:", error);
    return [];
  }
}
