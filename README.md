# Domain Opportunity Engine

מערכת אוטומטית ל**דומיינים לקנייה עכשיו**: המשתמש בוחר סיומות ותקציב, כותב פקודה חופשית,
ומקבל רק דומיינים שאומתה עבורם אפשרות קנייה מיידית — מימוש **MVP פונקציונלי** של האפיון (PRD **v2.0**).

> **"Domains to buy now"** — the user picks TLDs + budget, types a free-text command, and gets only
> domains verified purchasable right now. No expiry monitoring, Pending Delete, auctions or Backorder.
> Functional front-end MVP over a deterministic simulated engine (RDAP/registrars/payments are mocked,
> Sandbox — **no real purchases**).

🔗 **דמו חי / Live demo:** https://islam-dawod.github.io/domain-opportunity-engine/

---

## עקרון v2.0 — לקנייה עכשיו בלבד

הגרסה מחליפה את דרישות החיפוש, המעקב והרכישה בגרסה הקודמת. מוצגים רק:
**פנוי לרישום חדש · נמחק וכעת פנוי · Premium פנוי · מכירה במחיר קבוע (אופציונלי, כבוי כברירת מחדל)**.
תפוגה, שחזור, Pending Delete ומכרז אינם בתכולה.

| # | יכולת | קובץ |
|---|-------|------|
| §3 | **בורר סיומות מרובה** — חיפוש, בחירה, ניקוי, «כל הנתמכות»; סיומות מדינה עם דרישות זכאות; סיומת לא-נתמכת אינה נבחרת; בחירה ריקה אינה «הכול» | [`TldPicker.tsx`](src/components/TldPicker.tsx) |
| §2 | **בדיקה בלחיצה אחת** — «בדוק דומיינים לקנייה עכשיו» לפי הפרופיל, ללא אישור פרשנות בחיפוש ברור | [`interpreter.ts`](src/engine/interpreter.ts) |
| §5 | **אימות ותוקף** — תשובת ספק חיובית + מחיר בר-תוקף; חלון ≤5 דק׳; שגיאה/Timeout לעולם אינם «פנוי»; רענון כשהתוקף פג | [`engine.ts`](src/engine/engine.ts) |
| §6 | **דירוג** — מתחיל רק אחרי מעבר תנאי הקנייה; זכירות/קריאות/סיומת/מחיר/חידוש; מדד שלמות נתונים (לא הסתברות רווח) | [`engine.ts`](src/engine/engine.ts) |
| §3 | **בדוק סיומות אחרות** — כל סיומת נבדקת מחדש כדומיין נפרד; אין העתקת מחיר/זמינות | [`engine.checkOtherTlds`](src/engine/engine.ts) |
| §9 | **רכישה מתוך האתר** — אישור עם אימות מחדש, שליחת הזמנה לרשם, «נרכש» רק אחרי אימות בחשבון; מחיר קבוע → «ממתין למסירה» | [`PurchaseModal`](src/components/PurchaseModal.tsx), [`acquisition.ts`](src/engine/acquisition.ts) |
| §10 | **תקציב וכשלים** — אישור ידני כברירת מחדל; מניעת כפילות; Timeout → «לא ידוע» עם בירור לפני ניסיון חוזר | [`store.ts`](src/store/store.ts) |
| §12 | **שקיפות כיסוי** — מועמדים/נבדקו/אומתו לרכישה + מקורות שלא ענו; אפס תוצאות ≠ «אין פנויים» | [`CoveragePanel`](src/components/ui.tsx) |
| §8 | **מסכים** — מרכז חיפוש, לקנייה עכשיו, כרטיס דומיין, אישור קנייה, הזמנות, הדומיינים שלי, הגדרות, **יומן בדיקות** | [`src/screens/`](src/screens) |

מודל הנתונים תואם את חוזה הנתונים (§11): search / candidate / verification / price / purchase_result / order,
כאשר `purchasable_now` נגזר בצד השרת בלבד. קריטריוני הקבלה (§13, AC-1..AC-13) מיושמים, כולל AC-6:
שם המסומן «רשום» אצל הספק חסום מרישום ללא קשר לכל טענה אחרת.

## תיקון אמינות זמינות (Correction spec — קריטי)

לאחר תקלה שבה `nova.com` הוצג «פנוי לרישום · אומת» בעוד היה רשום, נאכף כלל שאסור לעקוף:
**אין הוכחת זמינות תקפה מהספק המתאים = אין תווית «פנוי» ואין אפשרות לשלוח הזמנה.** שגיאה, מידע חסר, ציון AI או פיד מועמדים אינם הוכחה.

- **מכונת מצבי אימות קשיחה** (§4): `AVAILABLE_VERIFIED / REGISTERED / CONFLICT / UNKNOWN / ERROR / STALE / FIXED_PRICE_VERIFIED / UNSUPPORTED`. רק מצב מאומת עם `verification_id` תקף מאפשר תווית פנוי וכפתור קנייה. [`engine.verifyCandidate`](src/engine/engine.ts)
- **`can_purchase` נגזר בשרת בלבד** מראיה תקפה + דומיין מדויק + סיומת נתמכת + מחיר תקף + זכאות + תקציב; אינו ניתן לשינוי מהדפדפן. [`engine.deriveCanPurchase`](src/engine/engine.ts)
- **הפרדת מקור גילוי מאימות זמינות** בכרטיס (§6): «מקור גילוי: Names DB» מול «אימות זמינות: Namecheap». [`Provenance`](src/components/ui.tsx)
- **חוזה מתאם** (§4): HTTP 200/Status=OK אינם מספיקים; מחרוזת `"false"` = שקר; דומיין/ריצה לא תואמים → CONFLICT/דחייה; Sandbox בייצור → חסום. [`engine.normalizeProviderResponse`](src/engine/engine.ts)
- **בדיקת שרת לפני קנייה** (§8): הצגה לעולם אינה מקור אמת; «נתפס אחרי הבדיקה» → REGISTERED ללא הצלחה כוזבת; שינוי מחיר → אישור חדש; Timeout → «לא ידוע» עם בירור. [`engine.serverVerify`](src/engine/engine.ts)
- **מחיר לא ידוע** אינו מוצג כברירת מחדל וחוסם קנייה; חידוש חסר מסומן במפורש (§6).
- **ניטור ועצירה אוטומטית** (§9): בריאות חיבור, > 5% שגיאות או 3 כשלים רצופים → השהיה; אירועי הפרת כלל. [`CheckLog`](src/screens/CheckLog.tsx)
- **הבחנה בהודעת אפס תוצאות** (§6): «לא נמצאו התאמות» מול «שירות האימות אינו זמין».
- **בדיקות רגרסיה מחייבות** (§10): מסך [`בדיקות רגרסיה`](src/screens/RegressionTests.tsx) מריץ את חוזה האימות בפועל — 24/24 עוברות; הפתרון הוא כלל, לא רשימת חסימה לשמות.

## סטאק

React 18 · TypeScript · Vite · Tailwind CSS · Zustand · React Router. עברית RTL מלא.

## הרצה מקומית

```bash
npm install
npm run dev      # http://localhost:5173/domain-opportunity-engine/
npm run build
```

## מה לא כלול בדמו

חיבורי RDAP/רשם/תשלום אמיתיים, שרת, תורים וכספת סודות (§10–11) — מדומים במנוע דטרמיניסטי מקומי.
בדיקות תשלום נעשות ב-Sandbox; רכישה אמיתית דורשת הרשאה מפורשת ותקציב מוגדר.

---

מבוסס על מסמך האפיון: [`docs/domain-opportunity-system-spec-he.docx`](docs/domain-opportunity-system-spec-he.docx)
