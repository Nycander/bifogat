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

// Load token from localStorage initially so sessions survive page refreshes
let cachedAccessToken: string | null =
  typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY_TOKEN) : null;

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
// Prompt select_account if explicitly asked, but preserve consent
provider.setCustomParameters({
  prompt: "select_account",
  access_type: "offline",
});

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
 * Check if the stored OAuth token is likely still valid (issued within last 55 minutes)
 */
export const isTokenFresh = (): boolean => {
  if (typeof window === "undefined") return false;
  const timeStr = localStorage.getItem(STORAGE_KEY_TOKEN_TIME);
  if (!timeStr) return false;
  const elapsed = Date.now() - parseInt(timeStr, 10);
  // Tokens typically expire after 3600 seconds (60 mins)
  return elapsed < 55 * 60 * 1000;
};

export const initAuth = (
  onAuthSuccess?: (user: User | SavedUser, token: string) => void,
  onAuthFailure?: () => void,
) => {
  // 1. Instant hydration from localStorage so UI does not flicker or reset
  const savedUser = getSavedUser();
  const savedToken = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY_TOKEN) : null;
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
      const token = cachedAccessToken || localStorage.getItem(STORAGE_KEY_TOKEN) || "";
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
    localStorage.setItem(STORAGE_KEY_TOKEN, credential.accessToken);
    localStorage.setItem(STORAGE_KEY_TOKEN_TIME, Date.now().toString());

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
  if (cachedAccessToken) return cachedAccessToken;
  if (typeof window !== "undefined") {
    cachedAccessToken = localStorage.getItem(STORAGE_KEY_TOKEN);
  }
  return cachedAccessToken;
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
  cachedAccessToken = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_TOKEN_TIME);
    localStorage.removeItem(STORAGE_KEY_USER);
  }
};
