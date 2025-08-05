// js/modals.js

// استيراد الثوابت من constants.js
import { RANK_IMAGE_MAP } from './constants.js';
// استيراد دالة الرفع من Cloudinary
import { uploadImageToCloudinary } from './cloudinary-utils.js';
// استيراد دالة تحديث بيانات المستخدم من chat-firestore.js
import { updateUserData } from './chat-firestore.js';

// **ملاحظة مهمة: نحتاج لـ firebase للوصول إلى firebase.firestore.FieldValue.delete()**
// بما أننا نستخدم Namespace API (الإصدار 8)
// تأكد أنك تقوم باستيراد firebase-app.js و firebase-firestore.js في HTML
// هذا يسمح لنا بالوصول إلى `firebase` ككائن عام.
// لا تحتاج إلى استيرادها هنا كـ module، ولكن يجب أن تكون متاحة عالمياً.

// -------------------------------------------------------------------
// منطق مودال تعديل الملف الشخصي (Edit Profile Modal)
// -------------------------------------------------------------------

// المتغيرات العالمية لمودال تعديل الملف
// **مهم: ربط المتغيرات بـ window لضمان الوصول إليها من main.js**
window.editProfileModal = null;
window.editProfileCloseButton = null;

// دالة لإنشاء هيكل HTML لمودال تعديل الملف وإضافته إلى DOM
function createEditProfileModalHTML() {
    const modalHTML = `
        <div id="editProfileModal" class="modal-overlay">
            <div class="edit-profile-container">
                <div class="header-section-new">
                    <img id="profile-modal-inner-image" src="images/Interior.png" alt="صورة خلفية المستخدم" class="inner-profile-background-image">

                    <input type="file" id="innerImageUploadInput" accept="image/*" style="display: none;">
                    <input type="file" id="avatarUploadInput" accept="image/*" style="display: none;">

                    <div class="header-left-actions">
                        <span class="header-icon close-profile-modal"><i class="fas fa-times"></i></span>
                        <span class="header-icon change-inner-image"><i class="fas fa-camera"></i></span>
                        <span class="header-icon delete-inner-image"><i class="fas fa-trash-alt"></i></span>
                    </div>
                    <div class="header-right-profile">
                        <div class="user-main-section-wrapper">
                            <div class="likes-and-level">
                                <div class="likes"><span>14</span> <span class="like-icon"><i class="fas fa-thumbs-up"></i></span></div>
                                <div class="level"><span>3</span> <span class="level-icon"><i class="fas fa-star"></i></span></div>
                            </div>
                            <div class="user-main-info">
                                <div class="user-avatar-wrapper">
                                    <img id="profile-modal-avatar" src="https://via.placeholder.com/150/000000/FFFFFF?text=User" alt="صورة المستخدم" />
                                    <div class="avatar-overlay-buttons">
                                        <span class="camera-overlay"><i class="fas fa-camera"></i></span>
                                        <span class="trash-overlay"><i class="fas fa-trash-alt"></i></span>
                                    </div>
                                </div>
                                <div class="user-info-section">
                                    <div class="rank-info">
                                        <img id="profile-modal-rank-image" src="" alt="Rank Image" class="rank-image">
                                        <p class="user-rank" id="profile-modal-user-rank"></p>
                                    </div>
                                    <p class="user-name-display" id="profile-modal-username-display"></p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="tabs-container">
                    <button class="tab-button active" data-tab="account">حساب</button>
                    <button class="tab-button" data-tab="gifts">الهدايا</button>
                    <button class="tab-button" data-tab="more">المزيد</button>
                </div>

                <div class="tab-content" id="account-tab-content">
                    <ul class="profile-options-list">
                        <li>
                            <button class="option-btn">
                                <span class="option-icon"><i class="fas fa-user-edit"></i></span>
                                <span class="option-text">تعديل بياناتك</span>
                            </button>
                        </li>
                        <li>
                            <button class="option-btn">
                                <span class="option-icon"><i class="fas fa-info-circle"></i></span>
                                <span class="option-text">تعديل المعلومات</span>
                            </button>
                        </li>
                        <li>
                            <button class="option-btn">
                                <span class="option-icon"><i class="fas fa-heart"></i></span>
                                <span class="option-text">تعديل الحالة</span>
                            </button>
                        </li>
                        <li>
                            <button class="option-btn">
                                <span class="option-icon"><i class="fas fa-palette"></i></span>
                                <span class="option-text">تغيير لون او خط الاسم</span>
                            </button>
                        </li>
                        <li>
                            <button class="option-btn">
                                <span class="option-icon"><i class="fas fa-font"></i></span>
                                <span class="option-text">تغيير لون او خط الرسالة</span>
                            </button>
                        </li>
                        <li>
                            <button class="option-btn">
                                <span class="option-icon"><i class="fas fa-volume-up"></i></span>
                                <span class="option-text">اعدادات الأصوات</span>
                            </button>
                        </li>
                    </ul>
                </div>

                <div class="tab-content" id="gifts-tab-content" style="display: none;">
                    <p style="color: #333; text-align: center; padding: 20px;">لا توجد هدايا لعرضها حاليًا.</p>
                </div>

                <div class="tab-content" id="more-tab-content" style="display: none;">
                    <ul class="profile-options-list">
                        <li>
                            <button class="option-btn">
                                <span class="option-icon"><i class="fas fa-user-friends"></i></span>
                                <span class="option-text">تعديل قائمة الأصدقاء</span>
                            </button>
                        </li>
                        <li>
                            <button class="option-btn">
                                <span class="option-icon"><i class="fas fa-ban"></i></span>
                                <span class="option-text">قائمة المحظورين</span>
                            </button>
                        </li>
                        <li>
                            <button class="option-btn">
                                <span class="option-icon"><i class="fas fa-share-alt"></i></span>
                                <span class="option-text">إعدادات المشاركة</span>
                            </button>
                        </li>
                        <li>
                            <button class="option-btn">
                                <span class="option-icon"><i class="fas fa-shield-alt"></i></span>
                                <span class="option-text">إعدادات الخصوصية</span>
                            </button>
                        </li>
                        <li>
                            <button class="option-btn">
                                <span class="option-icon"><i class="fas fa-globe"></i></span>
                                <span class="option-text">اللغة / الموقع</span>
                            </button>
                        </li>
                        <li>
                            <button class="option-btn">
                                <span class="option-icon"><i class="fas fa-envelope"></i></span>
                                <span class="option-text">تعديل البريد الإلكتروني</span>
                            </button>
                        </li>
                        <li>
                            <button class="option-btn">
                                <span class="option-icon"><i class="fas fa-key"></i></span>
                                <span class="option-text">تغيير رمز حسابك</span>
                            </button>
                        </li>
                        <li>
                            <button class="option-btn">
                                <span class="option-icon"><i class="fas fa-sign-out-alt"></i></span>
                                <span class="option-text">تسجيل الخروج من الحساب</span>
                            </button>
                        </li>
                        <li>
                            <button class="option-btn">
                                <span class="option-icon"><i class="fas fa-trash-alt"></i></span>
                                <span class="option-text">حذف عضوية</span>
                            </button>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    window.editProfileModal = document.getElementById('editProfileModal');
    window.editProfileCloseButton = window.editProfileModal ? window.editProfileModal.querySelector('.header-left-actions .close-profile-modal') : null;

    if (window.editProfileCloseButton) {
        window.editProfileCloseButton.addEventListener('click', window.hideEditProfileModal);
    }

    const innerImageUploadInput = document.getElementById('innerImageUploadInput');
    const avatarUploadInput = document.getElementById('avatarUploadInput');
    
    const changeInnerImageBtn = window.editProfileModal.querySelector('.change-inner-image');
    const deleteInnerImageBtn = window.editProfileModal.querySelector('.delete-inner-image');
    const changeAvatarBtn = window.editProfileModal.querySelector('.avatar-overlay-buttons .camera-overlay');
    const deleteAvatarBtn = window.editProfileModal.querySelector('.avatar-overlay-buttons .trash-overlay');

    if (changeAvatarBtn) {
        changeAvatarBtn.addEventListener('click', () => {
            avatarUploadInput.click();
        });
    }

    if (changeInnerImageBtn) {
        changeInnerImageBtn.addEventListener('click', () => {
            innerImageUploadInput.click();
        });
    }
    
    if (deleteInnerImageBtn) {
        deleteInnerImageBtn.addEventListener('click', async () => {
            if (confirm('هل أنت متأكد أنك تريد حذف الصورة الداخلية؟')) {
                alert('جاري حذف الصورة الداخلية...');
                const currentUserId = localStorage.getItem('chatUserId');
                const defaultInnerImage = 'images/Interior.png';
                if (currentUserId) {
                    try {
                        await updateUserData(currentUserId, { innerImage: defaultInnerImage });
                        const innerImageElement = document.getElementById('profile-modal-inner-image');
                        if (innerImageElement) {
                            innerImageElement.src = defaultInnerImage;
                        }
                        localStorage.setItem('chatUserInnerImage', defaultInnerImage);
                        if (window.allUsersAndVisitorsData && Array.isArray(window.allUsersAndVisitorsData)) {
                            const currentUserIndex = window.allUsersAndVisitorsData.findIndex(user => user.id === currentUserId);
                            if (currentUserIndex !== -1) {
                                window.allUsersAndVisitorsData[currentUserIndex].innerImage = defaultInnerImage;
                                console.log("تم تحديث الصورة الداخلية في window.allUsersAndVisitorsData إلى الافتراضية.");
                            }
                        }
                        console.log("تم تعيين الصورة الداخلية إلى الافتراضية في Firestore بنجاح.");
                    } catch (error) {
                        console.error("خطأ في تعيين الصورة الداخلية الافتراضية:", error);
                        alert("فشل تعيين الصورة الداخلية الافتراضية.");
                    }
                }
            }
        });
    }

    if (deleteAvatarBtn) {
        deleteAvatarBtn.addEventListener('click', async () => {
            if (confirm('هل أنت متأكد أنك تريد حذف صورة البروفايل؟')) {
                alert('جاري حذف صورة البروفايل!');
                const currentUserId = localStorage.getItem('chatUserId');
                const defaultAvatar = 'images/default-user.png';
                if (currentUserId) {
                    try {
                        await updateUserData(currentUserId, { avatar: defaultAvatar });
                        const profileModalAvatar = document.getElementById('profile-modal-avatar');
                        if (profileModalAvatar) profileModalAvatar.src = defaultAvatar;
                        const userProfileImage = document.getElementById('user-profile-image');
                        if (userProfileImage) userProfileImage.src = defaultAvatar;
                        localStorage.setItem('chatUserAvatar', defaultAvatar);
                        if (window.allUsersAndVisitorsData && Array.isArray(window.allUsersAndVisitorsData)) {
                            const currentUserIndex = window.allUsersAndVisitorsData.findIndex(user => user.id === currentUserId);
                            if (currentUserIndex !== -1) {
                                window.allUsersAndVisitorsData[currentUserIndex].avatar = defaultAvatar;
                                console.log("تم تحديث الأفاتار في window.allUsersAndVisitorsData إلى الافتراضي.");
                            }
                        }
                        const modalProfileImageInDropdown = document.getElementById('modal-profile-image');
                        if (modalProfileImageInDropdown) {
                            modalProfileImageInDropdown.src = defaultAvatar;
                            console.log("تم تحديث صورة البروفايل في المودال المنسدل العلوي فورياً بعد الحذف.");
                        }
                        console.log("تم تعيين الأفاتار إلى الافتراضي في Firestore بنجاح.");
                    } catch (error) {
                        console.error("خطأ في تعيين الأفاتار الافتراضي:", error);
                        alert("فشل تعيين الأفاتار الافتراضي.");
                    }
                }
            }
        });
    }

    if (innerImageUploadInput) {
        innerImageUploadInput.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (file) {
                console.log("تم اختيار ملف الصورة الداخلية:", file.name);
                const imageUrl = await uploadImageToCloudinary(file);
                if (imageUrl) {
                    console.log("الرابط الذي تم الحصول عليه من Cloudinary (الصورة الداخلية):", imageUrl);
                    const currentUserId = localStorage.getItem('chatUserId');
                    if (currentUserId) {
                        await updateUserData(currentUserId, { innerImage: imageUrl });
                        console.log("تم استدعاء updateUserData للصورة الداخلية بنجاح.");
                        const innerImageElement = document.getElementById('profile-modal-inner-image');
                        if (innerImageElement) {
                            innerImageElement.src = imageUrl;
                        }
                        localStorage.setItem('chatUserInnerImage', imageUrl);
                        if (window.allUsersAndVisitorsData && Array.isArray(window.allUsersAndVisitorsData)) {
                            const currentUserIndex = window.allUsersAndVisitorsData.findIndex(user => user.id === currentUserId);
                            if (currentUserIndex !== -1) {
                                window.allUsersAndVisitorsData[currentUserIndex].innerImage = imageUrl;
                                console.log("تم تحديث الصورة الداخلية في window.allUsersAndVisitorsData");
                            }
                        }
                    }
                } else {
                    alert('فشل رفع الصورة الداخلية.');
                    console.error("فشل رفع الصورة الداخلية إلى Cloudinary أو لم يتم إرجاع رابط.");
                }
            }
            event.target.value = '';
        });
    }

    if (avatarUploadInput) {
        avatarUploadInput.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (file) {
                console.log("تم اختيار ملف صورة البروفايل:", file.name);
                const imageUrl = await uploadImageToCloudinary(file);
                if (imageUrl) {
                    console.log("الرابط الذي تم الحصول عليه من Cloudinary (الأفاتار):", imageUrl);
                    const currentUserId = localStorage.getItem('chatUserId');
                    if (currentUserId) {
                        await updateUserData(currentUserId, { avatar: imageUrl });
                        console.log("تم استدعاء updateUserData للأفاتار بنجاح.");
                        const profileModalAvatar = document.getElementById('profile-modal-avatar');
                        if (profileModalAvatar) profileModalAvatar.src = imageUrl;
                        const userProfileImage = document.getElementById('user-profile-image');
                        if (userProfileImage) userProfileImage.src = imageUrl;
                        localStorage.setItem('chatUserAvatar', imageUrl);
                        if (window.allUsersAndVisitorsData && Array.isArray(window.allUsersAndVisitorsData)) {
                            const currentUserIndex = window.allUsersAndVisitorsData.findIndex(user => user.id === currentUserId);
                            if (currentUserIndex !== -1) {
                                window.allUsersAndVisitorsData[currentUserIndex].avatar = imageUrl;
                                console.log("تم تحديث الأفاتار في window.allUsersAndVisitorsData");
                            }
                        }
                        const modalProfileImageInDropdown = document.getElementById('modal-profile-image');
                        if (modalProfileImageInDropdown) {
                            modalProfileImageInDropdown.src = imageUrl;
                            console.log("تم تحديث صورة البروفايل في المودال المنسدل العلوي فورياً.");
                        }
                    }
                } else {
                    alert('فشل رفع صورة البروفايل.');
                    console.error("فشل رفع الصورة إلى Cloudinary أو لم يتم إرجاع رابط.");
                }
            }
            event.target.value = '';
        });
    }

    const tabButtons = window.editProfileModal.querySelectorAll('.tabs-container .tab-button');
    const tabContents = window.editProfileModal.querySelectorAll('.tab-content');

    tabContents.forEach(content => content.style.display = 'none');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.style.display = 'none');

            button.classList.add('active');
            const targetTabId = button.getAttribute('data-tab') + '-tab-content';
            const targetTabContent = document.getElementById(targetTabId);
            if (targetTabContent) {
                targetTabContent.style.display = 'block';
            }
        });
    });

    const accountTabContent = document.getElementById('account-tab-content');
    if (accountTabContent) {
        accountTabContent.style.display = 'block';
    }
}

window.hideEditProfileModal = function() {
    if (window.editProfileModal && window.editProfileModal.classList.contains('show')) {
        window.editProfileModal.classList.remove('show');
        document.removeEventListener('click', window.handleEditProfileModalOutsideClick);
    }
};

window.handleEditProfileModalOutsideClick = function(event) {
    const editProfileButton = document.getElementById('editProfileButton');
    if (window.editProfileModal && !window.editProfileModal.contains(event.target) && event.target !== editProfileButton) {
        window.hideEditProfileModal();
    }
};

window.updateEditProfileModalContent = async function(user) {
    if (!window.editProfileModal) {
        console.warn("Edit Profile Modal not yet created when trying to update content.");
        return;
    }
    
    const profileModalAvatar = document.getElementById('profile-modal-avatar');
    const userNameDisplay = document.getElementById('profile-modal-username-display');
    const userRankDisplay = document.getElementById('profile-modal-user-rank');
    const profileModalRankImage = document.getElementById('profile-modal-rank-image');
    const innerImageElement = document.getElementById('profile-modal-inner-image');
    
    // **التعديل الجديد يبدأ هنا: إخفاء الأزرار إذا كان المستخدم زائرًا**
    const isVisitor = user && user.rank === 'زائر';
    
    const changeInnerImageBtn = window.editProfileModal.querySelector('.change-inner-image');
    const deleteInnerImageBtn = window.editProfileModal.querySelector('.delete-inner-image');
    const changeAvatarBtn = window.editProfileModal.querySelector('.avatar-overlay-buttons .camera-overlay');
    const deleteAvatarBtn = window.editProfileModal.querySelector('.avatar-overlay-buttons .trash-overlay');

    if (changeInnerImageBtn) changeInnerImageBtn.style.display = isVisitor ? 'none' : '';
    if (deleteInnerImageBtn) deleteInnerImageBtn.style.display = isVisitor ? 'none' : '';
    if (changeAvatarBtn) changeAvatarBtn.style.display = isVisitor ? 'none' : '';
    if (deleteAvatarBtn) deleteAvatarBtn.style.display = isVisitor ? 'none' : '';
    // **التعديل الجديد ينتهي هنا**
    
    if (user) {
        if (profileModalAvatar) {
            profileModalAvatar.src = user.avatar || 'https://i.imgur.com/Uo9V2Yx.png';
        }
        if (userNameDisplay) {
            userNameDisplay.textContent = user.name || 'غير معروف';
        }
        if (userRankDisplay) {
            userRankDisplay.textContent = user.rank || 'زائر';
            if (profileModalRankImage) {
                const rankImageSrc = RANK_IMAGE_MAP[user.rank] || RANK_IMAGE_MAP['default'];
                profileModalRankImage.src = rankImageSrc;
                profileModalRankImage.alt = user.rank ? `${user.rank} Image` : 'Default Rank Image';
            }
        }
        if (innerImageElement) {
            innerImageElement.src = user.innerImage || 'images/Interior.png';
        }
    } else {
        if (profileModalAvatar) profileModalAvatar.src = 'https://i.imgur.com/Uo9V2Yx.png';
        if (userNameDisplay) userNameDisplay.textContent = 'زائر';
        if (userRankDisplay) userRankDisplay.textContent = 'زائر';
        if (profileModalRankImage) profileModalRankImage.src = RANK_IMAGE_MAP['default'];
        if (innerImageElement) innerImageElement.src = 'images/Interior.png';
    }
};

document.addEventListener('DOMContentLoaded', createEditProfileModalHTML);

// -------------------------------------------------------------------
// منطق مودال الإعدادات (إذا كنت ستستخدمه)
// -------------------------------------------------------------------

// المتغيرات العالمية لمودال الإعدادات
window.settingsModal = null;
window.settingsCloseButton = null;

function createSettingsModalHTML() {
    const modalHTML = `
        <div id="settingsModal" class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>إعدادات التطبيق</h2>
                    <span class="close-button"><i class="fas fa-times"></i></span>
                </div>
                <div class="modal-body">
                    <p style="color: #333;">خيارات الإعدادات هنا.</p>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    window.settingsModal = document.getElementById('settingsModal');
    window.settingsCloseButton = window.settingsModal ? window.settingsModal.querySelector('.close-button') : null;
    if (window.settingsCloseButton) {
        window.settingsCloseButton.addEventListener('click', window.hideSettingsModal);
    }
}

window.hideSettingsModal = function() {
    if (window.settingsModal && window.settingsModal.classList.contains('show')) {
        window.settingsModal.classList.remove('show');
        document.removeEventListener('click', window.handleSettingsModalOutsideClick);
    }
};

window.handleSettingsModalOutsideClick = function(event) {
    const settingsButton = document.getElementById('settingsButton');
    if (window.settingsModal && !window.settingsModal.contains(event.target) && event.target !== settingsButton) {
        window.hideSettingsModal();
    }
};

document.addEventListener('DOMContentLoaded', createSettingsModalHTML);

// -------------------------------------------------------------------
// منطق مودال معلومات المستوى (Level Info Modal)
// -------------------------------------------------------------------

// دالة لإنشاء هيكل HTML لمودال معلومات// دالة لإنشاء هيكل HTML لمودال معلومات المستوى وإضافته إلى DOM
function createLevelInfoModalHTML() {
    const modalHTML = `
        <div id="level-info-backdrop" class="level-info-backdrop"></div>
        <div id="level-info-modal" class="level-info-modal">
            <div class="modal-content">
                <button class="close-btn">&times;</button>
                <h3>معلومات المستوى</h3>
                <div class="level-info-card">
                    <div class="level-item">
                        <span class="label">الرتبة:</span>
                        <span id="modal-level-rank" class="value"></span>
                    </div>
                    <div class="level-item">
                        <span class="label">المستوى الحالي:</span>
                        <span id="modal-current-level" class="value"></span>
                    </div>
                    <div class="level-item">
                        <span class="label">إجمالي نقاط الخبرة:</span>
                        <span id="modal-total-exp" class="value"></span>
                    </div>
                    <div class="progress-bar-container">
                        <div id="modal-exp-progress" class="progress-bar"></div>
                    </div>
                </div>
                <button class="close-button-footer">إغلاق</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const levelInfoModal = document.getElementById('level-info-modal');
    const closeLevelModalBtn = levelInfoModal.querySelector('.close-btn');
    const closeFooterBtn = levelInfoModal.querySelector('.close-button-footer');

    closeLevelModalBtn.addEventListener('click', hideLevelInfoModal);
    closeFooterBtn.addEventListener('click', hideLevelInfoModal);
}

// دالة لعرض مودال معلومات المستوى وتحديث// دالة لعرض مودال معلومات المستوى وتحديث محتواه
export function showLevelInfoModal(user) {
    const levelInfoModal = document.getElementById('level-info-modal');
    const backdrop = document.getElementById('level-info-backdrop'); // جلب عنصر الخلفية
    if (!levelInfoModal || !backdrop) {
        console.error("Level Info Modal or backdrop not found.");
        return;
    }

    // تحديث المحتوى بناءً على بيانات المستخدم
    document.getElementById('modal-level-rank').textContent = user.levelRank || 'مبتدئ';
    document.getElementById('modal-current-level').textContent = user.level || 1;
    document.getElementById('modal-total-exp').textContent = user.totalExp || 0;
    document.getElementById('modal-exp-progress').style.width = `${user.expProgress || 0}%`;

    // عرض المودال والخلفية
    backdrop.classList.add('show');
    levelInfoModal.classList.add('show');
}

// دالة لإخفاء مودال معلومات المستوى
export function hideLevelInfoModal() {
    const levelInfoModal = document.getElementById('level-info-modal');
    const backdrop = document.getElementById('level-info-backdrop'); // جلب عنصر الخلفية
    if (levelInfoModal && backdrop) {
        levelInfoModal.classList.remove('show');
        backdrop.classList.remove('show');
    }
}

// استدعاء دالة إنشاء الهيكل عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', createLevelInfoModalHTML);
