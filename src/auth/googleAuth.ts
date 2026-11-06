import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
  Auth,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

const STORAGE_KEY_TOKEN = "bifogat_g_token";
const STORAGE_KEY_TOKEN_TIME = "bifogat_g_token_time";
const STORAGE_KEY_USER = "bifogat_g_user";

// The OAuth access token (Drive/Sheets scopes) is kept in sessionStorage rather than
// localStorage: it survives reloads of the open app but is not left behind on disk, which
// limits what an XSS or a shared device can read. It expires after an hour regardless.
const tokenStore = (): Storage | null => {
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    return null;
  }
};

// Drop any token an older version left in localStorage.
try {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_TOKEN_TIME);
  }
} catch {
  // storage unavailable
}

let cachedAccessToken: string | null = tokenStore()?.getItem(STORAGE_KEY_TOKEN) ?? null;

try {
  if (firebaseConfig.apiKey && firebaseConfig.apiKey.trim() !== "") {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    // Enforce long-lived browser local persistence
    setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.warn("Kunde inte ställa in persistent inloggning:", err);
    });
  } else {
    console.warn("Firebase API-nyckel saknas i miljövariabler.");
  }
} catch (err) {
  console.error("Kunde inte initiera Firebase:", err);
}

const provider = new GoogleAuthProvider();
provider.addScope("https://www.googleapis.com/auth/spreadsheets");
provider.addScope("https://www.googleapis.com/auth/drive.file");
// Note: the Firebase popup flow only yields a short-lived access token (no refresh token),
// so the token cannot be renewed silently; the sync engine surfaces `needs_auth` instead.

let isSigningIn = false;

export interface SavedUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

/**
 * Retrieve saved user from localStorage for instant offline hydration
 */
export const getSavedUser = (): SavedUser | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/**
 * Check if the stored OAuth token is valid.
 * Google OAuth 2.0 access tokens expire after 60 minutes (3600 seconds) by Google policy.
 * We check against a 50-minute threshold so tokens can be renewed BEFORE hitting 401 API errors.
 */
export const isTokenFresh = (): boolean => {
  const timeStr = tokenStore()?.getItem(STORAGE_KEY_TOKEN_TIME);
  if (!timeStr) return false;
  const elapsed = Date.now() - parseInt(timeStr, 10);
  return elapsed < 50 * 60 * 1000;
};

/**
 * Get human-readable token status and estimated expiry details
 */
export const getTokenDetails = (): {
  createdAt: string | null;
  expiresAt: string | null;
  remainingMinutes: number;
  isFresh: boolean;
} => {
  const timeStr = tokenStore()?.getItem(STORAGE_KEY_TOKEN_TIME);
  if (!timeStr) {
    return { createdAt: null, expiresAt: null, remainingMinutes: 0, isFresh: false };
  }
  const createdMs = parseInt(timeStr, 10);
  const elapsedMs = Date.now() - createdMs;
  const remainingMs = Math.max(0, 60 * 60 * 1000 - elapsedMs);
  const remainingMinutes = Math.floor(remainingMs / (60 * 1000));
  const isFresh = elapsedMs < 50 * 60 * 1000;

  const createdDate = new Date(createdMs);
  const expiresDate = new Date(createdMs + 60 * 60 * 1000);

  const createdAt = createdDate.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
  const expiresAt = expiresDate.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });

  return { createdAt, expiresAt, remainingMinutes, isFresh };
};

export const clearAccessToken = (): void => {
  cachedAccessToken = null;
  const store = tokenStore();
  store?.removeItem(STORAGE_KEY_TOKEN);
  store?.removeItem(STORAGE_KEY_TOKEN_TIME);
};

export const initAuth = (
  onAuthSuccess?: (user: User | SavedUser, token: string) => void,
  onAuthFailure?: () => void,
) => {
  // 1. Instant hydration from localStorage so UI does not flicker or reset
  const savedUser = getSavedUser();
  const savedToken = isTokenFresh() ? tokenStore()?.getItem(STORAGE_KEY_TOKEN) : null;
  if (savedUser && onAuthSuccess) {
    onAuthSuccess(savedUser, savedToken || "");
  }

  if (!auth) {
    if (!savedUser && onAuthFailure) onAuthFailure();
    return () => {};
  }

  // 2. Firebase Auth state listener
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      // Re-read token from storage or memory
      const token = isTokenFresh() ? cachedAccessToken || tokenStore()?.getItem(STORAGE_KEY_TOKEN) || "" : "";
      const userData: SavedUser = {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
      };
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(userData));

      if (onAuthSuccess) {
        onAuthSuccess(user, token);
      }
    } else if (!isSigningIn) {
      // If Firebase explicitly confirms no user and no saved session, clear
      const hasStoredSession = localStorage.getItem(STORAGE_KEY_USER);
      if (!hasStoredSession) {
        if (onAuthFailure) onAuthFailure();
      }
    }
  });
};

export const signInWithGoogle = async (): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  if (!auth) {
    throw new Error("Firebase är inte konfigurerat. Vänligen ange din Firebase API-nyckel.");
  }
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Kunde inte hämta åtkomsttoken från Google-inloggningen");
    }

    cachedAccessToken = credential.accessToken;
    tokenStore()?.setItem(STORAGE_KEY_TOKEN, credential.accessToken);
    tokenStore()?.setItem(STORAGE_KEY_TOKEN_TIME, Date.now().toString());

    const userData: SavedUser = {
      uid: result.user.uid,
      displayName: result.user.displayName,
      email: result.user.email,
      photoURL: result.user.photoURL,
    };
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(userData));

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error("Inloggningsfel:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (cachedAccessToken && isTokenFresh()) {
    return cachedAccessToken;
  }

  const stored = tokenStore()?.getItem(STORAGE_KEY_TOKEN);
  if (stored && isTokenFresh()) {
    cachedAccessToken = stored;
    return cachedAccessToken;
  }

  // Token is missing or expired beyond maximum retention window
  clearAccessToken();
  return null;
};

export const getCurrentUser = (): User | SavedUser | null => {
  if (auth?.currentUser) return auth.currentUser;
  return getSavedUser();
};

export const logoutGoogle = async (): Promise<void> => {
  if (auth) {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn("Fel vid utloggning från Firebase:", err);
    }
  }
  clearAccessToken();
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY_USER);
  }
};
