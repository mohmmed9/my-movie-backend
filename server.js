// استيراد المكتبات الضرورية (express, cors, firebase-admin, bcrypt)
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin'); 
const bcrypt = require('bcryptjs'); // <--- لاحظ إضافة js // لتشفير كلمات المرور

const app = express();
// يستخدم منفذ Render (الـ Process) أو 3001 محليًا
const port = process.env.PORT || 3001; 

// ====== تهيئة Firebase والاتصال بقاعدة البيانات ======
// هذا السطر يقرأ المفتاح السري من متغير البيئة الذي أنشأناه في Render
const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;
let db = null;

if (serviceAccountString) {
    try {
        // قراءة المتغير السري (JSON) وتحويله
        const serviceAccount = JSON.parse(serviceAccountString); 
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        db = admin.firestore(); // تعريف قاعدة البيانات
        console.log('Firebase initialized successfully!');
    } catch (error) {
        console.error('Failed to parse or initialize Firebase:', error);
    }
} else {
    // هذا سيظهر في السجلات إذا لم يتم إعداد متغير البيئة
    console.error('FIREBASE_SERVICE_ACCOUNT environment variable is not set. Database saving will fail.');
}
// =======================================================

// استخدام Middlewares
app.use(cors());
app.use(express.json());

// مسار رئيسي للتحقق من أن الخادم يعمل
app.get('/', (req, res) => {
    res.send('أهلاً بك، الخادم يعمل بشكل صحيح ومرتبط بـ Firebase!');
});

// مسار تسجيل المستخدم (POST /register) - لحفظ البيانات في Firestore
app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    if (!db) {
        return res.status(500).json({ message: 'فشل الاتصال بقاعدة البيانات. المفتاح السري مفقود.' });
    }

    try {
        // التحقق من وجود المستخدم مسبقًا
        const usersRef = db.collection('users');
        const userExists = await usersRef.where('email', '==', email).get();

        if (!userExists.empty) {
            return res.status(409).json({ message: 'هذا البريد الإلكتروني مسجل بالفعل.' });
        }

        // تشفير كلمة المرور (الأمان الأهم)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // حفظ المستخدم الجديد في Firestore
        const newUser = {
            username: username,
            email: email,
            password: hashedPassword, // حفظ الكلمة المشفرة
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        await usersRef.add(newUser);

        res.status(201).json({ 
            message: 'تهانينا! تم التسجيل بنجاح وتم حفظ بياناتك بشكل آمن.' 
        });

    } catch (error) {
        // إذا فشلت عملية الحفظ (مثلاً بسبب قواعد الأمان)
        console.error('Error during registration:', error);
        res.status(500).json({ message: 'حدث خطأ داخلي في الخادم أثناء عملية التسجيل.' });
    }
});

// تشغيل الخادم
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});