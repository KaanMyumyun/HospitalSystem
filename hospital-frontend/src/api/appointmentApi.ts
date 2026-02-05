import type { CancelAppointmentDto,CancelAppointmentResultDto,CreateAppointmentDto,CreateAppointmentResultDto,ViewAppointmentDto } from "@/types/appointment";
import type { AppointmentStatus } from "@/types/appointmentStatus";
const Base_URL = "http://localhost:5272/api/Appointments";
export async function CancelAppointment(dto:CancelAppointmentDto):Promise<CancelAppointmentResultDto> {
   try {
       const token = localStorage.getItem("token");
       const response = await fetch(`${Base_URL}/CancelAppointment`, {
         method: "POST",
         headers: {
           "Content-Type": "application/json",
           "Authorization": `Bearer ${token}`,
         },
         body: JSON.stringify(dto),
       });
       const data: CancelAppointmentResultDto = await response.json();
       return data;
     } catch (error) {
       return {
         isSuccess: false,
         error: "Network error",
       };
     }
}
export async function CreateAppointment(dto:CreateAppointmentDto):Promise<CreateAppointmentResultDto> {
      try {
       const token = localStorage.getItem("token");
       const response = await fetch(`${Base_URL}/CreateAppointment`, {
         method: "POST",
         headers: {
           "Content-Type": "application/json",
           "Authorization": `Bearer ${token}`,
         },
         body: JSON.stringify(dto),
       });
       const data: CreateAppointmentResultDto = await response.json();
       return data;
     } catch (error) {
       return {
         isSuccess: false,
         error: "Network error",
       };
     }
}
export async function ViewAppointment(dto:ViewAppointmentDto) {
      const token = localStorage.getItem("token");
    
      const response = await fetch(`${Base_URL}/ListAppointments`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
    
      const data: ViewAppointmentDto[] = await response.json();
      return data;
}
