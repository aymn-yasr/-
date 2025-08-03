// js/chat-ui.js

import { getPrivateChatId, sendPrivateMessage, setupPrivateMessagesListener } from './chat-firestore.js';
import { db, serverTimestamp } from './firebase-config.js';
import { RANK_IMAGE_MAP, RANK_PERMISSIONS } from './constants.js';

export async function loadComponent(id, file) {
  const res = await fetch(file);
  const html = await res.text();
  document.getElementById(id).innerHTML = html;
}

let currentOpenMenu = null;

export let activeQuoteData = null;

function displayActiveQuoteBubble(senderName, content) {
    const chatContainer = document.querySelector('.chat-container');
    let quoteBubble = document.querySelector('.active-quote-bubble');

    if (!quoteBubble) {
        quoteBubble = document.createElement('div');
        quoteBubble.classList.add('active-quote-bubble');
        quoteBubble.innerHTML = `
            <div class="quote-content-wrapper">
                <div class="quote-sender-name"></div>
                <div class="quote-text-preview"></div>
            </div>
            <button class="close-quote-btn">&times;</button>
        `;
        chatContainer.appendChild(quoteBubble);

        quoteBubble.querySelector('.close-quote-btn').addEventListener('click', () => {
            hideActiveQuoteBubble();
        });
    }

    quoteBubble.querySelector('.quote-sender-name').textContent = senderName;
    quoteBubble.querySelector('.quote-text-preview').textContent = content.split('\n')[0].substring(0, 50) + (content.length > 50 ? '...' : '');

    quoteBubble.style.display = 'flex';
}

export function hideActiveQuoteBubble() {
    const quoteBubble = document.querySelector('.active-quote-bubble');
    if (quoteBubble) {
        quoteBubble.style.display = 'none';
    }
    activeQuoteData = null;
}

window.userInfoModal = null;

export function createUserInfoModal(targetElement, userData, allUsersAndVisitorsData) {
    if (userInfoModal) {
        userInfoModal.remove();
        userInfoModal = null;
    }

    const currentUserId = localStorage.getItem('chatUserId');
    const isCurrentUser = (userData.id === currentUserId);

    let isTargetUserVisitor = false;
    const targetUserDataFull = allUsersAndVisitorsData.find(user => user.id === userData.id);
    if (targetUserDataFull && targetUserDataFull.rank === 'زائر') {
        isTargetUserVisitor = true;
    }

    let viewerIsVisitor = false;
    if (currentUserId) {
        const viewerData = allUsersAndVisitorsData.find(user => user.id === currentUserId);
        if (viewerData && viewerData.rank === 'زائر') {
            viewerIsVisitor = true;
        }
    } else {
        viewerIsVisitor = true;
    }

    userInfoModal = document.createElement('div');
    userInfoModal.classList.add('user-info-modal');
    userInfoModal.innerHTML = `
        <div class="modal-content">
            <span class="close-button">&times;</span>
            <img src="${userData.avatar || 'images/default-user.png'}" alt="${userData.name}" class="user-avatar-large">
            ${userData.rank ? `<p class="user-rank-info">الرتبة: <img src="${RANK_IMAGE_MAP[userData.rank] || 'images/default-rank.png'}" alt="${userData.rank}" class="user-rank-image-modal" title="${userData.rank}"/></p>` : ''}
            <div class="user-name-display">${userData.name}</div>
            <div class="modal-buttons">
                <button class="modal-button view-profile">عرض الملف الشخصي</button>
                <button class="modal-button start-private">بدء خاص</button> </div>
            ${userData.bio ? `<p class="user-bio">${userData.bio}</p>` : ''}
        </div>
    `;

    document.body.appendChild(userInfoModal);

    if (targetElement) {
        const targetRect = targetElement.getBoundingClientRect();
        const modalWidth = userInfoModal.offsetWidth;
        const modalHeight = userInfoModal.offsetHeight;

        const padding = 10;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let modalLeft = targetRect.left;
        let modalTop = targetRect.bottom + padding;

        if (modalLeft + modalWidth > viewportWidth - padding) {
            modalLeft = viewportWidth - modalWidth - padding;
        }
        if (modalLeft < padding) {
            modalLeft = padding;
        }

        if (modalTop + modalHeight > viewportHeight - padding) {
            modalTop = targetRect.top - modalHeight - padding;
            if (modalTop < padding) {
                modalTop = padding;
            }
        }

        userInfoModal.style.left = `${modalLeft}px`;
        userInfoModal.style.top = `${modalTop}px`;
        userInfoModal.style.transform = 'none';
    } else {
        userInfoModal.style.left = '50%';
        userInfoModal.style.top = '50%';
        userInfoModal.style.transform = 'translate(-50%, -50%)';
    }

    userInfoModal.style.visibility = 'visible';
    userInfoModal.classList.add('show');

    document.addEventListener('click', handleUserInfoModalOutsideClick);

    userInfoModal.querySelector('.close-button').addEventListener('click', (event) => {
        event.stopPropagation();
        hideUserInfoModal();
    });

    userInfoModal.querySelector('.modal-button.view-profile').addEventListener('click', (event) => {
        event.stopPropagation();
        hideUserInfoModal();
        alert('سيتم عرض الملف الشخصي لـ ' + userData.name);
    });

    const startPrivateButton = userInfoModal.querySelector('.modal-button.start-private');

    if (startPrivateButton) {
        if (isCurrentUser || viewerIsVisitor || isTargetUserVisitor) {
            startPrivateButton.style.display = 'none';
        } else {
            startPrivateButton.style.display = 'block';
            startPrivateButton.addEventListener('click', (event) => {
                event.stopPropagation();
                createAndShowPrivateChatDialog(userData);
                hideUserInfoModal();
            });
        }
    }
}

function handleUserInfoModalOutsideClick(event) {
    const isClickedInsideModal = window.userInfoModal && window.userInfoModal.contains(event.target);
    const isClickedOnMessageUserElement = event.target.closest('.chat-message .user-avatar') || event.target.closest('.chat-message .message-name');
    
    // هذا السطر مهم جداً لمنع إغلاق المودال عند النقر على صورة مستخدم آخر في قائمة المتصلين
    const isClickedOnOnlineUserAvatar = event.target.closest('.user-item .user-avatar-small');

    if (window.userInfoModal && !isClickedInsideModal && !isClickedOnMessageUserElement && !isClickedOnOnlineUserAvatar) {
        hideUserInfoModal();
    }
}

export function hideUserInfoModal() {
    if (userInfoModal) {
        userInfoModal.classList.remove('show');
        userInfoModal.addEventListener('transitionend', function handler() {
            if (!userInfoModal.classList.contains('show')) {
                userInfoModal.remove();
                userInfoModal = null;
                document.removeEventListener('click', handleUserInfoModalOutsideClick);
            }
            userInfoModal.removeEventListener('transitionend', handler);
        });
    }
}

export function hideAllModals() {
    hideUserInfoModal();
}

let privateChatDialog = null;

const privateChatDialogHTML = `
    <div class="private-chat-dialog-content">
        <div class="private-chat-header">
            <img src="" alt="صورة المستخدم" class="private-chat-avatar">
            <span class="private-chat-username"></span>
            <button class="close-private-chat-btn">&times;</button>
        </div>
        <div class="private-chat-messages">
            </div>
        <div class="private-chat-input-area">
            <input type="text" placeholder="اكتب رسالتك..." class="private-chat-input">
            <button class="private-chat-send-btn">➤</button>
        </div>
    </div>
`;


export async function createAndShowPrivateChatDialog(targetUserData) {
    if (privateChatDialog) {
        hidePrivateChatDialog();
    }

    privateChatDialog = document.createElement('div');
    privateChatDialog.classList.add('private-chat-dialog');
    privateChatDialog.id = 'privateChatDialog';
    document.body.appendChild(privateChatDialog);

    privateChatDialog.innerHTML = privateChatDialogHTML;

    const avatarElement = privateChatDialog.querySelector('.private-chat-avatar');
    const usernameElement = privateChatDialog.querySelector('.private-chat-username');

    if (avatarElement) avatarElement.src = targetUserData.avatar;
    if (usernameElement) usernameElement.textContent = targetUserData.name;

    privateChatDialog.querySelector('.close-private-chat-btn').addEventListener('click', () => {
        hidePrivateChatDialog();
    });

    const privateChatInput = privateChatDialog.querySelector('.private-chat-input');
    const privateChatSendBtn = privateChatDialog.querySelector('.private-chat-send-btn');
    const privateChatMessagesBox = privateChatDialog.querySelector('.private-chat-messages');

    const currentUserId = localStorage.getItem('chatUserId');
    if (currentUserId) {
        setupPrivateMessagesListener(currentUserId, targetUserData.id, privateChatMessagesBox, true);
    } else {
        console.error('معرف المستخدم الحالي غير موجود لفتح الدردشة الخاصة.');
        privateChatMessagesBox.innerHTML = '<div style="text-align: center; padding: 20px; color: red;">الرجاء تسجيل الدخول لبدء محادثة خاصة.</div>';
        return;
    }


    if (privateChatSendBtn && privateChatInput && privateChatMessagesBox) {
        privateChatSendBtn.addEventListener('click', async () => {
            const messageText = privateChatInput.value.trim();
            if (messageText) {
                const senderId = localStorage.getItem('chatUserId');
                const senderName = localStorage.getItem('chatUserName');
                const senderAvatar = localStorage.getItem('chatUserAvatar');

                await sendPrivateMessage(senderId, senderName, senderAvatar, targetUserData.id, messageText);

                privateChatInput.value = '';
            }
        });

        privateChatInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                privateChatSendBtn.click();
            }
        });

    } else {
        console.error("Failed to find private chat input elements. Check private chat dialog HTML structure.");
    }

    setTimeout(() => {
        privateChatDialog.classList.add('show');
    }, 10);

    hideUserInfoModal();
}

export function hidePrivateChatDialog() {
    if (privateChatDialog) {
        privateChatDialog.classList.remove('show');
        const messagesBoxElement = privateChatDialog.querySelector('.private-chat-messages');
        if (messagesBoxElement && messagesBoxElement._privateChatUnsubscribe) {
            messagesBoxElement._privateChatUnsubscribe();
            messagesBoxElement._privateChatUnsubscribe = null;
            console.log("تم إلغاء الاشتراك من مستمع الرسائل الخاصة.");
        }

        privateChatDialog.addEventListener('transitionend', () => {
            if (privateChatDialog) {
                privateChatDialog.remove();
                privateChatDialog = null;
            }
        }, { once : true });
    }
}

export function createMessageElement(messageData) {
  const messageItem = document.createElement('div');
  messageItem.classList.add('message-item');
  messageItem.setAttribute('data-id', messageData.id);

  let userNameClass = '';
  let avatarGradientClass = '';
  switch (messageData.avatarColor) {
    case 'red': userNameClass = 'name-red'; avatarGradientClass = 'gradient-pink'; break;
    case 'blue': userNameClass = 'name-blue'; avatarGradientClass = 'gradient-purple'; break;
    case 'green': userNameClass = 'name-green'; avatarGradientClass = 'gradient-green'; break;
    case 'gold': userNameClass = 'name-gold'; avatarGradientClass = 'gradient-gold'; break;
    default: userNameClass = ''; avatarGradientClass = 'gradient-purple';
  }

  let profileImageSrc = '';
  if (messageData.avatar) {
      profileImageSrc = messageData.avatar;
  } else if (messageData.userType === 'visitor') {
      profileImageSrc = 'images/default-visitor.png';
  } else {
      profileImageSrc = 'images/default-user.png';
  }

  const starHtml = messageData.hasStar ? '<span class="star-icon">⭐</span>' : '';
  const badgeHtml = messageData.badge ? `<span class="message-badge">${messageData.badge}</span>` : '';

  let rankImageHtml = '';
  const rankImagePath = RANK_IMAGE_MAP[messageData.senderRank];
  if (rankImagePath) {
      rankImageHtml = `<img src="${rankImagePath}" alt="${messageData.senderRank}" class="rank-icon">`;
  }

  let messageTextContent = '';

  if (messageData.quoted && messageData.quoted.senderName && messageData.quoted.content) {
      messageTextContent += `
        <div class="quoted-message">
          <div class="quoted-sender-name">${messageData.quoted.senderName}</div>
          <div class="quoted-content">${messageData.quoted.content}</div>
        </div>
      `;
  }

  messageTextContent += messageData.text;
  
  // **هذا الكود الجديد الذي يحدد لون الشريط بناءً على المستوى**
  const userLevel = messageData.level || 1;
  let levelColorClass = '';
  if (userLevel >= 50) {
    levelColorClass = 'level-50';
  } else if (userLevel >= 40) {
    levelColorClass = 'level-40';
  } else if (userLevel >= 30) {
    levelColorClass = 'level-30';
  } else if (userLevel >= 20) {
    levelColorClass = 'level-20';
  } else if (userLevel >= 10) {
    levelColorClass = 'level-10';
  } else if (userLevel >= 5) {
    levelColorClass = 'level-5';
  }

  messageItem.innerHTML = `
    <div class="user-avatar ${avatarGradientClass}"
          data-user-id="${messageData.senderId}"
          data-user-name="${messageData.user}"
          data-user-avatar="${profileImageSrc}">
      <img src="${profileImageSrc}" alt="صورة الملف الشخصي" class="profile-image" />
      ${messageData.userType === 'registered' ? `<div class="level-badge ${levelColorClass}">${userLevel}</div>` : ''}
    </div>
    <div class="message-info">
      <div class="message-header">
        <div class="message-name ${userNameClass}">
            ${rankImageHtml}<strong>${messageData.user}</strong> ${starHtml}
        </div>
      </div>
      <div class="message-text">${messageTextContent}</div>
      ${badgeHtml}
    </div>
    <div class="dots-options">
      <span class="dots">&#8226;&#8226;&#8226;</span>
      <div class="message-options-menu">
        <div class="option-item" data-action="quote">اقتباس</div> <div class="option-item" data-action="report">إبلاغ</div>
      </div>
    </div>
  `;

  const userAvatarDiv = messageItem.querySelector('.user-avatar');
  if (userAvatarDiv) {
      userAvatarDiv.addEventListener('click', (event) => {
          event.stopPropagation();

          const userData = {
              id: userAvatarDiv.dataset.userId,
              name: userAvatarDiv.dataset.userName,
              avatar: userAvatarDiv.dataset.userAvatar
          };
          createUserInfoModal(userAvatarDiv, userData, window.allUsersAndVisitorsData);
      });
  }


  const dotsOptionsDiv = messageItem.querySelector('.dots-options');
  if (dotsOptionsDiv) {
      dotsOptionsDiv.addEventListener('click', (event) => {
          event.stopPropagation();
          const menu = dotsOptionsDiv.querySelector('.message-options-menu');

          if (currentOpenMenu && currentOpenMenu !== menu) {
              currentOpenMenu.classList.remove('show-options');
          }

          menu.classList.toggle('show-options');

          if (menu.classList.contains('show-options')) {
              currentOpenMenu = menu;
          } else {
              currentOpenMenu = null;
          }

          if (currentOpenMenu) {
              document.addEventListener('click', function closeMenuOnOutsideClick(e) {
                  if (!dotsOptionsDiv.contains(e.target) && !menu.contains(e.target) && currentOpenMenu && currentOpenMenu.classList.contains('show-options')) {
                      currentOpenMenu.classList.remove('show-options');
                      currentOpenMenu = null;
                      document.removeEventListener('click', closeMenuOnOutsideClick);
                  } else if (!currentOpenMenu || !currentOpenMenu.classList.contains('show-options')) {
                      document.removeEventListener('click', closeMenuOnOutsideClick);
                  }
              });
          }
      });

      const optionItems = dotsOptionsDiv.querySelectorAll('.option-item');
      optionItems.forEach(item => {
          item.addEventListener('click', (event) => {
              event.stopPropagation();
              const action = event.target.dataset.action;

              const originalMessageText = messageData.text;
              const senderName = messageData.user;
              const messageId = messageData.id;

              console.log(`Action: ${action}`);

              if (action === 'quote') {
                  activeQuoteData = {
                      id: messageId,
                      senderName: senderName,
                      content: originalMessageText
                  };
                  displayActiveQuoteBubble(senderName, originalMessageText);
                  document.querySelector('#input-bar input').focus();

              } else if (action === 'report') {
                  alert(`سيتم الإبلاغ عن الرسالة: "${originalMessageText}"`);
              }

              const menu = dotsOptionsDiv.querySelector('.message-options-menu');
              menu.classList.remove('show-options');
              currentOpenMenu = null;
          });
      });
  }

  messageItem.addEventListener('dblclick', () => {
    const senderName = messageData.user;
    const content = messageData.text;

    activeQuoteData = {
      id: messageData.id,
      senderName: senderName,
      content: content
    };

    displayActiveQuoteBubble(senderName, content);
    document.querySelector('#input-bar input').focus();
  });

  return messageItem;
}

export function createSystemMessageElement(messageText) {
  const systemMessageItem = document.createElement('div');
  systemMessageItem.classList.add('system-message');
  systemMessageItem.innerHTML = `
    <div class="system-message-content">
      ${messageText}
    </div>
  `;
  return systemMessageItem;
}

export function addWelcomeMessageToChat(chatBoxElement) {
  const currentUserName = localStorage.getItem('chatUserName') || 'زائر';
  const welcomeMessageText = `مرحبًا بك يا ${currentUserName} في الدردشة! نتمنى لك وقتًا ممتعًا.`;
  const welcomeMessageElement = createSystemMessageElement(welcomeMessageText);
  chatBoxElement.appendChild(welcomeMessageElement);
}

export function updatePrivateButtonNotification(show) {
  const privateButton = document.querySelector('#top-bar .btn.private');
  if (privateButton) {
    if (show) {
      privateButton.classList.add('has-new-messages');
    } else {
      privateButton.classList.remove('has-new-messages');
    }
  }
}

export function updateTopBarButtonsVisibility(userRank) {
    const permissions = RANK_PERMISSIONS[userRank] || {};

    const reportButton = document.getElementById('reportButton');
    const privateChatButton = document.getElementById('privateChatButton');

    if (reportButton) {
        reportButton.style.display = permissions.canReport ? 'block' : 'none';
    }
    if (privateChatButton) {
        privateChatButton.style.display = permissions.canPrivateChat ? 'flex' : 'none';
    }
}
