export interface ServiceResult<T> {
  isSuccess: boolean;
  error?: string;
  data?: T;
}