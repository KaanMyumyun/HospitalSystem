import { AppointmentStatus } from "./appointmentStatus";

export interface CancelAppointmentResultDto 
{
    isSuccess:boolean;
    error?:string;
}
export interface CancelAppointmentDto
{
AppointmentId:number;
Status:AppointmentStatus;
Reason:string;
}
export interface CreateAppointmentResultDto
{
    isSuccess:boolean;
    error?:string;
}
export interface CreateAppointmentDto
{
    DoctorId:number;
    PatientId:number;
    AppointmentTime:string;
}
export interface ViewAppointmentDto
{
    AppointmentId:number;
    DoctorId:number;
    DoctorName:string;
    PatientId:number;
    PatientName:number;
    AppointmentTime:string;
    Status:AppointmentStatus;
}