import { apiClient } from "../apiClient";
import type { CancelAppointmentDto, CancelAppointmentResultDto } from "@/types/appointment";
 
export async function CancelAppointment(dto: CancelAppointmentDto): Promise<CancelAppointmentResultDto> {
  try {
    const response = await apiClient.post<CancelAppointmentResultDto>("/Appointments/CancelAppointment", dto);
    return response.data;
  } catch (error: any) {
    return {
      isSuccess: false,
      error: error.response?.data?.message ?? "Network error",
    };
  }
}
