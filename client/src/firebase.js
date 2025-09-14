import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET
};

let app;
try {
  app = initializeApp(firebaseConfig);
  console.log("Firebase initialized successfully", app.name);

} catch (error) {
  console.error("Firebase initialization error", error);
}
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
