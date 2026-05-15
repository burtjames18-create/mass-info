export interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
}

export interface SessionUser {
  userId: number;
  username: string;
  isAdmin?: boolean;
}
