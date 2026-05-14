import { ServiceResult } from "@/types/serviceResult";
import { apiClient } from "../apiClient";
import type { ViewAppointmentDto } from "@/types/appointment";
 
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
