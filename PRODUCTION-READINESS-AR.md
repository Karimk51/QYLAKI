# قائمة تشغيل الإنتاج — QYLAKI

## تم إصلاحه داخل الكود

- الخادم يقرأ `PORT` مباشرة ويربط على `0.0.0.0`، وهذا مناسب لـ Render وRailway وVPS.
- تمت إضافة `GET /health` لفحص الخدمة.
- تم إكمال `.env.example` بمتغيرات OAuth وAI وAnalytics والبريد والتقويم.
- أضيفت أوامر هجرة واضحة:
  - `pnpm db:generate` عند تعديل المخطط.
  - `pnpm db:migrate` أثناء النشر.
  - `pnpm db:push` أصبح ينفذ migrations الموجودة فقط ولا يولد migration جديدة تلقائيًا.
- أزيل fallback إلى خدمة Manus من مساعد AI؛ يجب تحديد endpoint وAPI key صراحة.
- تمت إضافة اختبار يمنع المستخدم العادي من الوصول إلى عمليات الإدارة.
- تمت إضافة `.gitignore` لمنع رفع `.env` و`node_modules` و`dist`.
- تمت إضافة canonical وOpen Graph وTwitter وhreflang وSitemap مطلق.

## ما يجب تعبئته قبل النشر

1. استبدل `qylaki.com` في `client/index.html` و`sitemap.xml` و`robots.txt` باسم نطاقك الحقيقي.
2. أنشئ OAuth application وسجل callback:

```text
https://YOUR_DOMAIN/api/oauth/callback
```

3. املأ `VITE_APP_ID` و`OAUTH_SERVER_URL` و`OWNER_OPEN_ID` و`VITE_OAUTH_PORTAL_URL`.
4. للذكاء الاصطناعي، استخدم endpoint وAPI key يملكهما العميل أو صاحب الموقع:
   - `BUILT_IN_FORGE_API_URL`
   - `BUILT_IN_FORGE_API_KEY`
5. أنشئ MySQL واضبط `DATABASE_URL` و`JWT_SECRET`.
6. إذا أردت البريد، اضبط `RESEND_API_KEY` و`BOOKING_FROM_EMAIL` وتحقق من SPF/DKIM.
7. إذا أردت Google Calendar، اضبط `GOOGLE_CALENDAR_ID` وبيانات التكامل المناسبة.

## فحص النشر

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm db:migrate
pnpm build
pnpm start
curl http://127.0.0.1:$PORT/health
```

يجب أن تعيد health endpoint:

```json
{"status":"ok"}
```

## ملاحظة مهمة

لن أضع مفاتيح حقيقية داخل المشروع. عدم تعبئة OAuth أو AI أو البريد لا يمنع بناء الواجهة، لكنه يعطل الوظيفة المرتبطة بالمفتاح حتى تضيف بيانات مزودك.
