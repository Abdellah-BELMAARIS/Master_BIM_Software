import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  deleteDoc,
  updateDoc,
  type CollectionReference,
  type DocumentData,
  type UpdateData,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const missingConfig = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => `VITE_FIREBASE_${key.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase()}`);

if (missingConfig.length) {
  throw new Error(`Firebase configuration is missing: ${missingConfig.join(", ")}`);
}

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const database = db;

export function getCollection<T = DocumentData>(path: string): CollectionReference<T> {
  return collection(db, path) as CollectionReference<T>;
}

export async function deleteDocument(path: string, id: string): Promise<void> {
  await deleteDoc(doc(db, path, id));
}

const sanitizeValue = (value: unknown): unknown => {
  if (value === null || typeof value !== "object" || value instanceof Date) return value;
  if (Array.isArray(value)) return value.map(sanitizeValue);

  const clean: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    if (nestedValue !== undefined) clean[key] = sanitizeValue(nestedValue);
  }
  return clean;
};

export function sanitizeForFirestore<T extends Record<string, any>>(obj: T): T {
  return sanitizeValue(obj) as T;
}

export async function updateDocument<T extends Record<string, any>>(
  path: string,
  id: string,
  data: Partial<T>,
): Promise<void> {
  await updateDoc(doc(db, path, id), sanitizeForFirestore(data) as UpdateData<T>);
}
