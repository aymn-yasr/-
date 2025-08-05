// js/firebase-config.js

// **الصق كائن firebaseConfig الذي نسخته من Firebase Console هنا**
// تأكد من تحديث هذه القيم بمعلومات مشروعك الفعلية من Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAEpHcagYEggX6GyhJZvUPWQFxhpo1mWNA",
  authDomain: "arab-myths-chat.firebaseapp.com",
  projectId: "arab-myths-chat",
  storageBucket: "arab-myths-chat.firebasestorage.app",
  messagingSenderId: "1099257466472",
  appId: "1:1099257466472:web:4ce69d2001143ce121f5dd"
};

// تهيئة Firebase
firebase.initializeApp(firebaseConfig);

// تصدير مرجع Firestore لاستخدامه في ملفات أخرى
export const db = firebase.firestore();
export const serverTimestamp = firebase.firestore.FieldValue.serverTimestamp;