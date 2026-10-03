import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as fbSignOut,
  updateProfile,
  User
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export interface AppUser {
  uid: string;
  username: string;
  email: string;
  displayName: string;
  role: 'admin' | 'dispatcher' | 'operator';
  createdAt: string;
  isLocalOnly?: boolean;
}

const LOCAL_USERS_KEY = 'logitrack_secure_users_v1';
const CURRENT_SESSION_KEY = 'logitrack_current_session_v1';

/**
 * Hash password securely using standard Web Crypto API (SHA-256)
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + '_logitrack_salt_2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

interface StoredLocalUser {
  uid: string;
  username: string;
  email: string;
  displayName: string;
  passwordHash: string;
  role: 'admin' | 'dispatcher' | 'operator';
  createdAt: string;
}

function getStoredUsers(): StoredLocalUser[] {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredUsers(users: StoredLocalUser[]): void {
  try {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Failed to save local users', e);
  }
}

export function getCurrentLocalSession(): AppUser | null {
  try {
    const raw = localStorage.getItem(CURRENT_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCurrentLocalSession(user: AppUser | null): void {
  try {
    if (user) {
      localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_SESSION_KEY);
    }
  } catch (e) {
    console.error('Failed to update session', e);
  }
}

/**
 * Register a new user with username and password.
 * Securely stores credentials and integrates with Firebase Auth + Firestore.
 */
export async function registerUser(params: {
  username: string;
  password: string;
  displayName?: string;
  email?: string;
  role?: 'admin' | 'dispatcher' | 'operator';
}): Promise<AppUser> {
  const cleanUsername = params.username.trim().toLowerCase();
  if (!cleanUsername || cleanUsername.length < 3) {
    throw new Error('Username must be at least 3 characters long.');
  }
  if (!params.password || params.password.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }

  // Check if username already exists locally
  const existingLocal = getStoredUsers();
  if (existingLocal.some((u) => u.username === cleanUsername)) {
    throw new Error(`Username "${cleanUsername}" is already taken. Please choose another.`);
  }

  const emailToUse = params.email?.trim() || `${cleanUsername}@logitrack.app`;
  const displayNameToUse = params.displayName?.trim() || params.username.trim();
  const passwordHash = await hashPassword(params.password);

  let uid = 'usr_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
  let isLocalOnly = false;

  // Try creating in Firebase Auth
  try {
    const cred = await createUserWithEmailAndPassword(auth, emailToUse, params.password);
    uid = cred.user.uid;
    if (cred.user) {
      await updateProfile(cred.user, { displayName: displayNameToUse });
    }

    // Save profile to Firestore
    try {
      await setDoc(doc(db, 'users', uid), {
        username: cleanUsername,
        email: emailToUse,
        displayName: displayNameToUse,
        role: params.role || 'dispatcher',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ownerId: uid,
      });
    } catch (fsErr) {
      console.warn('Could not save profile to firestore users doc:', fsErr);
    }
  } catch (fbErr: any) {
    console.warn('Firebase email auth notice:', fbErr?.code || fbErr?.message);
    // If Firebase email/password is not enabled in Firebase console, fallback to secure local credentials
    isLocalOnly = true;
  }

  const appUser: AppUser = {
    uid,
    username: cleanUsername,
    email: emailToUse,
    displayName: displayNameToUse,
    role: params.role || 'dispatcher',
    createdAt: new Date().toISOString(),
    isLocalOnly,
  };

  // Securely persist to local registry with SHA-256 hash
  existingLocal.push({
    uid,
    username: cleanUsername,
    email: emailToUse,
    displayName: displayNameToUse,
    passwordHash,
    role: params.role || 'dispatcher',
    createdAt: new Date().toISOString(),
  });
  saveStoredUsers(existingLocal);
  setCurrentLocalSession(appUser);

  return appUser;
}

/**
 * Log in with username or email and password.
 */
export async function loginUser(params: {
  usernameOrEmail: string;
  password: string;
}): Promise<AppUser> {
  const identifier = params.usernameOrEmail.trim().toLowerCase();
  if (!identifier || !params.password) {
    throw new Error('Please enter username/email and password.');
  }

  const emailToUse = identifier.includes('@') ? identifier : `${identifier}@logitrack.app`;
  const passwordHash = await hashPassword(params.password);

  // First, check local secure database
  const localUsers = getStoredUsers();
  const localMatch = localUsers.find(
    (u) =>
      (u.username === identifier || u.email === identifier || u.email === emailToUse) &&
      u.passwordHash === passwordHash
  );

  // Also try Firebase Auth
  try {
    const cred = await signInWithEmailAndPassword(auth, emailToUse, params.password);
    const uid = cred.user.uid;
    const appUser: AppUser = {
      uid,
      username: localMatch?.username || cred.user.displayName || identifier.split('@')[0],
      email: cred.user.email || emailToUse,
      displayName: cred.user.displayName || localMatch?.displayName || identifier,
      role: localMatch?.role || 'dispatcher',
      createdAt: localMatch?.createdAt || new Date().toISOString(),
      isLocalOnly: false,
    };
    setCurrentLocalSession(appUser);
    return appUser;
  } catch (fbErr: any) {
    // If local match exists, allow login
    if (localMatch) {
      const appUser: AppUser = {
        uid: localMatch.uid,
        username: localMatch.username,
        email: localMatch.email,
        displayName: localMatch.displayName,
        role: localMatch.role,
        createdAt: localMatch.createdAt,
        isLocalOnly: true,
      };
      setCurrentLocalSession(appUser);
      return appUser;
    }

    if (fbErr?.code === 'auth/wrong-password' || fbErr?.code === 'auth/user-not-found' || fbErr?.code === 'auth/invalid-credential') {
      throw new Error('Invalid username/email or password.');
    }
    throw new Error(fbErr?.message || 'Authentication failed. Please verify credentials.');
  }
}

/**
 * Seed a default demo user if registry is empty
 */
export async function seedDemoUserIfNeeded(): Promise<void> {
  const users = getStoredUsers();
  if (users.length === 0) {
    const defaultHash = await hashPassword('Demo@12345');
    users.push({
      uid: 'demo_user_001',
      username: 'demo_user',
      email: 'demo@logitrack.app',
      displayName: 'LogiTrack Demo Manager',
      passwordHash: defaultHash,
      role: 'admin',
      createdAt: new Date().toISOString(),
    });
    saveStoredUsers(users);
  }
}

/**
 * Sign out current user
 */
export async function logoutUser(): Promise<void> {
  try {
    await fbSignOut(auth);
  } catch {
    // Ignore
  }
  setCurrentLocalSession(null);
}
