import type {
  ChangeDepartmentStatusDto,
  ChangeDoctorDepartmentDto,
  CreateDepartmentDto,
  ViewDepartmentDto,
  DepartmentActionResultDto,
} from "../types/department";

const Base_URL = "http://localhost:5272/api/Department";


export async function ChangeDepartmentStatus(
  dto: ChangeDepartmentStatusDto
): Promise<DepartmentActionResultDto> {
  try {
    const token = localStorage.getItem("token");
    const response = await fetch(`${Base_URL}/ChangeDepartmentStatus`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(dto),
    });

    return (await response.json()) as DepartmentActionResultDto;
  } catch (error) {
    return {
      isSuccess: false,
      error: "Network error",
    };
  }
}


export async function ChangeDoctorDepartment(
  dto: ChangeDoctorDepartmentDto
): Promise<DepartmentActionResultDto> {
  try {
    const token = localStorage.getItem("token");
    const response = await fetch(`${Base_URL}/ChangeDoctorDepartment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(dto),
    });

    return (await response.json()) as DepartmentActionResultDto;
  } catch (error) {
    return {
      isSuccess: false,
      error: "Network error",
    };
  }
}

export async function CreateDepartment(
  dto: CreateDepartmentDto
): Promise<DepartmentActionResultDto> {
  try {
    const token = localStorage.getItem("token");
    const response = await fetch(`${Base_URL}/CreateDepartment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(dto),
    });

    return (await response.json()) as DepartmentActionResultDto;
  } catch (error) {
    return {
      isSuccess: false,
      error: "Network error",
    };
  }
}


export async function ViewDepartment(): Promise<ViewDepartmentDto[]> {
  try {
    const token = localStorage.getItem("token");
    const response = await fetch(`${Base_URL}/ViewDepartment`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = (await response.json()) as any;

    // If backend returns a ServiceResult<T> object, unwrap it.
    if (result && typeof result === "object" && "isSuccess" in result) {
      if (!result.isSuccess) {
        console.error("ViewDepartment error:", result.error);
        return [];
      }
      return result.data ?? [];
    }

    // Fallback: if backend returned the raw array (older contract), return it directly
    if (Array.isArray(result)) {
      return result as ViewDepartmentDto[];
    }

    // Unknown shape
    console.error("Unexpected ViewDepartment response:", result);
    return [];
  } catch (error) {
    console.error("Network error while fetching departments:", error);
    return [];
  }
}
