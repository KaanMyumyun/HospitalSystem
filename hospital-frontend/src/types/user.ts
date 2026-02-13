import type { UserRole } from "./userRole";

export interface ChangeRoleResultDto
{
    isSuccess:boolean;
    error?:string;
}
export interface ChangeRoleDto
{
    UserId:number;
    NewRole:UserRole;
}
export interface DoctorDisplayDto
{
    DoctorId:number;
    DeparmentId:number;
    UserId:number;
    Name:string;
    IsActive: boolean; 
}
export interface UserDisplayDto
{
    UserId:number;
    UserName:string;
    Role:UserRole;
}
export interface ResetPasswordResultDto
{
      isSuccess:boolean;
    error?:string;
}
export interface ResetPasswordDto
{
    UserId:number;
    NewPassword:string;
}
export interface CreateDoctorResultDto
{
    isSuccess:boolean;
    error?:string;
}
export interface CreateDoctorDto
{
    UserId:number;
    DepartmentId:number;
}
export interface ChangeDoctorsStatus
{
   UserId:number;
   IsActive:boolean;
   DoctorId:number;
   UserName:string;
}
export interface ChangeDoctorsStatusResult
{
    isSuccess:boolean;
    error?:string;
    Name?:ChangeDoctorsStatus;
}