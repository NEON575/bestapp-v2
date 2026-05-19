export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export interface SelectOption {
  label: string;
  value: string;
}

export interface AuthSession {
  accessToken: string;
  user: AuthUser;
}

export interface AuthUser {
  sub: string;
  email: string;
  fullName: string;
  roles: string[];
}

export interface LoginDto {
  email: string;
  password: string;
}

