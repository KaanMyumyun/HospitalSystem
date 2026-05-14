import { apiClient } from "../apiClient";
import type { ChangeDoctorDepartmentDto, DepartmentActionResultDto } from "@/types/department";
 
export async function ChangeDoctorDepartment(dto: ChangeDoctorDepartmentDto): Promise<DepartmentActionResultDto> {
  try {
    const response = await apiClient.post<DepartmentActionResultDto>("/Department/ChangeDoctorDepartment", dto);
    return response.data;
  } catch (error: any) {
    return { isSuccess: false, error: error.response?.data?.message ?? "Network error" };
  }
}
