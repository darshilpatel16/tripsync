import { useEffect, useMemo, useState, type ReactNode } from "react";

import { ApiError, apiRequest } from "../lib/api";
import { AuthContext } from "./auth-context";
import type { AuthStatus, AuthUser } from "./auth-types";

type UserResponse = {
  data: { user: AuthUser };
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    let isActive = true;

    const loadCurrentUser = async () => {
      try {
        const response = await apiRequest<UserResponse>("/auth/me");
        if (isActive) {
          setUser(response.data.user);
          setStatus("authenticated");
        }
      } catch (error) {
        if (isActive) {
          setUser(null);
          setStatus("guest");

          if (!(error instanceof ApiError && error.status === 401)) {
            console.error("Could not restore the TripSync session", error);
          }
        }
      }
    };

    void loadCurrentUser();

    return () => {
      isActive = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      login: async (email: string, password: string) => {
        const response = await apiRequest<UserResponse>("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        setUser(response.data.user);
        setStatus("authenticated");
        return response.data.user;
      },
      logout: async () => {
        await apiRequest<void>("/auth/logout", { method: "POST" });
        setUser(null);
        setStatus("guest");
      },
      updateAvatar: async (avatarDataUrl: string | null) => {
        const response = await apiRequest<UserResponse>("/auth/profile/avatar", {
          method: "PATCH",
          body: JSON.stringify({ avatarDataUrl }),
        });
        setUser(response.data.user);
        return response.data.user;
      },
    }),
    [status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
