# ITVertex 🛠️📱

**ITVertex** คือแอปพลิเคชันบนมือถือ (Mobile Application) พัฒนาด้วย **Expo (React Native)** สำหรับการบริหารจัดการร้านซ่อมคอมพิวเตอร์และอุปกรณ์ไอทีอย่างเป็นระบบ 

---

## 🚀 ฟีเจอร์หลัก (Key Features)

*   **ระบบจัดการรายการซ่อม (Repair Management):** 
    *   แสดงรายการซ่อมปัจจุบันพร้อมสถานะงานอย่างชัดเจน (รอชำระ, กำลังซ่อม, ชำระแล้ว, ส่งมอบแล้ว, แจ้งปัญหา)
    *   ตัวกรองขั้นสูง (Advanced Filters): ค้นหาและคัดกรองงานซ่อมตาม **ช่างผู้ดูแล (Technician)** หรือ **ช่วงเวลา (วันนี้, สัปดาห์นี้, เดือนนี้)**
    *   การนับและแสดงผลสถิติจำนวนงานแต่ละสถานะทันที (Real-time Status Count Summary)
*   **ระบบรับเครื่องซ่อมใหม่ (Receive Job):** บันทึกรายละเอียดตัวเครื่อง อาการชำระ รหัสผ่านเครื่อง และอะไหล่/ราคาที่ประเมิน
*   **ระบบจัดการลูกค้า (Customer Directory):** บันทึกข้อมูลลูกค้า ตรวจสอบจำนวนงานซ่อมที่เปิดอยู่ของลูกค้าแต่ละคน และรองรับการกดโทรออกทันที
*   **ระบบตรวจสอบสลิปโอนเงิน (Slip Verification):** อัปโหลดสลิปธนาคารเข้าสู่ Supabase Storage พร้อมเชื่อมต่อระบบตรวจสอบสลิปด้วย **SlipOK API** อัตโนมัติ
*   **ระบบออกใบเสร็จ (Receipts & Invoices):** สร้างใบเสร็จและใบแจ้งหนี้ในรูปแบบ PDF ผ่านเครื่องมือของระบบเพื่อสั่งพิมพ์หรือส่งต่อ (Share/Print)
*   **ระบบแจ้งข้อผิดพลาด (Error Report Log):** รายงานและส่งบันทึกข้อผิดพลาดของแอปพลิเคชันเข้าสู่ฐานข้อมูลโดยตรง

---

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)

*   **Framework:** Expo SDK 54 (React Native v0.81)
*   **Navigation:** Expo Router v6 (File-based Routing)
*   **Database & Auth:** Supabase (`@supabase/supabase-js`)
*   **Styling:** Native React Native `StyleSheet` (Vanilla) ปรับแต่ง UI สไตล์มินิมอล เน้นข้อมูลคมชัด ธีมหลักสีแดงเข้ม `#D32F2F`
*   **Backend Services:** Supabase Database (RLS Enabled) & Storage (สลิปโอนเงิน)

---

## ⚙️ เริ่มใช้งาน (Getting Started)

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. ตั้งค่า Environment Variables
สร้างไฟล์ `.env` ที่โฟลเดอร์หลัก (`my-app/.env`) และระบุการเชื่อมต่อ Supabase:
```env
EXPO_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
EXPO_PUBLIC_SUPABASE_KEY=YOUR_SUPABASE_ANON_KEY
```

### 3. รันโปรเจกต์
```bash
# เริ่มใช้งาน Expo Dev Server
npx expo start

# รันบน Simulator/Emulator หรืออุปกรณ์จริง
npm run android  # สำหรับ Android
npm run ios      # สำหรับ iOS
npm run web      # สำหรับใช้งานบนเว็บ
```

---

## 📂 โครงสร้างโฟลเดอร์หลัก (Folder Structure)

```text
my-app/
├── app/                  # หน้าจอการทำงานทั้งหมด (Expo Router)
│   ├── (auth)/           # ระบบลงชื่อเข้าใช้งานและการจัดการรหัสผ่าน
│   │   ├── login.tsx           # หน้าจอเข้าสู่ระบบ
│   │   ├── forgot-password.tsx  # หน้าจอขอส่งลิงก์ตั้งรหัสผ่านใหม่ทางอีเมล
│   │   └── reset-password.tsx  # หน้าจอกู้คืนรหัสผ่าน
│   ├── (tabs)/           # เมนูหลักแท็บด้านล่าง (Bottom Tabs)
│   │   ├── customer.tsx        # รายชื่อลูกค้าและการจัดการข้อมูลลูกค้า
│   │   ├── employee.tsx        # รายชื่อพนักงาน/ช่างและข้อมูลการปฏิบัติงาน
│   │   ├── index.tsx           # หน้าแดชบอร์ดงานซ่อมและตัวกรองสถานะ/ช่าง
│   │   ├── receive.tsx         # ฟอร์มรับเครื่องซ่อมเข้าระบบใหม่
│   │   ├── report.tsx          # สถิติ แดชบอร์ดรายรับ และสรุปผลงานช่าง
│   │   └── settings.tsx        # ตั้งค่าระบบและการออกจากระบบ
│   ├── _layout.tsx       # Root Stack Navigator คอนฟิกการนำทาง
│   ├── device_insert_test.tsx # หน้าจอสำหรับทดสอบลงบันทึกข้อมูลเครื่องซ่อม
│   ├── edit-customer.tsx # หน้าจอแก้ไขข้อมูลลูกค้า
│   ├── edit-job.tsx      # หน้าจอแก้ไขรายละเอียดเครื่องซ่อมและสถานะ
│   ├── index.tsx         # หน้าแรกตรวจสอบ Session และเปลี่ยนเส้นทาง (Redirect)
│   ├── job-detail.tsx    # ประวัติและข้อมูลเชิงลึกงานซ่อมเครื่อง
│   ├── profile.tsx       # จัดการโปรไฟล์ของพนักงานปัจจุบัน
│   ├── receipt.tsx       # หน้าออกใบเสร็จรับเงิน/พิมพ์ PDF
│   ├── repair_job_insert_test.tsx # หน้าจอสำหรับทดสอบลงบันทึกข้อมูลใบสั่งซ่อม (Repair Jobs)
│   ├── repair_job_insert_test_v2.tsx # หน้าจอสำหรับทดสอบลงบันทึกข้อมูลใบสั่งซ่อมเดี่ยว (Repair Job)
│   ├── report-error.tsx  # หน้าจอรายงานและเก็บประวัติ Error Log
│   └── slips.tsx         # หน้าจอจัดการและประวัติการตรวจสอบสลิปเงินโอน
├── components/           # UI Components ที่ใช้งานร่วมกัน
│   ├── ui/               # ส่วนประกอบพื้นฐานของ UI เช่น ไอคอน
│   │   ├── icon-symbol.ios.tsx
│   │   └── icon-symbol.tsx
│   └── haptic-tab.tsx    # ปุ่มแท็บสัมผัสพร้อมการสั่นตอบสนอง (Haptic Feedback)
├── constants/            # ค่าคงที่ต่างๆ
│   └── theme.ts          # ไฟล์สไตล์ ธีม และชุดสีของแอปพลิเคชัน (#D32F2F)
├── hooks/                # Custom React Hooks
│   ├── use-color-scheme.ts
│   └── use-color-scheme.web.ts
├── lib/                  # ตัวเชื่อมต่อบริการภายนอก
│   └── supabase.ts       # ไฟล์คอนฟิกและส่งออก Supabase Client
├── scripts/              # สคริปต์ระหว่างพัฒนา
│   └── reset-project.js  # สคริปต์ล้างโครงสร้างหน้าจอเริ่มต้น
├── package.json          # ไฟล์จัดการ Dependencies และ Scripts
└── tsconfig.json         # การตั้งค่าระบบ TypeScript
```
API ใช้ได้ เช่น 
https://qcoorijuyyaoutlsjraw.supabase.co/rest/v1/device?select=device_type,customer_id&apikey=
https://qcoorijuyyaoutlsjraw.supabase.co/rest/v1/customer



TEST SPRITEAPI : ใส่ไว้แล้ว 

รหัสที่เอาไว้ใช้ในการ test
email  test@gmail.com
password test123


Test
