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

// تعريف db و serverTimestamp بدون استخدام 'export'
const db = firebase.firestore();
const serverTimestamp = firebase.firestore.FieldValue.serverTimestamp;

// ----------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    const roomListContainer = document.getElementById('room-list');

// دالة لإنشاء عنصر غرفة HTML
function createRoomElement(roomData) {
    const roomItem = document.createElement('div');
    roomItem.className = 'room-item';
    
    // تحديد ما إذا كانت هناك صورة للغرفة
    const imageUrl = roomData.imageUrl || 'https://via.placeholder.com/400x200.png?text=Room+Image'; // صورة بديلة في حال عدم وجود صورة
    
    // إضافة الصورة وهيكلة جديدة
    roomItem.innerHTML = `
        <div class="room-image-container">
            <img src="${imageUrl}" alt="صورة الغرفة">
        </div>
        <div class="room-info">
            <h3>${roomData.name}</h3>
            <p>${roomData.description}</p>
        </div>
        <a href="chat.html?roomId=${roomData.id}" class="join-room-btn">ادخل</a>
    `;
    return roomItem;
}

    // جلب الغرف من Firestore
    db.collection('rooms').orderBy('timestamp', 'asc').get()
        .then(snapshot => {
            roomListContainer.innerHTML = '';
            
            if (snapshot.empty) {
                roomListContainer.innerHTML = `
                    <div style="text-align: center; padding: 20px; color: #888;">
                        لا توجد غرف متاحة حالياً.
                    </div>
                `;
                return;
            }

            snapshot.forEach(doc => {
                const roomData = { id: doc.id, ...doc.data() };
                const roomElement = createRoomElement(roomData);
                roomListContainer.appendChild(roomElement);
            });
        })
        .catch(error => {
            console.error("خطأ في جلب الغرف:", error);
            roomListContainer.innerHTML = `
                <div style="text-align: center; padding: 20px; color: red;">
                    حدث خطأ أثناء تحميل الغرف. يرجى المحاولة مرة أخرى.
                </div>
            `;
        });
});
