import type {
  CancelAppointmentDto,
  CancelAppointmentResultDto,
  CreateAppointmentDto,
  CreateAppointmentResultDto,
  ViewAppointmentDto,
} from "@/types/appointment";

const Base_URL = "http://localhost:5272/api/Appointments";

export async function CancelAppointment(
  dto: CancelAppointmentDto
): Promise<CancelAppointmentResultDto> {
  try {
    const token = localStorage.getItem("token");
    const response = await fetch(`${Base_URL}/CancelAppointment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(dto),
    });

    return (await response.json()) as CancelAppointmentResultDto;
  } catch {
    return {
      isSuccess: false,
      error: "Network error",
    };
  }
}

export async function CreateAppointment(
  dto: CreateAppointmentDto
): Promise<CreateAppointmentResultDto> {
  try {
    const token = localStorage.getItem("token");
    const response = await fetch(`${Base_URL}/CreateAppointment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(dto),
    });

    return (await response.json()) as CreateAppointmentResultDto;
  } catch {
    return {
      isSuccess: false,
      error: "Network error",
    };
  }
}

export async function ViewAppointment(): Promise<ViewAppointmentDto[]> {
  try {
    const token = localStorage.getItem("token");

    const response = await fetch(`${Base_URL}/ListAppointments`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();
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
