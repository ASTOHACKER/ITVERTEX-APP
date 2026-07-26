---
timestamp: 2026-07-22T17-17-28Z
slug: app-tabs-ui-screens
---
⚠️ DEGRADED: single-context (inline synthesis execution)

### Target: App UI Screens (`customer.tsx`, `settings.tsx`, `report.tsx`, `index.tsx`, `receive.tsx`)

---

### 📊 Design Health Score (Heuristic Evaluation)

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | **Visibility of System Status** | 3/4 | Status badges ("รอชำระ", "ชำระแล้ว") clear, but theme state is out of sync. |
| 2 | **Match System / Real World** | 3/4 | Thai domain terminology suitable for repair business. |
| 3 | **User Control and Freedom** | 2/4 | Accordions work, but Theme toggle breaks visual layout. |
| 4 | **Consistency and Standards** | 0/4 | **Severe theme mismatch**: Dark screens (`#0f172a`) paired with stark white bottom tab bar (`#FFFFFF`). 4 different card background colors on one page. |
| 5 | **Error Prevention** | 2/4 | Basic input fields present without constraint indicators. |
| 6 | **Recognition Rather Than Recall** | 2/4 | Random background colors increase cognitive load. |
| 7 | **Flexibility and Efficiency** | 2/4 | Dual red `+` buttons (FAB + Tab Bar) create redundant visual clutter. |
| 8 | **Aesthetic and Minimalist Design** | 1/4 | **High visual noise floor**: Patchwork of Dark Slate, Stark White, Light Purple, Light Cream, and Yellow cards. |
| 9 | **Error Recovery** | 2/4 | Standard error handling. |
| 10 | **Help and Documentation** | 1/4 | Missing inline helper hints in complex forms. |
| **Total** | | **18/40** | **Poor (Major Overhaul Required)** |

---

### 🎯 Design Specificity Verdict

- **LLM Assessment**: จากภาพจับหน้าจอ (Screenshots) พบปัญหา **Visual Identity Collapse**:
  1. **Theme Boundary Leakage**: หน้าจอเนื้อหาเป็นโหมดมืด (`#0f172a`) แต่ Tab Bar ด้านล่างกลับเป็นสีขาวโพลน (`#ffffff`) ทำให้ขัดตาอย่างรุนแรง
  2. **Palette Chaos ในฟอร์มรับเครื่อง**: การใช้สีพื้นหลังการ์ดคนละสีในหน้าเดียวกัน (การ์ด 1 สีน้ำเงินเข้ม, การ์ด 2 สีม่วงพาสเทล, การ์ด 3 สีครีมเหลือง) เกิดความขัดแย้งเชิงจังหวะและทำลาย Hierarchy
  3. **FAB Duplication**: มีปุ่มลอยสีแดง `+` อยู่ตรงมุมขวาในขณะที่มีปุ่ม `+` สีแดงตรงกลาง Tab Bar อยู่แล้ว
- **Deterministic Scan**: ตรวจพบการผสมคลาส NativeWind แบบสะเปะสะปะระหว่าง `bg-white`, `bg-[#FAF5FF]`, `bg-[#FFFBEB]` และ `bg-slate-900`

---

### 💬 Overall Impression
แอปมีโครงสร้างข้อมูลและการใช้งานที่ดีเยี่ยม แต่ ** Theme และโทนสีปัจจุบันมีความขัดแย้งกันอย่างรุนแรง (Patchwork Colors)** ทำให้หน้าตาแอปดูไม่เป็นระบบเดียวกันและดูอึดอัดเมื่อใช้งานในโหมดมืด

---

### 🚨 Priority Issues

- **[P0] Tab Bar / Screen Theme Mismatch (ความขัดแย้งของ Tab Bar กับหน้าจอ)**:
  - *Why it matters*: หน้าจอเป็น Dark Slate แต่ Tab Bar ด้านล่างเป็นสีขาว ทำลายความสมดุลและความเป็นมืออาชีพของแอป
  - *Fix*: ซิงค์คลาส Dark Mode ให้ครอบคลุมทั้งหน้าและบังคับให้ Tab Bar ใช้สี `#1e293b` ในโหมดมืด
  - *Suggested command*: `/impeccable colorize`

- **[P1] Card & Input Background Color Chaos (ความสับสนของสีพื้นหลังการ์ดและช่องกรอก)**:
  - *Why it matters*: การใช้การ์ดสีขาว, สีม่วงพาสเทล, สีเหลืองครีม ผสมกับการ์ดสีเข้มในหน้าเดียวกัน ทำให้สายตาล้าและดูรกรุงรัง
  - *Fix*: เปลี่ยนการ์ดทุกใบในโหมดมืดให้ใช้ดีไซน์ระดับเดียวกัน (Dark Card Palette: `bg-slate-800/80` หรือ `bg-slate-900` พร้อมเส้นขอบ `border-slate-700`)
  - *Suggested command*: `/impeccable layout`

- **[P1] Duplicate FAB Button (ปุ่ม + ลอยซ้ำซ้อน)**:
  - *Why it matters*: มีปุ่ม `+` สีแดง 2 ปุ่มในหน้าเดียว (ปุ่มลอยขวาใต้การ์ด + ปุ่มตรงกลาง Tab Bar) บดบังข้อมูลการ์ดใต้มุมขวา
  - *Fix*: ลบ Floating Action Button (FAB) มุมขวาออก แล้วใช้ปุ่ม "รับเครื่อง" ตรงกลาง Tab Bar เป็นจุดสร้างงานซ่อมหลักเพียงจุดเดียว
  - *Suggested command*: `/impeccable distill`

- **[P2] Inconsistent Filter Pills & Stat Cards**:
  - *Why it matters*: ปุ่มตัวกรอง "วันนี้", "สัปดาห์นี้" และการ์ดสรุปยอดเป็นบล็อกสีขาวตัดกับพื้นหลังมืดเกินไป
  - *Fix*: ปรับตัวกรองและการ์ดสรุปผลให้เป็น Dark Surface Tokens เดียวกัน
  - *Suggested command*: `/impeccable polish`

---

### 👤 Persona Red Flags

- 🔰 **Jordan (First-Timer)**: ตกใจกับสีของฟอร์มที่เปลี่ยนไปมา (การ์ดม่วง, การ์ดเหลือง, การ์ดน้ำเงิน) ไม่แน่ใจว่าส่วนไหนสำคัญที่สุด
- ⚡ **Alex (Power User)**: สับสนว่าควรกดปุ่ม `+` ตรงไหนกันแน่ เพราะมีปุ่ม `+` สีแดงลอยขวาทับการ์ดใบสุดท้าย และมีปุ่ม `+` สีแดงตรง Tab Bar ด้านล่างอีกปุ่ม
- 📱 **Casey (Mobile User)**: มองหน้าจอในโหมดมืดแล้วแสบตากับ Tab Bar สีขาวโพลนด้านล่าง

---

> 📈 **First run for `app-tabs-ui-screens`, no trend yet.**  
> Wrote `.impeccable/critique/2026-07-22T17-17-00Z__app-tabs-ui-screens.md`
