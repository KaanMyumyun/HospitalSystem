export interface CalendarActionResult {
  IsSuccess: boolean;
  Error?: string;
}

export interface CreateScheduleDto {
  DoctorId: number;
  StartHour: number;
  EndHour: number;
  SlotDurationMin:number
}

export interface ChangeScheduleDto {
  ScheduleId: number;
  StartHour: number;
  EndHour: number;
  SlotDurationMin:number
}
export interface ViewSchedule {
    ScheduleId: number;
    DoctorId: number;
    StartTime: string;  
    EndTime: string;
    SlotDurationMin:number

}