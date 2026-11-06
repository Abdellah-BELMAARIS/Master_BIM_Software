import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

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
