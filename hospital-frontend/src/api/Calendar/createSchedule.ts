import type { CreateScheduleDto } from "@/types/schedule";
import { apiClient } from "../apiClient";

export async function CreateSchedule(dto: CreateScheduleDto) {
    try {
        const response = await apiClient.post("/Schedule/create-schedule", dto);
        const data = response.data;

        return { 
            IsSuccess: data.IsSuccess ?? data.isSuccess ?? true, 
            Error: data.Error ?? data.error 
        };
    } catch (error: any) {
        console.error("400 body:", error.response?.data);
        return { 
            IsSuccess: false, 
            Error: error.response?.data || "Server error" 
        };
    }
}