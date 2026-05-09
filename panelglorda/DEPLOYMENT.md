# Glorda - دليل النشر والتشغيل

## نظرة عامة

غلوردا هي منصة تجارة إلكترونية متعددة المستأجرين مبنية باستخدام React و Express و PostgreSQL.

## متطلبات النظام

- Node.js 18+ أو 20+
- PostgreSQL 14+
- npm أو yarn

## التقنيات المستخدمة

### الواجهة الأمامية (Frontend)
- React 19 + TypeScript
- Vite (أداة البناء)
- TailwindCSS (التنسيق)
- shadcn/ui + Radix UI (مكونات الواجهة)
- TanStack Query (إدارة البيانات)
- React Hook Form + Zod (النماذج والتحقق)
- Wouter (التوجيه)

### الواجهة الخلفية (Backend)
- Node.js + Express
- express-session + connect-pg-simple (إدارة الجلسات)
- Passport.js (المصادقة)
- bcryptjs (تشفير كلمات المرور)
- Multer (رفع الملفات)

### قاعدة البيانات
- PostgreSQL
- Drizzle ORM
- drizzle-zod (التحقق من البيانات)

## خطوات التثبيت

### 1. استنساخ المشروع

```bash
git clone <repository-url>
cd glorda
```

### 2. تثبيت التبعيات

```bash
npm install
```

### 3. إعداد متغيرات البيئة

انسخ ملف `.env.example` إلى `.env`:

```bash
cp .env.example .env
```

عدّل الملف `.env` بالقيم الصحيحة:

```env
# قاعدة البيانات (مطلوب)
DATABASE_URL=postgresql://username:password@localhost:5432/glorda

# مفتاح الجلسات (مطلوب للإنتاج)
SESSION_SECRET=your-super-secret-key-here

# إعدادات الخادم
PORT=5000
NODE_ENV=production
```

### 4. إعداد قاعدة البيانات

إنشاء قاعدة البيانات:

```bash
createdb glorda
```

تطبيق الجداول:

```bash
npm run db:push
```

### 5. بناء المشروع

```bash
npm run build
```

### 6. تشغيل المشروع

```bash
npm start
```

التطبيق سيعمل على: `http://localhost:5000`

## هيكل المشروع

```
glorda/
├── client/                 # الواجهة الأمامية (React)
│   ├── src/
│   │   ├── components/    # مكونات UI
│   │   ├── pages/         # صفحات التطبيق
│   │   ├── hooks/         # React hooks
│   │   └── lib/           # أدوات مساعدة
├── server/                 # الواجهة الخلفية (Express)
│   ├── index.ts           # نقطة الدخول
│   ├── routes.ts          # مسارات API
│   └── storage.ts         # طبقة قاعدة البيانات
├── shared/                 # كود مشترك
│   └── schema.ts          # مخطط قاعدة البيانات
├── uploads/               # مجلد الملفات المرفوعة
└── dist/                  # ملفات البناء
```

## الأوامر المتاحة

| الأمر | الوصف |
|-------|-------|
| `npm run dev` | تشغيل بيئة التطوير |
| `npm run build` | بناء المشروع للإنتاج |
| `npm start` | تشغيل الخادم (الإنتاج) |
| `npm run db:push` | تحديث قاعدة البيانات |
| `npm run db:studio` | فتح واجهة Drizzle Studio |

## نقاط API الرئيسية

### المصادقة
- `POST /api/auth/register` - تسجيل تاجر جديد
- `POST /api/auth/login/merchant` - دخول التاجر
- `POST /api/auth/login/admin` - دخول المسؤول
- `POST /api/auth/logout` - تسجيل الخروج
- `GET /api/auth/me` - معلومات المستخدم الحالي

### التاجر
- `GET /api/merchant/profile` - الملف الشخصي
- `PATCH /api/merchant/profile` - تحديث الملف الشخصي
- `GET /api/merchant/products` - المنتجات
- `GET /api/merchant/orders` - الطلبات
- `GET /api/merchant/transactions` - المعاملات

### المسؤول
- `GET /api/admin/merchants` - قائمة التجار
- `GET /api/admin/orders` - جميع الطلبات
- `GET /api/admin/transactions` - جميع المعاملات

## ملاحظات للإنتاج

### 1. تخزين الملفات
حالياً يتم تخزين الملفات محلياً في مجلد `uploads/`. للإنتاج، يُنصح باستخدام:
- AWS S3
- Cloudinary
- أي خدمة تخزين سحابية

### 2. خدمة البريد الإلكتروني
لتفعيل إرسال رموز OTP، أضف:
- SendGrid
- Resend
- أي خدمة SMTP

### 3. الأمان
- استخدم HTTPS في الإنتاج
- قم بتعيين `SESSION_SECRET` قوي
- فعّل جدار الحماية

### 4. النسخ الاحتياطي
- قم بعمل نسخ احتياطي دوري لقاعدة البيانات
- احتفظ بنسخة من مجلد `uploads/`

## استكشاف الأخطاء

### خطأ في الاتصال بقاعدة البيانات
تأكد من:
- قاعدة البيانات تعمل
- `DATABASE_URL` صحيح
- الصلاحيات كافية

### مشاكل الجلسات
تأكد من:
- `SESSION_SECRET` معيّن
- الكوكيز مفعلة في المتصفح

### أخطاء رفع الملفات
تأكد من:
- مجلد `uploads/` موجود وقابل للكتابة
- حجم الملف لا يتجاوز 5MB

## الدعم

للمساعدة أو الإبلاغ عن مشاكل، تواصل عبر [contact@glorda.com]
