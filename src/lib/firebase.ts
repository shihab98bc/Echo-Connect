// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBF_SP2Ous-JZrEKWoWpS_ZG4l8wawO3jE",
  authDomain: "echo-connect-4486f.firebaseapp.com",
  projectId: "echo-connect-4486f",
  storageBucket: "echo-connect-4486f.firebasestorage.app",
  messagingSenderId: "794481182546",
  appId: "1:794481182546:web:cb1a43803e2678cf62dc8b",
  measurementId: "G-MNQTTBMSB1"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
