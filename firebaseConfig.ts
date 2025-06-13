// firebaseConfig.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyDZRz4gJubQToe0kSjdpps50iIJ26vI1Bo",
    authDomain: "arc-app-b1d51.firebaseapp.com",
    projectId: "arc-app-b1d51",
    storageBucket: "arc-app-b1d51.firebasestorage.app",
    messagingSenderId: "578575517341",
    appId: "1:578575517341:web:46eeba646f15dec867b674",
    measurementId: "G-8992N7EMLT"
  };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
