// js/chat-firestore.js
import { db, serverTimestamp } from './firebase-config.js';
import { updatePrivateButtonNotification, createMessageElement, createSystemMessageElement, addWelcomeMessageToChat, activeQuoteData, hideActiveQuoteBubble } from './chat-ui.js';
import { RANK_ORDER } from './constants.js';

let isFirstSnapshot = true; 

export function setupRealtimeMessagesListener(roomId) {
  const chatBox = document.querySelector('#chat-box .chat-box');
  if (!chatBox) {
    console.error('Chat box element not found!');
    return;
  }

  if (isFirstSnapshot) {
    chatBox.innerHTML = '<div style="text-align: center; padding: 20px; color: #888;"></div>';
  }

  db.collection('rooms').doc(roomId).collection('messages').orderBy('timestamp', 'asc').onSnapshot(async snapshot => {
    if (isFirstSnapshot) {
      const loadingMessageDiv = chatBox.querySelector('div');
      if (loadingMessageDiv && loadingMessageDiv.textContent === 'جاري تحميل الرسائل...') {
        chatBox.innerHTML = '';
      }
    }

    if (snapshot.empty && isFirstSnapshot) {
      chatBox.innerHTML = '<div style="text-align: center; padding: 20px; color: #888;"></div>';
    }

    const userLookups = {}; 
    const senderIdsToLookup = new Set(); 
    snapshot.docChanges().forEach(change => {
      const messageData = change.doc.data();
      if (messageData.type !== 'private' && messageData.senderId) {
        senderIdsToLookup.add(messageData.senderId);
      }
    });

    const lookupPromises = Array.from(senderIdsToLookup).map(async (senderId) => {
      const userDoc = await db.collection('users').doc(senderId).get();
      if (userDoc.exists) {
        userLookups[senderId] = {
          type: 'registered',
          rank: userDoc.data().rank || 'عضو',
          level: userDoc.data().level || 1 // **تم إضافة هذا السطر**
        };
      } else {
        const visitorDoc = await db.collection('visitors').doc(senderId).get();
        if (visitorDoc.exists) {
          userLookups[senderId] = {
            type: 'visitor',
            rank: visitorDoc.data().rank || 'زائر',
            level: null // **الزائر لا يملك مستوى**
          };
        } else {
          userLookups[senderId] = {
            type: 'unknown',
            rank: 'زائر',
            level: null
          };
        }
      }
    });
    await Promise.all(lookupPromises); 

    snapshot.docChanges().forEach(change => {
      const messageData = { id: change.doc.id, ...change.doc.data() };

      if (messageData.type === 'private') {
        return;
      }

      messageData.userType = userLookups[messageData.senderId] ? userLookups[messageData.senderId].type : 'unknown';
      messageData.senderRank = userLookups[messageData.senderId] ? userLookups[messageData.senderId].rank : 'زائر';
      messageData.level = userLookups[messageData.senderId] ? userLookups[messageData.senderId].level : null; // **تم إضافة هذا السطر**

      const existingMessageElement = chatBox.querySelector(`[data-id="${messageData.id}"]`);

      if (change.type === 'added') {
        if (!existingMessageElement) {
          const messageElement = messageData.type === 'system'
            ? createSystemMessageElement(messageData.text)
            : createMessageElement(messageData); 
          chatBox.appendChild(messageElement);
        }
      } else if (change.type === 'modified') {
        if (existingMessageElement) {
          existingMessageElement.remove();
        }

        const messageElement = messageData.type === 'system'
          ? createSystemMessageElement(messageData.text)
          : createMessageElement(messageData);

        chatBox.appendChild(messageElement);
        console.log(`تم تحديث الرسالة ID: ${messageData.id} وإعادة عرضها.`);

      } else if (change.type === 'removed') {
        if (existingMessageElement) {
          existingMessageElement.remove();
          console.log(`تم حذف الرسالة ID: ${messageData.id}`);
        }
      }
    });

    setTimeout(() => {
      if (chatBox) {
        if (chatBox.scrollHeight > chatBox.clientHeight) {
          chatBox.scrollTop = chatBox.scrollHeight;
        }
      }
    }, 100);

    isFirstSnapshot = false;

  }, error => {
    console.error('حدث خطأ أثناء الاستماع للرسائل:', error);
    chatBox.innerHTML = '<div style="text-align: center; padding: 20px; color: red;">فشل تحميل الرسائل. يرجى التحقق من اتصالك بالإنترنت أو قواعد البيانات.</div>';
  });
}

// **وظيفة جديدة لتحديث نقاط الخبرة والمستوى للمستخدم**
// ...
export async function updateUserExperience(userId) {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    // **الشرط الجديد: التحقق من وجود المستخدم المسجل فقط**
    if (userDoc.exists) {
        const userData = userDoc.data();
        
        // **الشرط الجديد داخل الدالة: يجب أن يكون المستخدم مسجلاً**
        if (userData.userType === 'registered') {
            let { level, totalExp, currentExp, expToNextLevel } = userData;

            // 1. زيادة نقاط الخبرة
            const expGain = 10;
            currentExp = (currentExp || 0) + expGain;
            totalExp = (totalExp || 0) + expGain;
            
            level = level || 1;
            expToNextLevel = expToNextLevel || 200;

            // 2. التحقق من إمكانية رفع المستوى
            if (currentExp >= expToNextLevel) {
                level++;
                currentExp = currentExp - expToNextLevel;
                expToNextLevel = 200 + (level * 100);

                console.log(`تم رفع مستوى المستخدم ${userData.username} إلى المستوى ${level}!`);
            }

            // 3. حفظ البيانات الجديدة في Firestore
            await userRef.update({
                level: level,
                totalExp: totalExp,
                currentExp: currentExp,
                expToNextLevel: expToNextLevel,
            });

            return { level, totalExp, currentExp, expToNextLevel };
        }
        
    }
    return null;
}

// **دالة sendMessage معدلة لاستدعاء updateUserExperience وإضافة حقل المستوى**
export async function sendMessage(messageText, roomId) {
  if (!messageText || messageText.trim() === '') {
    if (!activeQuoteData) {
      return;
    }
  }

  const currentUserName = localStorage.getItem('chatUserName');
  const currentUserId = localStorage.getItem('chatUserId');
  const currentUserAvatar = localStorage.getItem('chatUserAvatar');

  if (!currentUserName || !currentUserId) {
    console.error('لا يوجد اسم مستخدم أو معرف مستخدم مخزن. يرجى تسجيل الدخول أولاً.');
    alert('الرجاء تسجيل الدخول لإرسال الرسائل.');
    return;
  }

  // **هذه الأسطر الجديدة لجلب بيانات المستخدم قبل إرسال الرسالة**
  const userDoc = await db.collection('users').doc(currentUserId).get();
  const userData = userDoc.exists ? userDoc.data() : {};
  const currentUserRank = userData.rank || 'زائر';
  const currentUserLevel = userData.level || 1;
  
  // تحديث نقاط الخبرة والمستوى قبل إرسال الرسالة
  await updateUserExperience(currentUserId);

  const newMessage = {
    user: currentUserName,
    senderId: currentUserId,
    avatar: currentUserAvatar,
    text: messageText.trim(),
    type: 'chat',
    timestamp: serverTimestamp(),
    userNum: '100',
    senderRank: currentUserRank,
    level: currentUserLevel // **تم إضافة هذا السطر**
  };

  if (activeQuoteData) {
    newMessage.quoted = {
      senderName: activeQuoteData.senderName,
      content: activeQuoteData.content
    };
  }

  try {
    await db.collection('rooms').doc(roomId).collection('messages').add(newMessage);
    console.log('تم إرسال الرسالة العامة بنجاح!');
    hideActiveQuoteBubble();
  } catch (e) {
    console.error('خطأ في إرسال الرسالة العامة: ', e);
    alert('فشل إرسال الرسالة العامة. يرجى المحاولة مرة أخرى.');
  }
}

async function getAllUsersAndVisitors() {
    const onlineUsers = new Map();

    const usersSnapshot = await db.collection('users').get();
    usersSnapshot.forEach(doc => {
        const userData = doc.data();
        onlineUsers.set(doc.id, {
            id: doc.id,
            name: userData.username,
            avatar: userData.avatar || 'https://i.imgur.com/Uo9V2Yx.png',
            innerImage: userData.innerImage || 'images/Interior.png', 
            rank: userData.rank || 'عضو'
        });
    });

    const visitorsSnapshot = await db.collection('visitors').get();
    visitorsSnapshot.forEach(doc => {
        const visitorData = doc.data();
        if (!onlineUsers.has(doc.id)) {
            onlineUsers.set(doc.id, {
                id: doc.id,
                name: visitorData.name,
                avatar: visitorData.avatar || 'https://i.imgur.com/Uo9V2Yx.png',
                innerImage: visitorData.innerImage || 'images/Interior.png', 
                rank: visitorData.rank || 'زائر'
            });
        }
    });

    return Array.from(onlineUsers.values());
}

export { getAllUsersAndVisitors };

export async function getUserData(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
            return { id: userDoc.id, ...userDoc.data() };
        } else {
            console.log("لم يتم العثور على المستخدم:", userId);
            const visitorDoc = await db.collection('visitors').doc(userId).get();
            if (visitorDoc.exists) {
                return { id: visitorDoc.id, ...visitorDoc.data() };
            }
            return null;
        }
    } catch (error) {
        console.error("خطأ في جلب بيانات المستخدم:", error);
        return null;
    }
}

export async function updateUserData(userId, dataToUpdate) {
    try {
        const userDocRef = db.collection('users').doc(userId);
        await userDocRef.update(dataToUpdate);
        console.log("User data updated successfully:", dataToUpdate);
        if (dataToUpdate.innerImage !== undefined) {
            if (dataToUpdate.innerImage === null || dataToUpdate.innerImage === firebase.firestore.FieldValue.delete()) {
                localStorage.removeItem('chatUserInnerImage');
            } else {
                localStorage.setItem('chatUserInnerImage', dataToUpdate.innerImage);
            }
        }
    } catch (error) {
        console.error("خطأ في تحديث بيانات المستخدم/الزائر:", error);
        return false;
    }
}

// **دالة جديدة لتحديث المستوى يدوياً وإعادة حساب نقاط الخبرة**
export async function manuallyUpdateUserLevel(userId, newLevel) {
    if (newLevel < 1) {
        console.error("المستوى الجديد يجب أن يكون أكبر من أو يساوي 1.");
        return;
    }

    const userRef = db.collection('users').doc(userId);
    try {
        await userRef.update({
            level: newLevel,
            currentExp: 0,
            expToNextLevel: 200 + (newLevel * 100)
        });
        console.log(`تم تحديث مستوى المستخدم ${userId} يدوياً إلى المستوى ${newLevel} بنجاح!`);
    } catch (error) {
        console.error("خطأ في تحديث المستوى يدوياً:", error);
    }
}

export function getPrivateChatId(userId1, userId2) {
    return [userId1, userId2].sort().join('_');
}

export async function sendPrivateMessage(senderId, senderName, senderAvatar, receiverId, messageText, quotedData = null) {
    if (!messageText || messageText.trim() === '') {
        return;
    }

    const chatId = getPrivateChatId(senderId, receiverId);

    const newMessage = {
        senderId: senderId,
        senderName: senderName,
        senderAvatar: senderAvatar,
        receiverId: receiverId,
        text: messageText.trim(),
        timestamp: serverTimestamp(),
        type: 'private',
    };

    if (quotedData) {
        newMessage.quoted = quotedData;
    }

    try {
        await db.collection('privateChats').doc(chatId).collection('messages').add(newMessage);

        await db.collection('privateChats').doc(chatId).set({
            senderId: senderId,
            receiverId: receiverId,
            lastMessageTimestamp: serverTimestamp()
        }, { merge: true }); 

        console.log(`تم إرسال رسالة خاصة في المحادثة ${chatId} بنجاح!`);
    } catch (e) {
        console.error('خطأ في إرسال الرسالة الخاصة: ', e);
        alert('فشل إرسال الرسالة الخاصة.');
    }
}

export function setupPrivateMessagesListener(currentUserId, targetUserId, messagesBoxElement, clearPrevious = true) {
    if (clearPrevious) {
        messagesBoxElement.innerHTML = '<div style="text-align: center; padding: 20px; color: #888;">جاري تحميل الرسائل الخاصة...</div>';
    }

    const chatId = getPrivateChatId(currentUserId, targetUserId);
    console.log(`جارٍ الاستماع إلى الرسائل الخاصة في المحادثة: ${chatId}`);

    if (messagesBoxElement._privateChatUnsubscribe) {
        messagesBoxElement._privateChatUnsubscribe();
        messagesBoxElement._privateChatUnsubscribe = null;
    }

    let isFirstPrivateSnapshot = true;

    const unsubscribe = db.collection('privateChats')
        .doc(chatId)
        .collection('messages')
        .orderBy('timestamp', 'asc')
        .onSnapshot(snapshot => {
            if (isFirstPrivateSnapshot) {
                messagesBoxElement.innerHTML = '';
                if (snapshot.empty) {
                    messagesBoxElement.innerHTML = '<div style="text-align: center; padding: 20px; color: #888;"></div>';
                }
                isFirstPrivateSnapshot = false;
            }

            snapshot.docChanges().forEach(change => {
                const messageData = change.doc.data();
                const isSentByMe = messageData.senderId === currentUserId;

                messageData.id = change.doc.id;

                if (change.type === 'added') {
                    const existingMessageElement = messagesBoxElement.querySelector(`.private-message-item[data-id="${messageData.id}"]`);
                    if (!existingMessageElement) {
                        const messageElement = document.createElement('div');
                        messageElement.classList.add('private-message-item');
                        messageElement.setAttribute('data-id', messageData.id);
                        if (isSentByMe) {
                            messageElement.classList.add('sent');
                        } else {
                            messageElement.classList.add('received');
                        }
                        messageElement.textContent = messageData.text;
                        messagesBoxElement.appendChild(messageElement);
                    }
                } else if (change.type === 'modified') {
                    const existingPrivateMessage = messagesBoxElement.querySelector(`.private-message-item[data-id="${messageData.id}"]`);
                    if (existingPrivateMessage) {
                        existingPrivateMessage.textContent = messageData.text;
                        console.log(`تم تحديث الرسالة الخاصة ID: ${messageData.id}`);
                    }
                } else if (change.type === 'removed') {
                    const existingPrivateMessage = messagesBoxElement.querySelector(`.private-message-item[data-id="${messageData.id}"]`);
                    if (existingPrivateMessage) {
                        existingPrivateMessage.remove();
                        console.log(`تم حذف الرسالة الخاصة ID: ${messageData.id}`);
                    }
                }
            });

            // هذا هو الجزء الذي يحل المشكلة
            messagesBoxElement.scrollTop = messagesBoxElement.scrollHeight;
        }, error => {
            console.error("Error getting private messages: ", error);
            messagesBoxElement.innerHTML = '<div style="text-align: center; padding: 20px; color: red;">فشل تحميل الرسائل الخاصة.</div>';
        });

    messagesBoxElement._privateChatUnsubscribe = unsubscribe;
}

export async function getPrivateChatContacts(currentUserId) {
    const contacts = new Map();

    const senderSnapshot = await db.collection('privateChats')
        .where('senderId', '==', currentUserId)
        .get();

    senderSnapshot.forEach(doc => {
        const data = doc.data();
        const targetUserId = data.receiverId;
        if (targetUserId && targetUserId !== currentUserId) {
            contacts.set(targetUserId, { id: targetUserId });
        }
    });

    const receiverSnapshot = await db.collection('privateChats')
        .where('receiverId', '==', currentUserId)
        .get();

    receiverSnapshot.forEach(doc => {
        const data = doc.data();
        const targetUserId = data.senderId;
        if (targetUserId && targetUserId !== currentUserId) {
            contacts.set(targetUserId, { id: targetUserId });
        }
    });

    const contactDetailsPromises = Array.from(contacts.keys()).map(async (userId) => {
        let userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
            return { id: userId, name: userDoc.data().username, avatar: userDoc.data().avatar };
        } else {
            userDoc = await db.collection('visitors').doc(userId).get();
            if (userDoc.exists) {
                return { id: userId, name: userDoc.data().name, avatar: userDoc.data().avatar };
            }
        }
        return null;
    });

    const detailedContacts = await Promise.all(contactDetailsPromises);
    return detailedContacts.filter(contact => contact !== null);
}
