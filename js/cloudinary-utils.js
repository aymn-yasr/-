// js/cloudinary-utils.js

// ستحتاج إلى استبدال 'YOUR_CLOUD_NAME' و 'YOUR_UPLOAD_PRESET' بالقيم الفعلية الخاصة بك من Cloudinary.
const CLOUDINARY_CLOUD_NAME = 'dim8zh0fh'; // تم تحديث هذه القيمة
const CLOUDINARY_UPLOAD_PRESET = 'chat_app_profile_pics'; // تم تحديث هذه القيمة

// دالة لرفع صورة إلى Cloudinary
export async function uploadImageToCloudinary(file) {
    if (!file) {
        console.error("لم يتم تحديد ملف لرفعه.");
        return null;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("فشل رفع الصورة إلى Cloudinary:", errorData);
            throw new Error(errorData.error ? errorData.error.message : 'فشل الرفع');
        }

        const data = await response.json();
        console.log("تم رفع الصورة بنجاح:", data);
        // data.secure_url يحتوي على الرابط الآمن للصورة المرفوعة
        return data.secure_url;

    } catch (error) {
        console.error("حدث خطأ أثناء الاتصال بـ Cloudinary:", error);
        return null;
    }
}

// دالة لحذف صورة من Cloudinary
// ملاحظة هامة: الحذف الآمن يتطلب توقيعاً (signature) يتم إنشاؤه على الخادم (backend).
// لا يجب عليك كشف الـ API Secret الخاص بك في الكود الأمامي (frontend).
// هذا مجرد هيكل توضيحي. إذا كنت بحاجة إلى وظيفة حذف فعلية وآمنة، ستحتاج إلى إعداد خادم.
export async function deleteImageFromCloudinary(publicId) {
    // هذا الجزء هو مثال للمنطق الذي ستحتاج إليه على **الخادم الخلفي** (backend)
    // لاستخدام الـ API Secret وتوقيع طلب الحذف.
    // لا تنفذ هذا مباشرة في الواجهة الأمامية!
    console.warn("وظيفة حذف الصور من Cloudinary تتطلب تنفيذًا آمنًا على الخادم (backend) باستخدام التوقيع.");
    alert("وظيفة الحذف غير متاحة في الواجهة الأمامية لأسباب أمنية. الرجاء تنفيذها على الخادم.");
    return false; // فشل الحذف
}
