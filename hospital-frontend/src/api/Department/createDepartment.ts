import { apiClient } from "../apiClient";
import type { CreateDepartmentDto, DepartmentActionResultDto } from "@/types/department";
 
export async function CreateDepartment(dto: CreateDepartmentDto): Promise<DepartmentActionResultDto> {
  try {
    const response = await apiClient.post<DepartmentActionResultDto>("/Department/CreateDepartment", dto);
    return response.data;
  } catch (error: any) {
    return { isSuccess: false, error: error.response?.data?.message ?? "Network error" };
  }
}
