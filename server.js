// استيراد مكتبات Node.js الأساسية والمكتبات التي قمنا بتثبيتها
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin'); 
const bcrypt = require('bcryptjs'); // <-- الحل النهائي للتشفير
const fs = require('fs'); // <--- لقراءة الملفات (مفتاح سري)
const path = require('path'); // <--- للتعامل مع مسارات الملفات

const app = express();
// المنفذ الذكي (يستخدم منفذ Render أو 3001 محليًا)
const port = process.env.PORT || 3001; 

// ====== تهيئة Firebase والاتصال بقاعدة البيانات من الملف السري ======
let db = null;
const isRenderEnvironment = process.env.RENDER ? true : false;

// المسار المتوقع للملف السري على Render (الذي أنشأناه يدوياً)
// إذا كان في Render: المسار سيكون /etc/secrets/...
// إذا كان محليًا: سيحاول قراءة ملف محلي اسمه firebase_key.json (للتجربة)
const secretFilePath = isRenderEnvironment 
    ? path.join('/etc/secrets', 'firebase_key.json') 
    : path.join(__dirname, 'firebase_key.json');

try {
    const serviceAccountData = fs.readFileSync(secretFilePath, 'utf8');
    const serviceAccount = JSON.parse(serviceAccountData);
    
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    db = admin.firestore();
    console.log('Firebase initialized successfully from Secret File!');

} catch (error) {
    console.error('FIREBASE CONNECTION FAILED (Error in key or path):', error.message);
    if (!isRenderEnvironment) {
         console.warn('NOTE: This error is expected when running locally unless you place the JSON file in the root directory.');
    }
}
// =======================================================================

// استخدام Middlewares
app.use(cors());
app.use(express.json());

// مسار رئيسي للتحقق من أن الخادم يعمل
app.get('/', (req, res) => {
    res.send('أهلاً بك، الخادم يعمل بشكل صحيح ومرتبط بـ Firebase!');
});

// --- مسار جلب وعرض الأعمال (GET /api/works) ---
app.get('/api/works', async (req, res) => {
    if (!db) {
        return res.status(500).json({ message: 'فشل الاتصال بقاعدة البيانات. المفتاح السري مفقود.' });
    }
    
    try {
        const worksCollection = db.collection('works');
        const snapshot = await worksCollection.get();
        
        const works = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        res.json(works);

    } catch (error) {
        console.error('Error fetching works:', error);
        res.status(500).json({ message: 'حدث خطأ أثناء جلب الأعمال.' });
    }
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

        // تشفير كلمة المرور (الأمان)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // حفظ المستخدم الجديد في Firestore
// 4. إنشاء وحفظ المستخدم في Firestore
        const newUser = {
            username: username,
            email: email,
            password: hashedPassword, // حفظ الكلمة المشفرة
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        const docRef = await db.collection('users').add(newUser);

        // 5. إرسال رد ناجح للواجهة الأمامية
        res.status(201).json({ 
            message: 'تهانينا! تم التسجيل بنجاح وتم حفظ بياناتك بشكل آمن.' 
        });

    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ message: 'حدث خطأ داخلي في الخادم أثناء عملية التسجيل.' });
    }
}); // <--- (يغلق مسار /register)

// تشغيل الخادم
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
}); // <--- (يغلق ملف server.js)