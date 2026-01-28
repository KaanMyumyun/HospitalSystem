import type { UserRole } from "./userRole";
export interface LoginDto
{
    name:string;
    password:string;
}

export interface LoginResultDto
{
    isSuccess:boolean;
    token?:string;
    role?:UserRole;
    error?:string;
}

export interface CreateUserDto
{
    name:string;
    password:string;
}


export interface CreateUserResultDto
{
    isSuccess:boolean;

    error?:string;
}
