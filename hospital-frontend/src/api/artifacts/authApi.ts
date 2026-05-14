// import { apiClient } from "../apiClient";

// import type { LoginDto, LoginResultDto, CreateUserDto, CreateUserResultDto } from "../../types/auth";

// export async function login(dto: LoginDto): Promise<LoginResultDto> {
//   try {
//     const response = await apiClient.post<LoginResultDto>("/Auth/login", dto);
    
//     if (response.data.isSuccess && response.data.token) {
//       localStorage.setItem("token", response.data.token);
//      if (response.data.role) {
//          localStorage.setItem("role", response.data.role);
//       }
//     }

//     return response.data;
//   } catch (error: any) {
//     return { 
//         isSuccess: false, 
//         error: error.response?.data?.message || "Network error" 
//     };
//   }
// }

// export async function CreateUser(dto: CreateUserDto): Promise<CreateUserResultDto> {
//     try {
//         const response = await apiClient.post<CreateUserResultDto>("/Auth/CreateUser", dto);
//         return response.data;
//     } 
//     catch (error: any) {
//         return {
//             isSuccess: false,
//             error: error.response?.data?.message || "Network error",
//         };
//     }
// }