import React, { createContext, useContext, useReducer, ReactNode, useCallback } from "react";
import { AuthUser, AuthState, Permission, LoginResponse } from "@/types";
import apiClient from "@/utils/api";

type AuthAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "LOGIN_SUCCESS"; payload: { user: AuthUser; token: string } }
  | { type: "LOGIN_FAILURE"; payload: string }
  | { type: "LOGOUT" }
  | { type: "RESTORE_SESSION"; payload: { user: AuthUser; token: string } };

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload, error: null };
    case "LOGIN_SUCCESS":
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case "LOGIN_FAILURE":
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case "LOGOUT":
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      return initialState;
    case "RESTORE_SESSION":
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
      };
    default:
      return state;
  }
};

interface AuthContextType extends AuthState {
  login: (email: string) => Promise<void>;
  logout: () => void;
  hasPermission: (requiredPermission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // 恢復會話
  React.useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const userStr = localStorage.getItem("auth_user");
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        dispatch({ type: "RESTORE_SESSION", payload: { user, token } });
      } catch (error) {
        console.error("Failed to restore session:", error);
      }
    }
  }, []);

  const login = useCallback(async (email: string) => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const response = await apiClient.post<LoginResponse>("/api/auth/auto-login", {
        email,
      });

      if (response.data) {
        const { token, permission } = response.data;

        // 獲取用戶信息
        const verifyResponse = await apiClient.get("/api/auth/verify", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (verifyResponse.data) {
          const user: AuthUser = {
            teacherId: verifyResponse.data.teacher_id,
            teacherName: verifyResponse.data.teacher_name_cn,
            permission,
            email,
            department: verifyResponse.data.department,
          };

          // 保存到 localStorage
          localStorage.setItem("auth_token", token);
          localStorage.setItem("auth_user", JSON.stringify(user));

          dispatch({
            type: "LOGIN_SUCCESS",
            payload: { user, token },
          });
        }
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || "登入失敗，請重試";
      dispatch({ type: "LOGIN_FAILURE", payload: errorMessage });
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    dispatch({ type: "LOGOUT" });
  }, []);

  const hasPermission = (requiredPermission: Permission): boolean => {
    if (!state.user) return false;

    // 權限級別：super_admin > admin > viewer > teacher
    const permissionLevels: Record<Permission, number> = {
      teacher: 1,
      viewer: 2,
      admin: 3,
      super_admin: 4,
    };

    return (permissionLevels[state.user.permission] ?? 0) >= (permissionLevels[requiredPermission] ?? 0);
  };

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
