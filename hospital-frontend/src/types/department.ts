export interface ChangeDepartmentStatusDto
{
    DepartmentId:number;
    IsActive:boolean;
}

export interface DepartmentActionResultDto
{
    isSuccess:boolean;
    error?:string;
}

export interface ChangeDoctorDepartmentDto
{
    DepartmentId:number;
    DoctorId:number;
}

export interface CreateDepartmentDto
{
    Name:string
}

export interface ViewDepartmentDto
{
    DepartmentId:number;
    Name:string;
}