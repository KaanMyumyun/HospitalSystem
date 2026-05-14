import { apiClient } from "../apiClient";
import type { ChangeDepartmentStatusDto, DepartmentActionResultDto } from "@/types/department";
 
export async function ChangeDepartmentStatus(dto: ChangeDepartmentStatusDto): Promise<DepartmentActionResultDto> {
  try {
    const response = await apiClient.post<DepartmentActionResultDto>("/Department/ChangeDepartmentStatus", dto);
    return response.data;
  } catch (error: any) {
    return { isSuccess: false, error: error.response?.data?.message ?? "Network error" };
  }
}
