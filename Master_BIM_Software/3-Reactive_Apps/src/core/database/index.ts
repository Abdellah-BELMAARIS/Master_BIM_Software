import { initializeApp } from "firebase/app";
import {
    getFirestore,
    collection,
    doc,
    deleteDoc,
    updateDoc,
    CollectionReference,
    DocumentData,
    UpdateData,
} from "firebase/firestore";

// Lesson 4.1 & 4.2: Firebase & Cloud Firestore Configuration for 'master-bim-software'
const firebaseConfig = {
    apiKey: "AIzaSyC5OJ_8KnT9dumtqscUQvnUQU4o_sMWX9o",
    authDomain: "master-bim-software.firebaseapp.com",
    projectId: "master-bim-software",
    storageBucket: "master-bim-software.firebasestorage.app",
    messagingSenderId: "848670522223",
    appId: "1:848670522223:web:c597271442cd805f95c69a",
};

// Initialize the Firebase app instance
export const app = initializeApp(firebaseConfig);

// Lesson 4.2: Export Firestore database reference for application-wide data retrieval
export const db = getFirestore(app);
export const database = db;

// Lesson 4.4: Generic Master Function to obtain a typed Firestore Collection Reference (DRY Principle)
export function getCollection<T = DocumentData>(path: string): CollectionReference<T> {
    return collection(db, path) as CollectionReference<T>;
}

// Lesson 4.5: Generic Document Deletion from Cloud Firestore
export async function deleteDocument(path: string, id: string): Promise<void> {
    const docRef = doc(db, path, id);
    await deleteDoc(docRef);
}

// Helper to remove any undefined properties recursively (Firestore throws if undefined is passed)
export function sanitizeForFirestore<T extends Record<string, any>>(obj: T): T {
    if (obj === null || typeof obj !== "object") {
        return obj;
    }
    if (obj instanceof Date) {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map((item) => sanitizeForFirestore(item)) as any;
    }
    const clean: any = {};
    for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (val !== undefined) {
            clean[key] = (val !== null && typeof val === "object" && !(val instanceof Date))
                ? sanitizeForFirestore(val)
                : val;
        }
    }
    return clean;
}

// Lesson 4.5: Generic Partial Document Update with Record & Partial<T>
export async function updateDocument<T extends Record<string, any>>(
    path: string,
    id: string,
    data: Partial<T>
): Promise<void> {
    const docRef = doc(db, path, id);
    const sanitizedData = sanitizeForFirestore(data);
    await updateDoc(docRef, sanitizedData as UpdateData<T>);
}
