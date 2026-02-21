import { apiClient } from "./apiClient";
import type {
  CancelAppointmentDto,
  CancelAppointmentResultDto,
  CreateAppointmentDto,
  CreateAppointmentResultDto,
  ViewAppointmentDto,
} from "@/types/appointment";

export async function CancelAppointment(dto: CancelAppointmentDto): Promise<CancelAppointmentResultDto> {
  try {
    const response = await apiClient.post<CancelAppointmentResultDto>("/Appointments/CancelAppointment", dto);
    return response.data;
  } catch (error: any) {
    return {
      isSuccess: false,
      error: error.response?.data?.message || "Network error",
    };
  }
}

export async function CreateAppointment(dto: CreateAppointmentDto): Promise<CreateAppointmentResultDto> {
  try {
    console.log("Sending appointment:", dto);
    const response = await apiClient.post<CreateAppointmentResultDto>("/Appointments/CreateAppointment", dto);
    console.log("Result:", response.data);
    return response.data;
    
  } catch (error: any) {
    console.error("Network error:", error);
    return {
      isSuccess: false,
      error: error.response?.data?.message || "Network error",
    };
  }
}

export async function ViewAppointment(): Promise<ViewAppointmentDto[]> {
  try {
    const response = await apiClient.get("/Appointments/ListAppointments");
    const result = response.data;

    // Handling your backend's specific wrapper format
    if (result && typeof result === "object" && "isSuccess" in result) {
      if (!result.isSuccess) {
        console.error("ViewAppointment error:", result.error);
        return [];
      }
      return result.data ?? [];
    }

    if (Array.isArray(result)) {
      return result as ViewAppointmentDto[];
    }

    console.error("Unexpected ViewAppointment response:", result);
    return [];
  } catch (error) {
    console.error("Network error while fetching appointments:", error);
    return [];
  }
}