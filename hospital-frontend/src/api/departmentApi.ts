import { apiClient } from "./apiClient";
import type {
  ChangeDepartmentStatusDto,
  ChangeDoctorDepartmentDto,
  CreateDepartmentDto,
  ViewDepartmentDto,
  DepartmentActionResultDto,
} from "../types/department";

export async function ChangeDepartmentStatus(dto: ChangeDepartmentStatusDto): Promise<DepartmentActionResultDto> {
  try {
    const response = await apiClient.post<DepartmentActionResultDto>("/Department/ChangeDepartmentStatus", dto);
    return response.data;
  } catch (error: any) {
    return { isSuccess: false, error: "Network error" };
  }
}

export async function ChangeDoctorDepartment(dto: ChangeDoctorDepartmentDto): Promise<DepartmentActionResultDto> {
  try {
    const response = await apiClient.post<DepartmentActionResultDto>("/Department/ChangeDoctorDepartment", dto);
    return response.data;
  } catch (error: any) {
    return { isSuccess: false, error: "Network error" };
  }
}

export async function CreateDepartment(dto: CreateDepartmentDto): Promise<DepartmentActionResultDto> {
  try {
    const response = await apiClient.post<DepartmentActionResultDto>("/Department/CreateDepartment", dto);
    return response.data;
  } catch (error: any) {
    return { isSuccess: false, error: "Network error" };
  }
}

export async function ViewDepartment(): Promise<ViewDepartmentDto[]> {
  try {
    const response = await apiClient.get("/Department/ViewDepartment");
    const result = response.data;

    if (result && typeof result === "object" && "isSuccess" in result) {
      if (!result.isSuccess) {
        console.error("ViewDepartment error:", result.error);
        return [];
      }
      return result.data ?? [];
    }

    if (Array.isArray(result)) {
      return result as ViewDepartmentDto[];
    }
    
    console.error("Unexpected ViewDepartment response:", result);
    return [];
  } catch (error: any) {
    console.error("Network error:", error);
    return [];
  }
}