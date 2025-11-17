// 1. استدعاء المكتبات التي قمنا بتثبيتها
const express = require('express');
const cors = require('cors');

// 2. تشغيل التطبيق
const app = express();
const port = process.env.PORT || 3001; // المنفذ الذي نعمل عليه

// 3. إعدادات وسيطة (Middleware)
app.use(cors()); // للسماح بالطلبات من مواقع أخرى (مثل Netlify)
app.use(express.json()); // للسماح بقراءة بيانات JSON القادمة من الواجهة

// 4. المسار الرئيسي (للترحيب)
// http://localhost:3001/
app.get('/', (req, res) => {
  res.send('أهلاً بك، الخادم يعمل بشكل صحيح!');
});

// 5. مسار استقبال بيانات التسجيل (من النافذة المنبثقة)
// http://localhost:3001/register
app.post('/register', (req, res) => {
    // "req.body" يحتوي على البيانات التي أرسلتها الواجهة الأمامية
    const { username, email, password } = req.body;

    // --- (للتجربة فقط) ---
    // سنقوم بطباعة البيانات في شاشة الأوامر (PowerShell)
    // لنتأكد أنها وصلت
    console.log('--- بيانات مستخدم جديد وصلت! ---');
    console.log('اسم المستخدم:', username);
    console.log('الإيميل:', email);
    console.log('----------------------------------');

    // --- الرد على الواجهة الأمامية ---
    // سنرسل رسالة نجاح
    res.json({ message: 'تم التسجيل بنجاح!' });
});

// 6. تشغيل الخادم
app.listen(port, () => {
  console.log(`تم تشغيل الخادم بنجاح على http://localhost:${port}`);
});


// --- نهاية الملف ---
