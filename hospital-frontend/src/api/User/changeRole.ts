import { apiClient } from "../apiClient";
import type { ChangeRoleDto, ChangeRoleResultDto } from "@/types/user";
 
export async function ChangeRole(dto: ChangeRoleDto): Promise<ChangeRoleResultDto> {
  try {
    const response = await apiClient.post<ChangeRoleResultDto>("/Users/change-role", dto);
    return response.data;
  } catch (error: any) {
    return {
      isSuccess: false,
      error: error.response?.data?.message ?? "Network error",
    };
  }
}
