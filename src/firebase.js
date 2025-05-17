// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAEWJzvg-K0iEuoVMuOlnqTeAP9Wsa2hzw",
  authDomain: "car-tire-inventory.firebaseapp.com",
  projectId: "car-tire-inventory",
  storageBucket: "car-tire-inventory.firebasestorage.app",
  messagingSenderId: "358215117671",
  appId: "1:358215117671:web:df5e28b73f3c7c84e85dc2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };