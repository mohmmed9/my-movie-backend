// استيراد المكتبات
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin'); 
const bcrypt = require('bcryptjs'); // تأكد من أنها bcryptjs
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3001;

// ====== تهيئة Firebase ======
// قراءة الملف السري سواء محلياً أو على سيرفر Render
const secretFilePath = process.env.RENDER ? path.join('/etc/secrets', 'firebase_key.json') : path.join(__dirname, 'firebase_key.json');
let db = null;

try {
    if (fs.existsSync(secretFilePath)) {
        const serviceAccountData = fs.readFileSync(secretFilePath, 'utf8');
        const serviceAccount = JSON.parse(serviceAccountData);
        
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        db = admin.firestore();
        console.log('Firebase initialized successfully!');
    } else {
        // محاولة القراءة من متغير البيئة كخطة بديلة
        const envVar = process.env.FIREBASE_SERVICE_ACCOUNT;
        if(envVar) {
             admin.initializeApp({ credential: admin.credential.cert(JSON.parse(envVar)) });
             db = admin.firestore();
             console.log('Firebase initialized from ENV variable!');
        } else {
             console.error('Firebase Key not found!');
        }
    }
} catch (error) {
    console.error('Firebase Error:', error.message);
}
// ==========================

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Server is running with Login feature!');
});

// --- 1. مسار جلب الأعمال (للعرض) ---
app.get('/api/works', async (req, res) => {
    if (!db) return res.status(500).json({ message: 'Database Error' });
    try {
        const snapshot = await db.collection('works').get();
        const works = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(works);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching works' });
    }
});

// --- 2. مسار إنشاء حساب (Register) ---
app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!db) return res.status(500).json({ message: 'Database Error' });

    try {
        const usersRef = db.collection('users');
        const userExists = await usersRef.where('email', '==', email).get();

        if (!userExists.empty) {
            return res.status(409).json({ message: 'البريد الإلكتروني مستخدم بالفعل.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await usersRef.add({
            username,
            email,
            password: hashedPassword,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.status(201).json({ message: 'تم إنشاء الحساب بنجاح! يمكنك تسجيل الدخول الآن.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'حدث خطأ أثناء التسجيل.' });
    }
});

// --- 3. مسار تسجيل الدخول (Login) - (جديد!) ---
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    if (!db) return res.status(500).json({ message: 'Database Error' });

    try {
        // 1. البحث عن المستخدم بالإيميل
        const usersRef = db.collection('users');
        const snapshot = await usersRef.where('email', '==', email).get();

        if (snapshot.empty) {
            return res.status(400).json({ message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' });
        }

        // 2. التحقق من كلمة المرور
        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();
        
        // مقارنة الكلمة المدخلة مع الكلمة المشفرة في قاعدة البيانات
        const isMatch = await bcrypt.compare(password, userData.password);

        if (!isMatch) {
            return res.status(400).json({ message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' });
        }

        // 3. نجاح الدخول
        res.json({ 
            message: `أهلاً بك مجدداً، ${userData.username}!`,
            username: userData.username
        });

    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: 'حدث خطأ أثناء تسجيل الدخول.' });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
