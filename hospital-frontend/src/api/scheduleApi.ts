import type { ChangeScheduleDto, CreateScheduleDto, ViewSchedule } from "@/types/schedule";
import type { ServiceResult } from "@/types/serviceResult";

const Base_URL = "http://localhost:5272/api/Schedule";

export async function ViewSchedule(): Promise<ViewSchedule[]> {
    const token = localStorage.getItem("token");
    const response = await fetch(`${Base_URL}/list-schedule`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
    });
    const result = await response.json();
    const isSuccess = result.isSuccess ?? result.IsSuccess;
    
    if (isSuccess === false) {
        console.error(result.error || result.Error);
        return [];
    }
    return result.data ?? result.Data ?? [];
}

export async function CreateSchedule(dto: CreateScheduleDto) {
    const token = localStorage.getItem("token");
    const response = await fetch(`${Base_URL}/create-schedule`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(dto),
    });
    
    if (!response.ok) {
        const text = await response.text();
        console.error("400 body:", text); 
        return { IsSuccess: false, Error: text || "Server error" };
    }
    
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
        const data = await response.json();
         return { 
            IsSuccess: data.IsSuccess ?? data.isSuccess ?? true, 
            Error: data.Error ?? data.error 
        };
    }
   return { IsSuccess: true }; 
}

export async function ChangeSchedule(dto: ChangeScheduleDto) {
    const token = localStorage.getItem("token");
   const response = await fetch(`${Base_URL}/change-schedule`, {
        method: "POST", 
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(dto),
    });
    
    if (!response.ok) {
        const text = await response.text();
        return { IsSuccess: false, Error: text || "Server error" };
    }
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
        const data = await response.json();

        return { 
            IsSuccess: data.IsSuccess ?? data.isSuccess ?? true, 
            Error: data.Error ?? data.error 
        };
    }
    return { IsSuccess: true };
}