import type { ChangeScheduleDto } from "@/types/schedule";
import { apiClient } from "../apiClient";

export async function ChangeSchedule(dto: ChangeScheduleDto) {
    try {
        const response = await apiClient.post("/Schedule/change-schedule", dto);
        const data = response.data;

        return { 
            IsSuccess: data.IsSuccess ?? data.isSuccess ?? true, 
            Error: data.Error ?? data.error 
        };
    } catch (error: any) {
        return { 
            IsSuccess: false, 
            Error: error.response?.data || "Server error" 
        };
    }
}