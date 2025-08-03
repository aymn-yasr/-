// js/main.js
import { loadComponent, createAndShowPrivateChatDialog, createUserInfoModal, hideUserInfoModal } from './chat-ui.js';
import { setupRealtimeMessagesListener, sendMessage, getPrivateChatContacts, getAllUsersAndVisitors, getUserData } from './chat-firestore.js';
import { RANK_ORDER, RANK_IMAGE_MAP, RANK_PERMISSIONS } from './constants.js';
import { showLevelInfoModal } from './modals.js'; // تم إضافة هذا السطر الجديد

let privateChatModal = null;
let onlineUsersModal = null;
let searchModal = null;
let profileDropdownMenu = null;
let profileButton = null;

let currentRoomId;
window.allUsersAndVisitorsData = [];

async function initializeAppData() {
    try {
        console.log("جاري جلب بيانات جميع المستخدمين والزوار...");
        window.allUsersAndVisitorsData = await getAllUsersAndVisitors();
        console.log("تم جلب بيانات المستخدمين والزوار بنجاح:", window.allUsersAndVisitorsData.length);

        const currentUserId = localStorage.getItem('chatUserId');
        const chatUserAvatar = localStorage.getItem('chatUserAvatar');

        if (currentUserId && chatUserAvatar && window.allUsersAndVisitorsData) {
            const currentUserInGlobalData = window.allUsersAndVisitorsData.find(user => user.id === currentUserId);
            if (currentUserInGlobalData && currentUserInGlobalData.avatar !== chatUserAvatar) {
                currentUserInGlobalData.avatar = chatUserAvatar;
                console.log("تم تحديث الأفاتار للمستخدم الحالي في window.allUsersAndVisitorsData من localStorage.");
            }
        }
    } catch (error) {
        console.error("خطأ في جلب البيانات الأولية للمستخدمين والزوار:", error);
    }
}
document.addEventListener('DOMContentLoaded', initializeAppData);

function hideOnlineUsersModal() {
    if (onlineUsersModal) {
        onlineUsersModal.remove();
        onlineUsersModal = null;
        document.removeEventListener('click', handleOnlineUsersModalOutsideClick);
    }
}

function hidePrivateChatModal() {
    if (privateChatModal) {
        privateChatModal.classList.remove('show');
        privateChatModal.addEventListener('transitionend', () => {
            if (privateChatModal) {
                privateChatModal.remove();
                privateChatModal = null;
            }
        }, { once: true });
        document.removeEventListener('click', handlePrivateChatModalOutsideClick);
    }
}

function hideSearchModal() {
    if (searchModal) {
        searchModal.remove();
        searchModal = null;
    }
}

function hideProfileDropdown() {
    if (profileDropdownMenu && profileDropdownMenu.classList.contains('show')) {
        profileDropdownMenu.classList.remove('show');
        document.removeEventListener('click', handleProfileDropdownOutsideClick);
    }
}

function hideAllOpenModals() {
    if (typeof hideUserInfoModal === 'function') {
        hideUserInfoModal();
    }
    if (typeof hideOnlineUsersModal === 'function') {
        hideOnlineUsersModal();
    }
    if (typeof hidePrivateChatModal === 'function') {
        hidePrivateChatModal();
    }
    if (typeof hideSearchModal === 'function') {
        hideSearchModal();
    }
    if (typeof window.hideEditProfileModal === 'function') {
        window.hideEditProfileModal();
    }
    if (typeof hideProfileDropdown === 'function') {
        hideProfileDropdown();
    }
}

async function createPrivateChatModal(buttonElement) {
    hideAllOpenModals();

    if (privateChatModal) {
        privateChatModal.remove();
        privateChatModal = null;
    }

    privateChatModal = document.createElement('div');
    privateChatModal.classList.add('private-chat-modal-strip');
    privateChatModal.innerHTML = `
        <div class="modal-header">
            <h3>الرسائل الخاصة</h3>
            <button class="close-btn">&times;</button>
        </div>
        <ul class="private-chat-list"> <li style="text-align: center; padding: 10px; color: #888;">جاري تحميل جهات الاتصال...</li>
        </ul>
    `;
    document.body.appendChild(privateChatModal);

    const buttonRect = buttonElement.getBoundingClientRect();
    const modalWidth = 200;
    const topBarElement = document.querySelector('.top-bar');
    const topBarHeight = topBarElement ? topBarElement.offsetHeight : 0;
    const padding = 10;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let modalLeft = buttonRect.right - modalWidth;
    let modalTop = buttonRect.bottom + padding;

    if (modalLeft < padding) {
        modalLeft = padding;
    }
    if (modalLeft + modalWidth > viewportWidth - padding) {
        modalLeft = viewportWidth - modalWidth - padding;
    }
    if (modalTop + privateChatModal.clientHeight > viewportHeight - padding) {
        modalTop = viewportHeight - privateChatModal.clientHeight - padding;
        if (modalTop < topBarHeight + padding) {
            modalTop = topBarHeight + padding;
        }
    }

    privateChatModal.style.left = `${modalLeft}px`;
    privateChatModal.style.top = `${modalTop}px`;

    privateChatModal.classList.add('show');

    privateChatModal.querySelector('.close-btn').addEventListener('click', () => {
        hidePrivateChatModal();
    });

    document.addEventListener('click', handlePrivateChatModalOutsideClick);

    const currentUserId = localStorage.getItem('chatUserId');
    if (currentUserId) {
        try {
            const ulElement = privateChatModal.querySelector('.private-chat-list');
            const contacts = await getPrivateChatContacts(currentUserId);
            ulElement.innerHTML = '';

            if (contacts.length === 0) {
                ulElement.innerHTML = `<li style="text-align: center; padding: 10px; color: #888;">لا توجد محادثات خاصة بعد.</li>`;
            } else {
                contacts.forEach(contact => {
                    const li = document.createElement('li');
                    li.setAttribute('data-user-id', contact.id);
                    li.innerHTML = `
                        <img src="${contact.avatar || 'images/default-user.png'}" alt="${contact.name}" class="user-avatar-small">
                        <span class="user-name">${contact.name}</span>
                    `;
                    li.addEventListener('click', () => {
                        hidePrivateChatModal();
                        createAndShowPrivateChatDialog(contact);
                    });
                    ulElement.appendChild(li);
                });
            }
        } catch (error) {
            console.error('خطأ في جلب جهات الاتصال الخاصة:', error);
            const ulElement = privateChatModal.querySelector('.private-chat-list');
            ulElement.innerHTML = `<li style="text-align: center; padding: 10px; color: red;">فشل تحميل جهات الاتصال.</li>`;
        }
    } else {
        const ulElement = privateChatModal.querySelector('.private-chat-list');
        ulElement.innerHTML = `<li style="text-align: center; padding: 10px; color: red;">الرجاء تسجيل الدخول لعرض المحادثات الخاصة.</li>`;
    }
}

function handleOnlineUsersModalOutsideClick(event) {
    const onlineUsersButton = document.querySelector('#online-users-btn');
    const isClickInsideOnlineUsersModal = window.onlineUsersModal && window.onlineUsersModal.contains(event.target);
    const isClickInsideUserInfoModal = window.userInfoModal && window.userInfoModal.contains(event.target);
    const isClickOnOnlineUsersButton = onlineUsersButton && onlineUsersButton.contains(event.target);

    if (window.onlineUsersModal && !isClickInsideOnlineUsersModal && !isClickOnOnlineUsersButton && !isClickInsideUserInfoModal) {
        hideOnlineUsersModal();
        document.removeEventListener('click', handleOnlineUsersModalOutsideClick);
    }
}

async function createOnlineUsersModal(buttonElement) {
    hideAllOpenModals();

    if (onlineUsersModal) {
        onlineUsersModal.remove();
        onlineUsersModal = null;
    }

    onlineUsersModal = document.createElement('div');
    onlineUsersModal.classList.add('online-users-modal');

    const currentUserName = localStorage.getItem('chatUserName') || 'زائر';

    onlineUsersModal.innerHTML = `
        <div class="modal-header new-header-buttons">
            <div class="header-buttons-container">
                <button class="header-btn" id="rooms-btn">
                    <span class="icon">🏠</span>
                    الغرف
                </button>
                <button class="header-btn" id="friends-btn">
                    <span class="icon">🤝</span>
                    الأصدقاء
                </button>
                <button class="header-btn" id="visitors-btn">
                    <span class="icon">👥</span>
                    الزوار
                </button>
                <button class="header-btn" id="search-btn">
                    <span class="icon">🔍</span>
                    بحث
                </button>
            </div>
            <button class="close-btn">&times;</button>
        </div>
        <div class="modal-content-area">
        </div>
    `;
    document.body.appendChild(onlineUsersModal);

    const modalContentArea = onlineUsersModal.querySelector('.modal-content-area');
    if (modalContentArea) {
        await fetchAndDisplayOnlineUsers(modalContentArea, currentUserName);
    }

    onlineUsersModal.style.display = 'flex';

    const searchBtn = onlineUsersModal.querySelector('#search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            const currentModalContentArea = onlineUsersModal.querySelector('.modal-content-area');
            if (currentModalContentArea) {
                showSearchInterface(currentModalContentArea, currentUserName);
            }
        });
    }

    const roomsBtn = onlineUsersModal.querySelector('#rooms-btn');
    const friendsBtn = onlineUsersModal.querySelector('#friends-btn');
    const visitorsBtn = onlineUsersModal.querySelector('#visitors-btn');

    [roomsBtn, friendsBtn, visitorsBtn].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                const currentModalContentArea = onlineUsersModal.querySelector('.modal-content-area');
                if (currentModalContentArea) {
                    fetchAndDisplayOnlineUsers(currentModalContentArea, currentUserName);
                }
            });
        }
    });

    onlineUsersModal.querySelector('.close-btn').addEventListener('click', () => {
        hideOnlineUsersModal();
    });

    document.addEventListener('click', handleOnlineUsersModalOutsideClick);
}


async function fetchAndDisplayOnlineUsers(modalContentArea, currentUserName) {
    modalContentArea.innerHTML = `
        <div class="welcome-message-box">
            أهلاً وسهلاً بك معنا، ${currentUserName} يسعد مساءك 🌙 بكل خير
        </div>
        <div class="online-users-list">
            <div style="text-align: center; padding: 20px; color: #888;">جاري تحميل المستخدمين...</div>
        </div>
    `;
    const onlineUsersList = modalContentArea.querySelector('.online-users-list');
    try {
        const users = await getAllUsersAndVisitors();
        onlineUsersList.innerHTML = '';

        if (users.length === 0) {
            onlineUsersList.innerHTML = `<div style="text-align: center; padding: 20px; color: #888;">لا يوجد مستخدمون متصلون حالياً.</div>`;
            return;
        }

        const groupedUsers = {};
        users.forEach(user => {
            const rank = user.rank || 'زائر';
            if (!groupedUsers[rank]) {
                groupedUsers[rank] = [];
            }
            groupedUsers[rank].push(user);
        });

        const sortedRanks = RANK_ORDER.filter(rank => groupedUsers[rank]);
        const otherRanks = Object.keys(groupedUsers).filter(rank => !RANK_ORDER.includes(rank));
        sortedRanks.push(...otherRanks.sort());

        sortedRanks.forEach(rank => {
            const usersInRank = groupedUsers[rank];
            if (usersInRank && usersInRank.length > 0) {
                const rankHeader = document.createElement('div');
                rankHeader.classList.add('rank-header');
                rankHeader.setAttribute('data-rank', rank);
                rankHeader.innerHTML = `<h3>${rank}</h3>`;
                onlineUsersList.appendChild(rankHeader);

                usersInRank.sort((a, b) => a.name.localeCompare(b.name));

                usersInRank.forEach(user => {
                    const userItemDiv = document.createElement('div');
                    userItemDiv.classList.add('user-item');
                    const rankImageSrc = RANK_IMAGE_MAP[user.rank] || RANK_IMAGE_MAP['default'];
                    userItemDiv.innerHTML = `
                        <img src="${user.avatar || 'images/default-user.png'}" alt="${user.name}" class="user-avatar-small">
                        <span class="user-name">${user.name}</span>
                        <img src="${rankImageSrc}" alt="${user.rank}" class="user-rank-image" title="${user.rank}" />
                    `;

            const userAvatarElement = userItemDiv.querySelector('.user-avatar-small');
            if (userAvatarElement) {
                userAvatarElement.addEventListener('click', (event) => {
                    event.stopPropagation();
                    // **السطر المعدل:**
                    createUserInfoModal(userAvatarElement, user, window.allUsersAndVisitorsData);
                });
            }
            onlineUsersList.appendChild(userItemDiv);
        });
            }
        });
    } catch (error) {
        console.error("خطأ في جلب المستخدمين المتصلين:", error);
        onlineUsersList.innerHTML = `<div style="text-align: center; padding: 20px; color: red;">فشل تحميل قائمة المستخدمين.</div>`;
    }
}

function showSearchInterface(modalContentArea) {
    modalContentArea.innerHTML = `
        <div class="search-input-container">
            <input type="text" id="user-search-input" placeholder="ابحث بالاسم..." />
            <button id="clear-search-btn">&times;</button>
        </div>
        <div class="search-results-list online-users-list">
            <div style="text-align: center; padding: 20px; color: #888;">ابدأ الكتابة للبحث عن المستخدمين...</div>
        </div>
    `;

    const searchInput = modalContentArea.querySelector('#user-search-input');
    const searchResultsList = modalContentArea.querySelector('.search-results-list');
    const clearSearchBtn = modalContentArea.querySelector('#clear-search-btn');

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchResultsList.innerHTML = `<div style="text-align: center; padding: 20px; color: #888;">ابدأ الكتابة للبحث عن المستخدمين...</div>`;
        clearSearchBtn.style.display = 'none';
    });

    searchInput.addEventListener('input', async (event) => {
        const searchTerm = event.target.value.toLowerCase().trim();
        if (searchTerm.length > 0) {
            clearSearchBtn.style.display = 'block';
        } else {
            clearSearchBtn.style.display = 'none';
        }

        if (searchTerm.length < 2) {
            searchResultsList.innerHTML = `<div style="text-align: center; padding: 20px; color: #888;">الرجاء إدخال حرفين على الأقل للبحث.</div>`;
            return;
        }

        searchResultsList.innerHTML = `<div style="text-align: center; padding: 20px; color: #888;">جاري البحث عن "${searchTerm}"...</div>`;

        try {
            const allUsers = await getAllUsersAndVisitors();
            const filteredUsers = allUsers.filter(user =>
                user.name.toLowerCase().includes(searchTerm)
            );

            searchResultsList.innerHTML = '';

            if (filteredUsers.length === 0) {
                searchResultsList.innerHTML = `<div style="text-align: center; padding: 20px; color: #888;">لا يوجد مستخدمون يطابقون بحثك.</div>`;
            } else {
                filteredUsers.forEach(user => {
                    const userItemDiv = document.createElement('div');
                    userItemDiv.classList.add('user-item');
                    const rankImageSrc = RANK_IMAGE_MAP[user.rank] || RANK_IMAGE_MAP['default'];
                    userItemDiv.innerHTML = `
                        <img src="${user.avatar || 'images/default-user.png'}" alt="${user.name}" class="user-avatar-small">
                        <span class="user-name">${user.name}</span>
                        <img src="${rankImageSrc}" alt="${user.rank}" class="user-rank-image" title="${user.rank}" />
                    `;

                    const userAvatarElement = userItemDiv.querySelector('.user-avatar-small');
                    if (userAvatarElement) {
                        userAvatarElement.addEventListener('click', (event) => {
                            event.stopPropagation();
                            createUserInfoModal(userAvatarElement, user);
                        });
                    }
                    searchResultsList.appendChild(userItemDiv);
                });
            }
        } catch (error) {
            console.error("خطأ في البحث عن المستخدمين:", error);
            searchResultsList.innerHTML = `<div style="text-align: center; padding: 20px; color: red;">فشل البحث عن المستخدمين.</div>`;
        }
    });
}

function handleProfileDropdownOutsideClick(event) {
    if (profileDropdownMenu && profileDropdownMenu.classList.contains('show') && !profileDropdownMenu.contains(event.target) && !profileButton.contains(event.target)) {
        hideProfileDropdown();
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // **التحقق من تسجيل الدخول أولاً**
    let chatUserId = localStorage.getItem('chatUserId');
    let chatUserName = localStorage.getItem('chatUserName');
    let chatUserAvatar = localStorage.getItem('chatUserAvatar');

    if (chatUserId) {
        try {
            const userData = await getUserData(chatUserId);
            if (!userData) {
                console.log('بيانات المستخدم غير موجودة في قاعدة البيانات، جاري التوجيه إلى صفحة التسجيل...');
                localStorage.removeItem('chatUserId');
                localStorage.removeItem('chatUserName');
                localStorage.removeItem('chatUserAvatar');
                window.location.href = 'index.html';
                return;
            }
        } catch (error) {
            console.error('خطأ في التحقق من المستخدم:', error);
            localStorage.removeItem('chatUserId');
            localStorage.removeItem('chatUserName');
            localStorage.removeItem('chatUserAvatar');
            window.location.href = 'index.html';
            return;
        }
    } else {
        console.log('لا يوجد معرف مستخدم مخزن، جاري التوجيه إلى صفحة التسجيل/الدخول...');
        window.location.href = 'index.html';
        return;
    }

    // **الآن فقط، بعد التأكد من أن المستخدم مسجل، نتحقق من الغرفة**
    const urlParams = new URLSearchParams(window.location.search);
    const roomIdFromUrl = urlParams.get('roomId');
    const lastVisitedRoomId = localStorage.getItem('lastVisitedRoomId');
    
    const currentRoomId = roomIdFromUrl || lastVisitedRoomId;

    if (!currentRoomId) {
        console.log('لا توجد غرفة محددة أو محفوظة. جاري التوجيه إلى صفحة الغرف.');
        window.location.href = 'rooms.html';
        return;
    }
    
    localStorage.setItem('lastVisitedRoomId', currentRoomId);
    
    const chatContainer = document.querySelector('.chat-container');
    if (!chatContainer) {
        document.body.innerHTML = '<div style="text-align: center; color: red; padding-top: 50px;">خطأ: لم يتم العثور على عنصر "chat-container". تأكد من وجوده في ملف HTML (chat.html).</div>';
        console.error('CRITICAL ERROR: chat-container element not found!');
        return;
    }

    try {
        await loadComponent("top-bar", "components/top-bar.html");
        await loadComponent("chat-box", "components/chat-box.html");
        await loadComponent("input-bar", "components/input-bar.html");
        
        setupRealtimeMessagesListener(currentRoomId);
        
        profileButton = document.getElementById('profileButton');

        async function createAndAppendProfileDropdown() {
            profileDropdownMenu = document.createElement('div');
            profileDropdownMenu.id = 'profileDropdownMenu';
            profileDropdownMenu.classList.add('profile-dropdown-menu');

            let currentUserRank = 'زائر';
            const currentUserId = localStorage.getItem('chatUserId');
            if (currentUserId) {
                try {
                    const allUsersAndVisitors = await getAllUsersAndVisitors();
                    const currentUserData = allUsersAndVisitors.find(user => user.id === currentUserId);
                    if (currentUserData && currentUserData.rank) {
                        currentUserRank = currentUserData.rank;
                    }
                } catch (error) {
                    console.error("خطأ في جلب رتبة المستخدم:", error);
                }
            }
            const rankImageSrc = RANK_IMAGE_MAP[currentUserRank] || RANK_IMAGE_MAP['default'];

            profileDropdownMenu.innerHTML = `
                <div class="profile-dropdown-content">
                    <div class="profile-header">
                        <img id="modal-profile-image" src="${localStorage.getItem('chatUserAvatar') || 'https://i.imgur.com/Uo9V2Yx.png'}" alt="صورة المستخدم">
                        <div class="profile-info">
                            <div class="profile-rank-display">
                                <span class="rank-text">${currentUserRank}</span>
                                <img src="${rankImageSrc}" alt="${currentUserRank}" class="rank-icon" title="${currentUserRank}" />
                            </div>
                            <p id="modal-username-display">${chatUserName || 'زائر'}</p>
                        </div>
                    </div>

         <div class="profile-buttons-section">
    <button class="modal-button level-info-btn">
        معلومات المستوى <i class="icon fa-solid fa-chart-column"></i>
    </button>
    <button class="modal-button wallet-btn">
        المحفظة <i class="icon fa-solid fa-wallet"></i>
    </button>
    <button class="modal-button edit-account-btn" id="editProfileButton">
        تعديل الحساب <i class="icon fa-solid fa-user-gear"></i>
    </button>
    <button class="modal-button leave-room-btn">
        الخروج من الغرفة <i class="icon fa-solid fa-arrow-right-from-bracket"></i>
    </button>
    <button class="modal-button logout">
        الخروج من الحساب <i class="icon fa-solid fa-right-from-bracket"></i>
    </button>
</div>
            `;
            document.body.appendChild(profileDropdownMenu);

            const levelInfoBtn = profileDropdownMenu.querySelector('.modal-button.level-info-btn');
if (levelInfoBtn) {
    levelInfoBtn.addEventListener('click', async () => {
        // 1. الحصول على هوية المستخدم الحالي من الذاكرة المحلية
        const currentUserId = localStorage.getItem('chatUserId');

        if (currentUserId) {
            try {
                // 2. جلب بيانات المستخدم الحقيقية من Firestore
                const userData = await getUserData(currentUserId);
                
                if (userData) {
                    // 3. حساب نقاط الخبرة المتبقية وتحديد النسبة المئوية
                    const expToNextLevel = userData.expToNextLevel || 1000;
                    const expProgress = Math.floor((userData.currentExp / expToNextLevel) * 100);

                    // 4. إعداد البيانات النهائية لإرسالها إلى المودال
                    const userLevelData = {
                        levelRank: userData.rank || 'مبتدئ',
                        level: userData.level || 1,
                        totalExp: userData.totalExp || 0,
                        expProgress: expProgress
                    };

                    // 5. عرض المودال بالبيانات الحقيقية
                    showLevelInfoModal(userLevelData);
                } else {
                    alert('لم يتم العثور على بيانات المستخدم.');
                }
            } catch (error) {
                console.error("خطأ في جلب بيانات المستخدم:", error);
                alert('حدث خطأ أثناء جلب معلومات المستوى.');
            }
        } else {
            alert('يجب تسجيل الدخول لعرض معلومات المستوى.');
        }

        hideProfileDropdown();
    });
}

            const walletButton = profileDropdownMenu.querySelector('.modal-button.wallet-btn');
            if (walletButton) {
                walletButton.addEventListener('click', () => {
                    alert('سيتم فتح صفحة المحفظة!');
                    hideProfileDropdown();
                });
            }

            const leaveRoomButton = profileDropdownMenu.querySelector('.modal-button.leave-room-btn');
if (leaveRoomButton) {
    leaveRoomButton.addEventListener('click', () => {
        // حذف آخر غرفة تمت زيارتها من التخزين المحلي
        localStorage.removeItem('lastVisitedRoomId');
        
        // توجيه المستخدم إلى صفحة الغرف
        window.location.href = 'rooms.html';
        hideProfileDropdown();
    });
}

            const logoutButton = profileDropdownMenu.querySelector('.modal-button.logout');
            if (logoutButton) {
                logoutButton.addEventListener('click', () => {
                    localStorage.removeItem('chatUserId');
                    localStorage.removeItem('chatUserName');
                    localStorage.removeItem('chatUserAvatar');
                    window.location.href = 'index.html';
                    hideProfileDropdown();
                });
            }
        }

        createAndAppendProfileDropdown();

        if (profileButton) {
            profileButton.addEventListener('click', (event) => {
                event.stopPropagation();
                hideAllOpenModals();

                if (profileDropdownMenu) {
                    profileDropdownMenu.classList.add('show');

                    const buttonRect = profileButton.getBoundingClientRect();
                    profileDropdownMenu.style.top = `${buttonRect.bottom + window.scrollY + 5}px`;
                    
                    const dropdownWidth = profileDropdownMenu.offsetWidth;
                    const windowWidth = window.innerWidth;
                    let desiredRight = windowWidth - buttonRect.right - window.scrollX;

                    if (desiredRight + dropdownWidth > windowWidth) {
                        desiredRight = windowWidth - dropdownWidth - 10;
                    }
                    profileDropdownMenu.style.right = `${desiredRight}px`;
                    profileDropdownMenu.style.left = 'auto';

                    document.addEventListener('click', handleProfileDropdownOutsideClick);
                } else {
                    console.warn("profileDropdownMenu لم يتم إنشاؤه بعد عند النقر على زر البروفايل.");
                }
            });
        } else {
            console.warn('زر البروفايل (#profileButton) لم يتم العثور عليه.');
        }

        const currentUserId = localStorage.getItem('chatUserId');
        if (currentUserId) {
            try {
                const allUsersAndVisitors = await getAllUsersAndVisitors();
                const currentUserData = allUsersAndVisitors.find(user => user.id === currentUserId);

                if (currentUserData) {
                    const currentUserRank = currentUserData.rank;

                    const privateBtn = document.querySelector('.top-bar .btn.private');
                    const reportBtn = document.querySelector('.top-bar .btn.report');

                    if (privateBtn) {
                        const canSeePrivateChat = RANK_PERMISSIONS[currentUserRank]?.canSeePrivateChatButton;
                        if (canSeePrivateChat === false) {
                            privateBtn.style.display = 'none';
                        } else {
                            privateBtn.style.display = 'flex';
                        }
                    }

                    if (reportBtn) {
                        const canSeeReport = RANK_PERMISSIONS[currentUserRank]?.canSeeReportButton;
                        if (canSeeReport === false) {
                            reportBtn.style.visibility = 'hidden';
                            reportBtn.style.pointerEvents = 'none';
                        } else {
                            reportBtn.style.visibility = 'visible';
                            reportBtn.style.pointerEvents = 'auto';
                        }
                    }
                }
            } catch (error) {
                console.error('خطأ في جلب بيانات المستخدم أو إدارة ظهور الأزرار:', error);
            }
        }
        
        const userProfileImage = document.getElementById('user-profile-image');
        if (userProfileImage) {
            userProfileImage.src = chatUserAvatar || 'https://i.imgur.com/Uo9V2Yx.png';
            userProfileImage.style.display = 'block';
        }

        setupRealtimeMessagesListener(currentRoomId);

        const refreshButton = document.querySelector('#top-bar .btn.refresh');
        if (refreshButton) {
            refreshButton.addEventListener('click', () => {
                window.location.reload();
            });
        }

        const privateButton = document.querySelector('#top-bar .btn.private');
        if (privateButton) {
            privateButton.addEventListener('click', (event) => {
                event.stopPropagation();
                createPrivateChatModal(privateButton);
            });
        } else {
            console.warn('زر الدردشة الخاصة غير موجود.');
        }

        const onlineUsersButton = document.querySelector('#online-users-btn');
        if (onlineUsersButton) {
            onlineUsersButton.addEventListener('click', (event) => {
                event.stopPropagation();
                createOnlineUsersModal(onlineUsersButton);
            });
        } else {
            console.warn('زر المستخدمين المتصلين غير موجود.');
        }

        const editProfileButton = document.getElementById('editProfileButton');
        if (editProfileButton) {
            editProfileButton.addEventListener('click', async (event) => {
                event.preventDefault(); 
                event.stopPropagation(); 

                if (typeof hideProfileDropdown === 'function') {
                    hideProfileDropdown();
                }
                hideAllOpenModals(); 

                const currentUserId = localStorage.getItem('chatUserId');
                let currentUserData = null;
                if (currentUserId) {
                    if (window.allUsersAndVisitorsData && Array.isArray(window.allUsersAndVisitorsData)) {
                        currentUserData = window.allUsersAndVisitorsData.find(user => user.id === currentUserId);
                    } else {
                        console.warn("window.allUsersAndVisitorsData غير متاح، جاري الجلب من Firestore كحل احتياطي.");
                        try {
                            const allUsers = await getAllUsersAndVisitors();
                            currentUserData = allUsers.find(user => user.id === currentUserId);
                        } catch (error) {
                            console.error("خطأ في جلب بيانات المستخدم لمودال التعديل:", error);
                        }
                    }
                }

                if (typeof window.hideEditProfileModal === 'function' && window.editProfileModal) {
                    window.editProfileModal.classList.add('show');
                    document.addEventListener('click', window.handleEditProfileModalOutsideClick);
                    
                    if (typeof window.updateEditProfileModalContent === 'function') {
                        window.updateEditProfileModalContent(currentUserData);
                    }
                } else {
                    console.error("مودال تعديل الملف أو دواله غير متاحة. تأكد من تحميل modals.js بشكل صحيح.");
                }
            });
        }

        const messageInput = document.querySelector('#input-bar input');
        const sendButton = document.querySelector('#input-bar .send-btn');

        if (messageInput && sendButton) {
            sendButton.addEventListener('click', () => {
                const messageText = messageInput.value.trim();
                if (messageText) {
                    sendMessage(messageText, currentRoomId);
                    messageInput.value = '';
                }
            });

            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const messageText = messageInput.value.trim();
                    if (messageText) {
                        sendMessage(messageText, currentRoomId);
                        messageInput.value = '';
                    }
                }
            });
        }

    } catch (error) {
        console.error('فشل تحميل أحد مكونات HTML:', error);
        if (chatContainer) {
            chatContainer.innerHTML = `<div style="text-align: center; color: red; padding-top: 50px;">
                                           <p>عذرًا، حدث خطأ أثناء تحميل مكونات الدردشة الأساسية.</p>
                                           <p>الرجاء التأكد من وجود ملفات HTML في مساراتها الصحيحة (components/).</p>
                                           <p>تفاصيل الخطأ: ${error.message}</p>
                                         </div>`;
        } else {
            document.body.innerHTML = `<div style="text-align: center; color: red; padding-top: 50px;">
                                           <p>خطأ فادح: فشل تحميل مكونات التطبيق. يرجى مراجعة Console لمزيد من التفاصيل.</p>
                                         </div>`;
        }
    }

    document.addEventListener('click', (event) => {
        const target = event.target;
    });
});

window.sendMessage = sendMessage;
