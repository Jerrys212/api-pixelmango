export interface ApiResponse<T> {
  status: number;
  message: string;
  data: T | null;
  error: ApiError | null;
}

export interface ApiError {
  code: string;
  details?: Record<string, string[]>;
}
