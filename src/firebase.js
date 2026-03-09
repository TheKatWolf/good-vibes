import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAZ-eR7mlCspZ5Q25BG4NsQJ1qH7tFLuK4",
  authDomain: "montgomery-transparency-gap.firebaseapp.com",
  projectId: "montgomery-transparency-gap",
  storageBucket: "montgomery-transparency-gap.firebasestorage.app",
  messagingSenderId: "1064130197829",
  appId: "1:1064130197829:web:4aefb354b1c56d4b8f662c"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
