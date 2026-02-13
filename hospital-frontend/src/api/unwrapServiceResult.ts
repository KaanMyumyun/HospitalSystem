import type { ServiceResult } from "@/types/serviceResult";

export function unwrapServiceResult<T>(result: ServiceResult<T>): T {
  if (!result.isSuccess) {
    throw new Error(result.error ?? "Operation failed");
  }

  if (result.data === undefined || result.data === null) {
    throw new Error("No data returned from server");
  }

  return result.data;
}
