import type { ViewSchedule } from "@/types/schedule";
import { apiClient } from "../apiClient";

export async function ViewSchedule(): Promise<ViewSchedule[]> {
    try {
        const response = await apiClient.get("/Schedule/list-schedule");
        const result = response.data;
        
       const isSuccess = result.isSuccess ?? result.IsSuccess;
        
        if (isSuccess === false) {
            console.error(result.error || result.Error);
            return [];
        }
        
        return result.data ?? result.Data ?? [];
    } catch (error: any) {
        console.error("ViewSchedule network error:", error);
        return [];
    }
}