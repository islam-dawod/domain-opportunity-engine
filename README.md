# Domain Opportunity Engine

מערכת אוטומטית לאיתור, דירוג ורכישת דומיינים מפקודה חופשית בעברית ובאנגלית —
מימוש **MVP פונקציונלי** של האפיון המלא (PRD v1.2).

> **Automated domain opportunity discovery, scoring & safe acquisition** driven by a free-text
> command in Hebrew/English. This is a functional front-end MVP that implements the product's
> core intelligence over a deterministic simulated data engine (RDAP / registrars / auctions are
> mocked — **no real purchases are made**).

🔗 **דמו חי / Live demo:** https://islam-dawod.github.io/domain-opportunity-engine/

---

## מה מיושם (Implemented)

| # | יכולת | קובץ |
|---|-------|------|
| 6 | **מנוע הבנת הוראה** — פרשנות פקודה חופשית בעברית/אנגלית למסננים מובנים, עם השלמה מפרופיל וזיהוי מקור כל שדה | [`src/engine/interpreter.ts`](src/engine/interpreter.ts) |
| 3–4 | **צנרת גילוי** — יצירת מועמדים, ניקוי, אימות סטטוס (מחזור חיי דומיין), והעשרה | [`src/engine/engine.ts`](src/engine/engine.ts) |
| 7 | **מנוע דירוג** — ציון משוקלל 0–100 על 9 רכיבים, מדד Confidence, סיווג וספים | [`src/engine/engine.ts`](src/engine/engine.ts) · [`config.ts`](src/engine/config.ts) |
| 8 | **רכישה בטוחה** — מצבי Monitor/Notify/Approval/Auto-buy + כל בקרות ה-Auto-buy ו-Idempotency | [`src/engine/acquisition.ts`](src/engine/acquisition.ts) |
| 9 | **13 מסכי מוצר** — Command Center, אישור פרשנות, תוצאות, פרטי דומיין, השוואה, מעקב, רכישות, **הדומיינים שלי**, התראות, פרופילים, אינטגרציות, משתמשים, Audit Log | [`src/screens/`](src/screens) |

### תוספות v1.2

- **חיפוש כללי כברירת מחדל** — פעולה ראשית «בדוק הזדמנויות בכל הדומיינים»: סריקה בכל התחומים ובכל הסיומות הנתמכות, ללא מילות מפתח/אורך/שפה. תחום, שפה, סיומת ואורך הם מסננים אופציונליים. ([`interpreter.ts`](src/engine/interpreter.ts))
- **שקיפות כיסוי** — מקורות שנבדקו, סיומות מכוסות, מספר מועמדים, תאריך עדכון וכשלים; סימון תוצאה חלקית. ([`CoveragePanel`](src/components/ui.tsx))
- **דירוג בחיפוש כללי** — רכיב «התאמה לתחום» אינו מחושב והמשקלים מנורמלים ל-100%; ללא ענישה על אי-שיוך לענף; תצוגת טווח שווי משוער ממקור עסקאות כשקיים, אחרת «שם בתקציב» ללא טענת הנחה. ([`engine.ts`](src/engine/engine.ts))
- **רכישה ישירה באתר (§8.1)** — כפתור קנייה פותח אישור הזמנה עם אימות מחדש של מחיר/מסים/עמלות/חידוש, אישור מפורש, שליחת הזמנה לרשם, מסלולי רכישה לפי סטטוס, ומצב «לא ידוע» (Timeout) עם בירור לפני ניסיון נוסף. ([`acquisition.ts`](src/engine/acquisition.ts), [`PurchaseModal`](src/components/PurchaseModal.tsx))
- **הדומיינים שלי (S-13)** — דומיינים שנרכשו ואומתו: רשם, בעלים, תפוגה, חידוש, קבלה ואימות דוא״ל. ([`MyDomains.tsx`](src/screens/MyDomains.tsx))

המימוש נאמן לסעיפים 2–18 באפיון: מודל הנתונים (§12), תדירויות בדיקה (§3.1), מחזור חיי דומיין (§4),
משקלי דירוג (§7), רכישה בטוחה וישירה (§8, §8.1), הרשאות (§13), מקרי קצה (§15) וקריטריוני קבלה (§17, AC-01..AC-19).

## סטאק (Stack)

React 18 · TypeScript · Vite · Tailwind CSS · Zustand · React Router. עברית RTL מלא + אנגלית.

## הרצה מקומית (Run locally)

```bash
npm install
npm run dev      # http://localhost:5173/domain-opportunity-engine/
npm run build    # פרודקשן ל-dist/
```

## פריסה (Deploy)

הדמו מתפרסם כאתר סטטי ל-GitHub Pages מענף `gh-pages`
(`base` מוגדר בקובץ [`vite.config.ts`](vite.config.ts)).

## מה לא כלול (Out of scope for this demo)

חיבורי RDAP/רשם/תשלום אמיתיים, שרת, תורים ו-Secrets Vault — אלה מתוארים באפיון (§10–11)
ומחייבים תשתית שרת וסודות. כאן הם מיוצגים על ידי מנוע סימולציה דטרמיניסטי כדי להדגים את
לוגיקת המוצר מקצה לקצה ללא סיכון.

---

מבוסס על מסמך האפיון: [`docs/domain-opportunity-system-spec-he.docx`](docs/domain-opportunity-system-spec-he.docx)
