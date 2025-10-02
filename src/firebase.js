// firebase.js


import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";


const firebaseConfig = {
  apiKey: "AIzaSyDUqMSyMk6sD9qWaK9xaZrG-uL2A4kImQA",
  authDomain: "divine-36910.firebaseapp.com",
  projectId: "divine-36910",
  storageBucket: "divine-36910.firebasestorage.app",
  messagingSenderId: "122149630256",
  appId: "1:122149630256:web:1e1bf01ba67f57d2ba98f5",
  measurementId: "G-7BRRRQKLB0"
};


const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const storage = getStorage(app);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, analytics, storage, auth, db };