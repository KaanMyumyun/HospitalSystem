// import { apiClient } from "./apiClient";
// import type { ChangeScheduleDto, CreateScheduleDto, ViewSchedule } from "@/types/schedule";

// export async function ViewSchedule(): Promise<ViewSchedule[]> {
//     try {
//         const response = await apiClient.get("/Schedule/list-schedule");
//         const result = response.data;
        
//        const isSuccess = result.isSuccess ?? result.IsSuccess;
        
//         if (isSuccess === false) {
//             console.error(result.error || result.Error);
//             return [];
//         }
        
//         return result.data ?? result.Data ?? [];
//     } catch (error: any) {
//         console.error("ViewSchedule network error:", error);
//         return [];
//     }
// }

// export async function CreateSchedule(dto: CreateScheduleDto) {
//     try {
//         const response = await apiClient.post("/Schedule/create-schedule", dto);
//         const data = response.data;

//         return { 
//             IsSuccess: data.IsSuccess ?? data.isSuccess ?? true, 
//             Error: data.Error ?? data.error 
//         };
//     } catch (error: any) {
//         console.error("400 body:", error.response?.data);
//         return { 
//             IsSuccess: false, 
//             Error: error.response?.data || "Server error" 
//         };
//     }
// }

// export async function ChangeSchedule(dto: ChangeScheduleDto) {
//     try {
//         const response = await apiClient.post("/Schedule/change-schedule", dto);
//         const data = response.data;

//         return { 
//             IsSuccess: data.IsSuccess ?? data.isSuccess ?? true, 
//             Error: data.Error ?? data.error 
//         };
//     } catch (error: any) {
//         return { 
//             IsSuccess: false, 
//             Error: error.response?.data || "Server error" 
//         };
//     }
// }