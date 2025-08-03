// js/script.js

// استيراد db و serverTimestamp من firebase-config.js للتعامل مع Firestore
import { db, serverTimestamp } from './firebase-config.js'; // **تعديل: تم إضافة serverTimestamp هنا**

document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------
    // إضافة منطق التحقق من تسجيل الدخول التلقائي هنا
    // ----------------------------------------------------
    const storedUsername = localStorage.getItem('chatUserName');
    const storedUserId = localStorage.getItem('chatUserId');
    const storedUserAvatar = localStorage.getItem('chatUserAvatar');
    const storedUserRank = localStorage.getItem('chatUserRank'); // **مهم: جلب رتبة المستخدم المخزنة أيضاً**

    if (storedUsername && storedUserId && storedUserAvatar && storedUserRank) { // التحقق من وجود الاسم والمعرف والصورة والرتبة
        console.log(`مستخدم مسجل مسبقًا (${storedUsername}, ID: ${storedUserId}, Avatar: ${storedUserAvatar}, Rank: ${storedUserRank})، جاري التوجيه إلى الدردشة...`);
        window.location.href = 'rooms.html';
        return;
    }
    
    // ----------------------------------------------------
    // 1. جلب العناصر الأساسية (المودالات، الأزرار، النماذج، رسائل التنبيه)
    // ----------------------------------------------------

    // المودالات
    const visitorModal = document.getElementById('visitorModal');
    const registerModal = document.getElementById('registerModal');
    const memberModal = document.getElementById('memberModal');

    // أزرار فتح المودالات
    const openVisitorModalBtn = document.getElementById('openVisitorModal');
    const openRegisterModalBtn = document.getElementById('openRegisterModal');
    const openMemberModalBtn = document.getElementById('openMemberModal');

    // أزرار إغلاق المودالات
    const closeVisitorModalBtn = document.querySelector('.visitor-close-button');
    const closeRegisterModalBtn = document.querySelector('.register-close-button');
    const closeMemberModalBtn = document.querySelector('.member-close-button');

    // النماذج
    const visitorForm = document.getElementById('visitorForm');
    const registerForm = document.getElementById('registerForm');
    const memberForm = document.getElementById('memberForm');

    // عنصر رسالة التنبيه
    const alertMessageDiv = document.getElementById('alertMessage');

    // روابط الصور الافتراضية
    const DEFAULT_USER_AVATAR = 'images/default-user.png';
    const DEFAULT_VISITOR_AVATAR = 'images/default-visitor.png';

    // ----------------------------------------------------
    // إضافة منطق ملء قوائم العمر المنسدلة هنا
    // ----------------------------------------------------
    function populateAgeDropdown(selectElementId, minAge, maxAge) {
        const selectElement = document.getElementById(selectElementId);
        if (selectElement) {
            if (!selectElement.querySelector('option[value=""]')) {
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = 'اختر عمرك';
                selectElement.appendChild(defaultOption);
            }

            for (let i = minAge; i <= maxAge; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = i;
                selectElement.appendChild(option);
            }
        }
    }

    // استدعاء الدالة لملء قوائم العمر عند تحميل الصفحة
    populateAgeDropdown('visitorAge', 15, 99);
    populateAgeDropdown('registerAge', 15, 99);

    // ----------------------------------------------------
    // 2. دوال مساعدة لفتح وإغلاق المودالات
    // ----------------------------------------------------

    function openModal(modal) {
        modal.style.display = 'flex';
    }

    function closeModal(modal) {
        modal.style.display = 'none';
        if (modal === visitorModal) {
            visitorForm.reset();
        } else if (modal === registerModal) {
            registerForm.reset();
        } else if (modal === memberModal) {
            memberForm.reset();
        }
    }

    // ----------------------------------------------------
    // 3. دالة لعرض رسائل التنبيه
    // ----------------------------------------------------

    function showMessage(message, type = 'info', duration = 3000) {
        alertMessageDiv.textContent = message;
        alertMessageDiv.className = 'alert-message show';
        alertMessageDiv.classList.add(type);

        setTimeout(() => {
            alertMessageDiv.classList.remove('show');
            setTimeout(() => {
                alertMessageDiv.className = 'alert-message';
            }, 500);
        }, duration);
    }

    // ----------------------------------------------------
    // 4. إضافة مستمعي الأحداث لأزرار فتح وإغلاق المودالات
    // ----------------------------------------------------

    // فتح المودالات
    openVisitorModalBtn.addEventListener('click', () => openModal(visitorModal));
    openRegisterModalBtn.addEventListener('click', () => openModal(registerModal));
    openMemberModalBtn.addEventListener('click', () => openModal(memberModal));

    // إغلاق المودالات
    closeVisitorModalBtn.addEventListener('click', () => closeModal(visitorModal));
    closeRegisterModalBtn.addEventListener('click', () => closeModal(registerModal));
    closeMemberModalBtn.addEventListener('click', () => closeModal(memberModal));

    // ----------------------------------------------------
    // 5. معالجة إرسال النماذج (مع ربط Firestore وإعادة التوجيه)
    // ----------------------------------------------------

    // دالة مساعدة للتحقق من وجود اسم المستخدم في كلتا المجموعتين
    async function isUsernameTaken(username) {
        const visitorsRef = db.collection('visitors');
        const usersRef = db.collection('users');

        // التحقق في مجموعة الزوار
        const visitorSnapshot = await visitorsRef.where('name', '==', username).limit(1).get();
        if (!visitorSnapshot.empty) {
            return true;
        }

        // التحقق في مجموعة المستخدمين المسجلين
        const userSnapshot = await usersRef.where('username', '==', username).limit(1).get();
        if (!userSnapshot.empty) {
            return true;
        }

        return false;
    }

  visitorForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const visitorName = document.getElementById('visitorName').value.trim();
        const visitorAge = document.getElementById('visitorAge').value;
        const visitorGender = document.getElementById('visitorGender').value;
        const userRank = 'زائر'; // **تعيين رتبة "زائر" للزوار**

        if (visitorName === '' || visitorAge === '' || visitorGender === '') {
            showMessage('يرجى ملء جميع الحقول لدخول الزوار.', 'error');
            return;
        }

        try {
            if (await isUsernameTaken(visitorName)) {
                showMessage('اسم المستخدم هذا مستخدم بالفعل (كزائر أو عضو). يرجى اختيار اسم آخر.', 'error');
                return;
            }

            // إضافة بيانات الزائر إلى مجموعة 'visitors' في Firestore
            const docRef = await db.collection('visitors').add({
                name: visitorName,
                age: visitorAge,
                gender: visitorGender,
                timestamp: serverTimestamp(),
                userType: 'visitor',
                avatar: DEFAULT_VISITOR_AVATAR,
                rank: userRank // **حفظ الرتبة في Firestore**
            });

            // حفظ البيانات في localStorage
            localStorage.setItem('chatUserName', visitorName);
            localStorage.setItem('userType', 'visitor');
            localStorage.setItem('chatUserId', docRef.id);
            localStorage.setItem('chatUserAvatar', DEFAULT_VISITOR_AVATAR);
            localStorage.setItem('chatUserRank', userRank); // **حفظ الرتبة في localStorage**


            showMessage('تم الدخول كزائر بنجاح! جاري التوجيه...', 'success');

            setTimeout(() => {
                window.location.href = 'rooms.html';
            }, 2000);
        } catch (error) {
            console.error("خطأ في تسجيل الزائر:", error);
            showMessage('حدث خطأ أثناء تسجيل الزائر. يرجى المحاولة مرة أخرى.', 'error');
        }
    });
    
    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const registerName = document.getElementById('registerName').value.trim();
        const registerPassword = document.getElementById('registerPassword').value.trim();
        const registerAge = document.getElementById('registerAge').value;
        const registerGender = document.getElementById('registerGender').value;
        const userRank = 'عضو'; // **تعيين رتبة "عضو" للمستخدمين المسجلين**


        if (registerName === '' || registerPassword === '' || registerAge === '' || registerGender === '') {
            showMessage('يرجى ملء جميع الحقول لتسجيل حساب جديد.', 'error');
            return;
        }

        try {
            if (await isUsernameTaken(registerName)) {
                showMessage('اسم المستخدم هذا مستخدم بالفعل (كزائر أو عضو). يرجى اختيار اسم آخر.', 'error');
                return;
            }

            // إضافة بيانات المستخدم إلى// ... (بقية الكود) ...
            const docRef = await db.collection('users').add({
                username: registerName,
                password: registerPassword,
                age: registerAge,
                gender: registerGender,
                timestamp: serverTimestamp(),
                userType: 'registered',
                avatar: DEFAULT_USER_AVATAR,
                rank: userRank,
                // **هنا يتم إضافة حقول المستوى الجديدة:**
                level: 1,
                totalExp: 0,
                currentExp: 0,
                expToNextLevel: 200
            });

            // حفظ البيانات في localStorage
            localStorage.setItem('chatUserName', registerName);
            localStorage.setItem('userType', 'registered');
            localStorage.setItem('chatUserId', docRef.id);
            localStorage.setItem('chatUserAvatar', DEFAULT_USER_AVATAR);
            localStorage.setItem('chatUserRank', userRank); // **حفظ الرتبة في localStorage**

            showMessage('تم تسجيل حسابك بنجاح! جاري التوجيه...', 'success');

            setTimeout(() => {
                window.location.href = 'rooms.html';
            }, 2000);
        } catch (error) {
            console.error("خطأ في تسجيل المستخدم:", error);
            showMessage('حدث خطأ أثناء تسجيل حسابك. يرجى المحاولة مرة أخرى.', 'error');
        }
    });
    
    memberForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const memberName = document.getElementById('memberName').value.trim();
        const memberPassword = document.getElementById('memberPassword').value.trim();

        if (memberName === '' || memberPassword === '') {
            showMessage('يرجى إدخال اسم المستخدم وكلمة المرور.', 'error');
            return;
        }

        try {
            const usersRef = db.collection('users');
            const snapshot = await usersRef.where('username', '==', memberName).limit(1).get();

            if (snapshot.empty) {
                showMessage('اسم المستخدم أو كلمة المرور غير صحيحة.', 'error');
            } else {
                const userData = snapshot.docs[0].data();
                if (userData.password === memberPassword) {
                    const userAvatar = userData.avatar || DEFAULT_USER_AVATAR;
                    const userRank = userData.rank || 'عضو'; // **جلب الرتبة من Firestore أو "عضو" كافتراضي**

                    // حفظ البيانات في localStorage
                    localStorage.setItem('chatUserName', memberName);
                    localStorage.setItem('userType', 'registered');
                    localStorage.setItem('chatUserId', snapshot.docs[0].id);
                    localStorage.setItem('chatUserAvatar', userAvatar);
                    localStorage.setItem('chatUserRank', userRank); // **حفظ الرتبة في localStorage**

                    showMessage('تم تسجيل الدخول بنجاح! جاري التوجيه...', 'success');
                    setTimeout(() => {
                        window.location.href = 'rooms.html';
                    }, 2000);
                } else {
                    showMessage('اسم المستخدم أو كلمة المرور غير صحيحة.', 'error');
                }
            }
        } catch (error) {
            console.error("خطأ في تسجيل الدخول:", error);
            showMessage('حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.', 'error');
        }
    });
    

    // ----------------------------------------------------
    // 6. تفعيل زر "اتصل بنا" (اختياري)
    // ----------------------------------------------------

    const contactButton = document.querySelector('.contact-button');
    if (contactButton) {
        contactButton.addEventListener('click', () => {
            showMessage('خدمة "اتصل بنا" قيد التطوير!', 'info');
        });
    }
});