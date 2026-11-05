import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// كلمة السر الخاصة بك للدخول على صندوق الوارد
const ADMIN_PIN = process.env.ADMIN_PIN || '1234';

// مسار حفظ الرسائل
const DATA_DIR = path.join(__dirname, 'data');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(MESSAGES_FILE)) {
  fs.writeFileSync(MESSAGES_FILE, JSON.stringify([], null, 2), 'utf-8');
}

function getMessages() {
  try {
    const data = fs.readFileSync(MESSAGES_FILE, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('خطأ في قراءة ملف الرسائل:', err);
    return [];
  }
}

function saveMessages(messages) {
  try {
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2), 'utf-8');
  } catch (err) {
    console.error('خطأ في حفظ ملف الرسائل:', err);
  }
}

// Middleware
app.use(express.json());
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'public')));

// Middleware للتحقق من كلمة السر
function requireAdminAuth(req, res, next) {
  const userPin = req.headers['x-admin-pin'] || req.query.pin;
  if (!userPin || userPin !== ADMIN_PIN) {
    return res.status(401).json({
      success: false,
      error: 'رمز المرور غير صحيح! غير مصرح لك بعرض الرسائل.'
    });
  }
  next();
}

// 1. استقبال رسالة جديدة مع الأفاتار والوسم
app.post('/api/send', (req, res) => {
  const { message, avatar, tag } = req.body;

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({
      success: false,
      error: 'الرجاء كتابة نص الرسالة أولاً.'
    });
  }

  const trimmed = message.trim();
  if (trimmed.length > 1200) {
    return res.status(400).json({
      success: false,
      error: 'الرسالة طويلة جداً (الحد الأقصى 1200 حرف).'
    });
  }

  const newMessage = {
    id: Date.now().toString(),
    text: trimmed,
    avatar: avatar || { emoji: '🚀', name: 'ريادي (Visionary)' },
    tag: tag || 'رسالة عامة',
    createdAt: new Date().toISOString(),
    formattedTime: new Date().toLocaleString('ar-EG', {
      dateStyle: 'medium',
      timeStyle: 'short'
    })
  };

  const messages = getMessages();
  messages.unshift(newMessage);
  saveMessages(messages);

  console.log(`📩 [رسالة جديدة من VG+]: ${newMessage.avatar.emoji} ${newMessage.avatar.name} - "${trimmed.substring(0, 35)}..."`);

  return res.json({
    success: true,
    message: 'تم إرسال رسالتك إلى فريق VG+ بنجاح وسرية تامة! 🌟'
  });
});

// 2. التحقق من صحة الرمز السري
app.post('/api/auth/verify', (req, res) => {
  const { pin } = req.body;
  if (pin === ADMIN_PIN) {
    return res.json({ success: true });
  }
  return res.status(401).json({ success: false, error: 'رمز المرور غير صحيح!' });
});

// 3. جلب الرسائل (محمي بكلمة سر)
app.get('/api/messages', requireAdminAuth, (req, res) => {
  const messages = getMessages();
  res.json({
    success: true,
    count: messages.length,
    messages
  });
});

// 4. حذف رسالة معينة
app.delete('/api/messages/:id', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  let messages = getMessages();
  messages = messages.filter(m => m.id !== id);
  saveMessages(messages);
  res.json({ success: true, message: 'تم حذف الرسالة بنجاح.' });
});

// 5. مسح جميع الرسائل
app.delete('/api/messages', requireAdminAuth, (req, res) => {
  saveMessages([]);
  res.json({ success: true, message: 'تم مسح كافة الرسائل بنجاح.' });
});

app.listen(PORT, () => {
  console.log(`🚀 خادم VG+ يعمل الآن على: http://localhost:${PORT}`);
  console.log(`🔒 الرمز السري لصندوق الوارد: ${ADMIN_PIN}`);
});
