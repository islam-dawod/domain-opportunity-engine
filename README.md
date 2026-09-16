# Domain Opportunity Engine

מערכת אוטומטית לאיתור, דירוג ורכישת דומיינים מפקודה חופשית בעברית ובאנגלית —
מימוש **MVP פונקציונלי** של האפיון המלא (PRD v1.0).

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
| 9 | **12 מסכי מוצר** — Command Center, אישור פרשנות, תוצאות, פרטי דומיין, השוואה, מעקב, רכישות, התראות, פרופילים, אינטגרציות, משתמשים, Audit Log | [`src/screens/`](src/screens) |

המימוש נאמן לסעיפים 2–18 באפיון: מודל הנתונים (§12), תדירויות בדיקה (§3.1),
מחזור חיי דומיין (§4), משקלי דירוג (§7), תנאי Auto-buy (§8.2), הרשאות (§13) ומקרי קצה (§15).

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
