import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBExGhJuz3_sQjthSQMDWGOhOe3kGRtVwg",
  authDomain: "lakata-work.firebaseapp.com",
  databaseURL: "https://lakata-work-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "lakata-work",
  storageBucket: "lakata-work.firebasestorage.app",
  messagingSenderId: "1082797968965",
  appId: "1:1082797968965:web:00d73dd94a42d3edc71d2c",
  measurementId: "G-M70QEP2BMW"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, db, storage, doc, getDoc };