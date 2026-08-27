import React, { createContext, useContext, useReducer, ReactNode, useCallback } from "react";
import { AuthUser, AuthState, Permission } from "@/types";
import { clearSession, type AuthVerifyResponse } from "@/services/authService";

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
  isLoading: true,
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
      clearSession();
      return { ...initialState, isLoading: false };
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
  completeLogin: (authData: AuthVerifyResponse) => void;
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
        clearSession();
        dispatch({ type: "SET_LOADING", payload: false });
      }
    } else {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, []);

  const completeLogin = useCallback((authData: AuthVerifyResponse) => {
    const user: AuthUser = {
      teacherId: authData.teacher_id,
      teacherName: authData.teacher_name,
      permission: authData.permission,
      email: authData.email,
    };

    dispatch({
      type: "LOGIN_SUCCESS",
      payload: { user, token: authData.token },
    });
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

    return (
      (permissionLevels[state.user.permission] ?? 0) >=
      (permissionLevels[requiredPermission] ?? 0)
    );
  };

  const value: AuthContextType = {
    ...state,
    completeLogin,
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
