import { apiClient } from "../apiClient";
import type { CreateUserDto, CreateUserResultDto } from "@/types/auth";
 
export async function CreateUser(dto: CreateUserDto): Promise<CreateUserResultDto> {
  try {
    const response = await apiClient.post<CreateUserResultDto>("/Auth/CreateUser", dto);
    return response.data;
  } catch (error: any) {
    return {
      isSuccess: false,
      error: error.response?.data?.message ?? "Network error",
    };
  }
}
