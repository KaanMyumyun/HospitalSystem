import { apiClient } from "../apiClient";
import type { ResetPasswordDto, ResetPasswordResultDto } from "@/types/user";
 
export async function ResetPassword(dto: ResetPasswordDto): Promise<ResetPasswordResultDto> {
  try {
    const response = await apiClient.post<ResetPasswordResultDto>("/Users/reset-password", dto);
    return response.data;
  } catch (error: any) {
    return {
      isSuccess: false,
      error: error.response?.data?.message ?? "Network error",
    };
  }
}
