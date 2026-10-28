# جَمعة (JAMAA) — منصة الألعاب الجماعية

## رابط واجهة الموقع
https://sha3lan1.github.io/phone-box-new/jamaa/

## لوحات وواجهات
- واجهة اللعب: `index.html`
- مصدر Edge Function وعمليات الإدارة: `supabase/functions/jamaa/index.ts`
- مخطط قاعدة البيانات: `supabase/schema.sql`

## أنواع QR
- الرئيسي: `https://sha3lan1.github.io/phone-box-new/jamaa/`
- الشباب: `?type=youth`
- البنات: `?type=girls`
- العائلة: `?type=family`

## الوظائف
- واجهة عربية للموبايل بهوية زيتية وذهبية.
- جلسات حسب النوع، إنشاء جلسة برمز، الانضمام من الهاتف، تصويت مباشر.
- ألعاب مبدئية: مافيا، برا السالفة، مين الأكثر احتمالًا، تحديات سريعة، تمثيل، معلومات عامة، مين أنا، وصراحة أو تحدّي.
- لوحة إدارة لتعديل نصوص الواجهة وصورتها وإدارة الألعاب وإنشاء QR.
- Supabase Postgres + Realtime + Storage لحفظ البيانات والتحديثات المباشرة.

## ملاحظة النشر
واجهة GitHub Pages تستخدم Supabase كمصدر للبيانات؛ عمليات الإدارة تذهب إلى Edge Function ضمن مشروع `jfnjrbusifhjzzaxvtvw`. تأكد أن GitHub Pages مفعّل للمستودع من Settings → Pages وأن الرابط أعلاه يفتح قبل طباعة البكجات.
