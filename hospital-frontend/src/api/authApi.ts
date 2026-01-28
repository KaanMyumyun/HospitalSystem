import type { LoginDto, LoginResultDto } from "../types/auth";
import type { CreateUserDto, CreateUserResultDto } from "../types/auth";
const Base_URL = "http://localhost:5272";

export async function login(dto: LoginDto): Promise<LoginResultDto> {
    try {
        const response = await fetch(`${Base_URL}/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(dto),
        });

        const data: LoginResultDto = await response.json();
        return data;

    } 
    catch (error) 
    {
        return {
            isSuccess: false,
            error: "Network error",
        };
    }
}

export async function CreateUser(dto: CreateUserDto): Promise<CreateUserResultDto> {
    try {
        const response = await fetch(`${Base_URL}/CreateUser`,
            {
                method: "POST",
                headers:
                {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(dto),
            });
        const data: CreateUserResultDto = await response.json();
        return data;
    } 
   catch (error) 
    {
        return {
            isSuccess: false,
            error: "Network error",
        };
    }
}
