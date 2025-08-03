// js/constants.js

export const RANK_ORDER = [
  "المالك",
  "اونر اداري",
  "اونر",
  "سوبر اداري",
  "مشرف",
  "سوبر ادمن",
  "ادمن",
  "بريميوم",   // رتبة جديدة
  "بلاتينيوم", // رتبة جديدة
  "ملكي",     // رتبة جديدة
  "ذهبي",     // رتبة جديدة
  "برونزي",    // رتبة جديدة
  "عضو",
  "زائر"
];

export const RANK_IMAGE_MAP = {
  "المالك": "rank_images/owner.png",
  "اونر اداري": "rank_images/owner_admin.png",
  "اونر": "rank_images/owner2.png",
  "سوبر اداري": "rank_images/super_admin.png",
  "مشرف": "rank_images/supervisor.png",
  "سوبر ادمن": "rank_images/super_admn.png",
  "ادمن": "rank_images/admin.png",
  "بريميوم": "rank_images/premium.png",
  "بلاتينيوم": "rank_images/platinum.png",
  "ملكي": "rank_images/royal.png",
  "ذهبي": "rank_images/gold.png",
  "برونزي": "rank_images/bronze.png",
  "عضو": "rank_images/member.png",
  "زائر": "rank_images/guest.png",
};

// تعريف الصلاحيات لكل رتبة
// كل رتبة ستحدد الأزرار التي يجب أن تكون مرئية (true) أو مخفية (false) لها.
export const RANK_PERMISSIONS = {
    "المالك": {
        canSeeReportButton: true,
        canSeePrivateChatButton: true
    },
    "اونر اداري": {
        canSeeReportButton: true,
        canSeePrivateChatButton: true
    },
    "اونر": {
        canSeeReportButton: true,
        canSeePrivateChatButton: true
    },
    "سوبر اداري": {
        canSeeReportButton: true,
        canSeePrivateChatButton: true
    },
    "مشرف": {
        canSeeReportButton: true,
        canSeePrivateChatButton: true
    },
    "سوبر ادمن": {
        canSeeReportButton: true,
        canSeePrivateChatButton: true
    },
    "ادمن": {
        canSeeReportButton: true,
        canSeePrivateChatButton: true
    },
    "بريميوم": {
        canSeeReportButton: false, // لا يرى زر البلاغ
        canSeePrivateChatButton: true
    },
    "بلاتينيوم": {
        canSeeReportButton: false, // لا يرى زر البلاغ
        canSeePrivateChatButton: true
    },
    "ملكي": {
        canSeeReportButton: false, // لا يرى زر البلاغ
        canSeePrivateChatButton: true
    },
    "ذهبي": {
        canSeeReportButton: false, // لا يرى زر البلاغ
        canSeePrivateChatButton: true
    },
    "برونزي": {
        canSeeReportButton: false, // لا يرى زر البلاغ
        canSeePrivateChatButton: true
    },
    "عضو": {
        canSeeReportButton: false, // لا يرى زر البلاغ
        canSeePrivateChatButton: true
    },
    "زائر": {
        canSeeReportButton: false,    // لا يرى زر البلاغ
        canSeePrivateChatButton: false // لا يرى زر الخاص
    }
};