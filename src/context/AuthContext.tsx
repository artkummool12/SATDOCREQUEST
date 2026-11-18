import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  auth,
  googleAuthProvider,
  microsoftAuthProvider,
} from '../lib/firebase';
import {
  ensureInitialEmployeesSeeded,
  findEmployeeByCode,
  getOrCreateFirebaseUser,
  getUserProfile,
  loginOrSyncEmployeeUser,
} from '../lib/firestore-db';
import type { AppUser } from '../types/document';

const EMP_UID_KEY = 'docflow_emp_uid';

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  dbUser: AppUser | null;
  loading: boolean;
  authError: string | null;
  loginWithEmployeeCode: (employeeCode: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithMicrosoft: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [dbUser, setDbUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const activeEmpUidRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    // Pre-seed initial corporate employee directory in Firestore if empty
    ensureInitialEmployeesSeeded().catch((err) => {
      console.error('Initial employee seed check error:', err);
    });

    const storedEmpUid =
      typeof window !== 'undefined'
        ? window.sessionStorage.getItem(EMP_UID_KEY)
        : null;

    if (storedEmpUid) {
      activeEmpUidRef.current = storedEmpUid;
      getUserProfile(storedEmpUid)
        .then((user) => {
          if (active) {
            if (user) {
              setDbUser(user);
              setAuthError(null);
            } else {
              window.sessionStorage.removeItem(EMP_UID_KEY);
              activeEmpUidRef.current = null;
            }
          }
        })
        .catch(() => {
          if (typeof window !== 'undefined') {
            window.sessionStorage.removeItem(EMP_UID_KEY);
          }
          activeEmpUidRef.current = null;
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!active) return;
      setFirebaseUser(user);
      if (user) {
        try {
          const synced = await getOrCreateFirebaseUser(user);
          if (active) {
            setDbUser(synced);
            setAuthError(null);
          }
        } catch (err: any) {
          console.error('Failed to sync Firebase user profile:', err);
          if (active) {
            setAuthError(err?.message || 'ไม่สามารถเชื่อมต่อบัญชีผู้ใช้งานได้');
          }
        } finally {
          if (active) setLoading(false);
        }
      } else if (!activeEmpUidRef.current) {
        setDbUser(null);
        if (active) setLoading(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const loginWithEmployeeCode = useCallback(async (employeeCode: string) => {
    setAuthError(null);
    const code = employeeCode.trim().toUpperCase();
    if (!code) {
      setAuthError('กรุณากรอกรหัสพนักงาน');
      return;
    }

    try {
      const emp = await findEmployeeByCode(code);
      if (!emp) {
        throw new Error(
          'ไม่พบรหัสพนักงานนี้ในฐานข้อมูล Firebase กรุณาตรวจสอบรหัสพนักงาน (เช่น SAT0009, SAT0011)'
        );
      }
      const user = await loginOrSyncEmployeeUser(emp);
      activeEmpUidRef.current = user.uid;
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(EMP_UID_KEY, user.uid);
      }
      setDbUser(user);
      setAuthError(null);
    } catch (err: any) {
      const message =
        err?.message || 'ไม่สามารถเข้าสู่ระบบด้วยรหัสพนักงานได้';
      setAuthError(message);
      throw err;
    }
  }, []);

  const loginWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      if (err?.code !== 'auth/popup-closed-by-user') {
        setAuthError('การเข้าสู่ระบบด้วย Google ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
      }
    }
  }, []);

  const loginWithMicrosoft = useCallback(async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, microsoftAuthProvider);
    } catch (err: any) {
      console.error('Microsoft/Outlook Sign-In failed:', err);
      if (err?.code === 'auth/popup-closed-by-user') return;
      setAuthError(
        'การเข้าสู่ระบบด้วย Microsoft / Outlook ไม่สำเร็จ กรุณาตรวจสอบการตั้งค่า หรือใช้รหัสพนักงานในการเข้าสู่ระบบ'
      );
    }
  }, []);

  const logout = useCallback(async () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(EMP_UID_KEY);
    }
    activeEmpUidRef.current = null;
    setDbUser(null);
    setAuthError(null);
    try {
      if (auth.currentUser) {
        await signOut(auth);
      }
    } catch {
      // ignore firebase signout error
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const uid = dbUser?.uid || activeEmpUidRef.current || auth.currentUser?.uid;
    if (!uid) return;
    try {
      const updated = await getUserProfile(uid);
      if (updated) {
        setDbUser(updated);
      }
    } catch (err) {
      console.error('Failed to refresh profile from Firestore:', err);
    }
  }, [dbUser?.uid]);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        dbUser,
        loading,
        authError,
        loginWithEmployeeCode,
        loginWithGoogle,
        loginWithMicrosoft,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
