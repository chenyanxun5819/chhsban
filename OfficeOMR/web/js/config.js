/**
 * Firebase 配置
 * 从 Firebase Console 获取这些值
 */

const firebaseConfig = {
  apiKey: "AIzaSyCmppoQXk7osjxv-p700JCBLniGRrxOYV0",
  authDomain: "officeomr-fe542.firebaseapp.com",
  projectId: "officeomr-fe542",
  storageBucket: "officeomr-fe542.firebasestorage.app",
  messagingSenderId: "601814582794",
  appId: "1:601814582794:web:9de9f7f427b8b3406bc1f3",
};

// Cloud Functions URL（北美地区）
const CLOUD_FUNCTION_URL =
  "https://us-central1-officeomr-fe542.cloudfunctions.net";

// Cloud Firestore 设置
const FIRESTORE_CONFIG = {
  projectId: "officeomr-fe542",
};

console.log("✅ Firebase config loaded");
