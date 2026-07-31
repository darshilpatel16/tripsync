export type AuthUser = {
  id: string;
  displayName: string;
  email: string;
  createdAt: string;
};

export type AuthStatus = "loading" | "authenticated" | "guest";

export type AuthContextValue = {
  user: AuthUser | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
};
