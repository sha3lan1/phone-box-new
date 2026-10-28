# جَمعة (JAMAA) — منصة الألعاب الجماعية

## الموقع المباشر
https://jfnjrbusifhjzzaxvtvw.supabase.co/functions/v1/jamaa

لوحة الإدارة:
https://jfnjrbusifhjzzaxvtvw.supabase.co/functions/v1/jamaa?admin=1

## محتويات هذا المجلد
- `index.html`: صفحة دخول خفيفة تعيد توجيه الزائر إلى الموقع المنشور.
- `supabase/functions/jamaa/index.ts`: مصدر Edge Function التي تقدّم واجهة اللعب ولوحة الإدارة وعمليات الموقع.
- `supabase/schema.sql`: مخطط قاعدة البيانات والسياسات الأساسية.

## الوظائف
- تصميم عربي متجاوب للموبايل بهوية زيتية وذهبية.
- اختيار جلسة شباب أو بنات أو عائلة.
- إنشاء جلسة برمز أو الانضمام إليها.
- تصويت جماعي وتحديثات مباشرة للأصوات والمشاركين.
- ألعاب مبدئية: مافيا، برا السالفة، مين الأكثر احتمالًا، تحديات سريعة، تمثيل، معلومات عامة، مين أنا، وصراحة أو تحدي.
- لوحة الإدارة تعدّل نصوص الصفحة وصورتها، وتدير الألعاب وتولّد QR لكل نوع جلسة.

## QR للبكجات
- الشباب: `https://jfnjrbusifhjzzaxvtvw.supabase.co/functions/v1/jamaa?type=youth`
- البنات: `https://jfnjrbusifhjzzaxvtvw.supabase.co/functions/v1/jamaa?type=girls`
- العائلة: `https://jfnjrbusifhjzzaxvtvw.supabase.co/functions/v1/jamaa?type=family`

## النشر والإعداد
الموقع المنشور يعمل عبر Supabase Edge Functions، والبيانات محفوظة في Supabase Postgres وStorage. عند نشر تعديل جديد، انشر الدالة باسم `jamaa` على مشروع `jfnjrbusifhjzzaxvtvw` مع `verify_jwt = false` لأن واجهة اللاعبين عامة.

لا تضع مفتاح `service_role` في الواجهة أو في ملفات GitHub العامة. ملف المصدر الموجود هنا يستخدم قيمة placeholder لرمز إدارة الخادم؛ حافظ على رمز الإدارة كإعداد سري في بيئة النشر عند تجهيز نسخة إنتاجية جديدة.

سياسات قاعدة البيانات مفعّلة. قبل الإطلاق التجاري الواسع، يستحسن تقوية قواعد الانضمام للجلسات والتصويت والتحقق من صلاحيات المضيف على الخادم.
