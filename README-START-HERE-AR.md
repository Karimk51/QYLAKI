# QYLAKI — ملف الرفع النهائي

بعد فك الضغط ستجد `package.json` و`client` و`server` في الجذر مباشرة. ارفع كل المحتويات إلى مجلد تطبيق Node.js.

```bash
pnpm install --frozen-lockfile
cp .env.example .env
# عدّل .env: DATABASE_URL وJWT_SECRET وبيانات OAuth/AI عند الحاجة
pnpm db:migrate
pnpm build
pnpm start
```

إعداد التطبيق: Node.js 20 أو 22، Startup file: `dist/index.js`، وApplication mode: Production.

اختبار الخدمة بعد التشغيل:

```bash
curl https://YOUR_DOMAIN/health
```

يجب أن تكون النتيجة: `{"status":"ok"}`.
