import { apiClient } from "../apiClient";
import type { UserDisplayDto } from "@/types/user";
import type { ServiceResult } from "@/types/serviceResult";
 
export async function ListUsers(): Promise<UserDisplayDto[]> {
  try {
    const response = await apiClient.get<ServiceResult<UserDisplayDto[]>>("/Users/ListUsers");
 
    if (!response.data.isSuccess) {
      console.error("Failed to fetch users:", response.data.error);
      return [];
    }
 
    return response.data.data ?? [];
  } catch (error) {
    console.error("Network error while fetching users:", error);
    return [];
  }
}
