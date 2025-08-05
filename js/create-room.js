import { uploadImageToCloudinary } from './cloudinary-utils.js';

// بيانات مشروع Firebase الخاص بك
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
const db = firebase.firestore();
const serverTimestamp = firebase.firestore.FieldValue.serverTimestamp;

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('create-room-form');
    const statusMessage = document.getElementById('status-message');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const roomName = document.getElementById('room-name').value;
        const roomDescription = document.getElementById('room-description').value;
        const roomImageFile = document.getElementById('room-image').files[0];

        if (!roomImageFile) {
            statusMessage.textContent = 'الرجاء اختيار صورة للغرفة.';
            statusMessage.style.color = 'red';
            return;
        }

        statusMessage.textContent = 'جاري رفع الصورة...';
        statusMessage.style.color = 'blue';

        try {
            // الخطوة 1: رفع الصورة إلى Cloudinary
            const imageUrl = await uploadImageToCloudinary(roomImageFile);

            if (!imageUrl) {
                throw new Error('فشل رفع الصورة.');
            }

            // الخطوة 2: حفظ بيانات الغرفة ورابط الصورة في Firestore
            await db.collection('rooms').add({
                name: roomName,
                description: roomDescription,
                imageUrl: imageUrl, // هنا يتم حفظ رابط الصورة
                timestamp: serverTimestamp()
            });

            statusMessage.textContent = 'تم إنشاء الغرفة بنجاح!';
            statusMessage.style.color = 'green';
            form.reset(); // مسح النموذج
            
            // يمكنك توجيه المستخدم إلى صفحة الغرف بعد النجاح
            // window.location.href = 'rooms.html';

        } catch (error) {
            console.error("خطأ في إنشاء الغرفة:", error);
            statusMessage.textContent = `فشل إنشاء الغرفة: ${error.message}`;
            statusMessage.style.color = 'red';
        }
    });
});
