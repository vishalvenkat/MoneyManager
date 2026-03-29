import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDiTwGO9Qvuxng_SOihBr1zmYjV37MIn_w",
  authDomain: "money-manager-8eb72.firebaseapp.com",
  projectId: "money-manager-8eb72",
  storageBucket: "money-manager-8eb72.firebasestorage.app",
  messagingSenderId: "47962228877",
  appId: "1:47962228877:web:215edb2c2f9cd937b8bac4",
  measurementId: "G-9DF8X3ZQST"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
