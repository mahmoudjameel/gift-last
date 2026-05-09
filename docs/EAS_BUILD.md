# بناء EAS وتثبيت الحزم

EAS يختار أداة التثبيت حسب ملف القفل الموجود في الجذر:

| الملف              | الأداة |
|--------------------|--------|
| `bun.lock` / `bun.lockb` | `bun install --frozen-lockfile` |
| `yarn.lock`        | `yarn install --frozen-lockfile` |
| `package-lock.json`| `npm ci` |

تم حذف **`bun.lock`** لأنه كان غير متزامن مع `package.json` (أخطاء frozen lockfile). المشروع يستخدم **`yarn.lock`** المحدَّث الذي يتضمن `firebase` و`expo-notifications` و`expo-device`.

إذا أردت العودة إلى Bun محلياً: نفّذ `bun install` ثم احرص على **commit** لـ `bun.lock` بعد التأكد أنه يطابق `package.json`، وإلا أعد حذف `bun.lock` قبل البناء على EAS أو ثبّت القفل بشكل صحيح.
