import { apiClient } from "../apiClient";
import type { CreateAppointmentDto, CreateAppointmentResultDto } from "@/types/appointment";
 
export async function CreateAppointment(dto: CreateAppointmentDto): Promise<CreateAppointmentResultDto> {
  try {
    const response = await apiClient.post<CreateAppointmentResultDto>("/Appointments/CreateAppointment", dto);
    return response.data;
  } catch (error: any) {
    return {
      isSuccess: false,
      error: error.response?.data?.message ?? "Network error",
    };
  }
}
