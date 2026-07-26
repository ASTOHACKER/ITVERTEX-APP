# 📋 ITVertex - Project Handoff Document

> **เอกสารส่งมอบงานโปรเจกต์ (Handoff Document)**  
> **แอปพลิเคชัน:** ITVertex (Mobile Application สำหรับบริหารจัดการร้านซ่อมคอมพิวเตอร์และอุปกรณ์ไอที)  
> **ปรับปรุงล่าสุด:** 23 กรกฎาคม 2026

---

## 📌 1. ภาพรวมโปรเจกต์ (Project Overview)

**ITVertex** เป็นระบบบริหารจัดการงานซ่อมคอมพิวเตอร์ สมาร์ตโฟน และอุปกรณ์ไอทีสำหรับร้านซ่อม ช่วยให้ช่างและเจ้าของร้านสามารถรับเครื่อง ติดตามสถานะงานซ่อม จัดการข้อมูลลูกค้า พนักงาน ออกใบเสร็จรับเงิน ตรวจสอบสลิปโอนเงิน และบันทึกประวัติการบริการได้อย่างเป็นระบบผ่านแอปพลิเคชันมือถือ

---

## 🛠️ 2. เทคโนโลยีที่ใช้ (Tech Stack)

* **Core Framework:** Expo SDK 54 (React Native 0.81.5)
* **Routing & Navigation:** Expo Router v6 (File-based Routing)
* **Backend & Database:** Supabase (Authentication, PostgreSQL Database, Row Level Security, Storage)
* **Styling System:** NativeWind v4 (TailwindCSS 3.4) ร่วมกับ React Native `StyleSheet` (เน้นธีมสีหลัก Crimson Red `#D32F2F`)
* **Signature System:** Pure React Native SignaturePad (`PanResponder` + SVG Generation - ไม่พึ่งพา WebView/Native Library)
* **PDF & Printing:** `expo-print`, `expo-sharing`
* **External Integration:** SlipOK API (ตรวจสอบสลิปธนาคารอัตโนมัติ)
* **Testing:** TestSprite (Automated AI UI Testing)
* **Typography:** Global Kanit Font (รองรับ Web & Mobile สมบูรณ์แบบด้วย CSS Specificity Fix ไม่กระทบ Vector Icons)
* **Build System:** EAS Build (`eas.json` พร้อมจัดการ Environment Variables)

---

## 📂 3. โครงสร้างโปรเจกต์ (Directory Structure)

```text
my-app/
├── app/                          # แอปพลิเคชัน routing (Expo Router)
│   ├── (auth)/                   # หน้าจอยืนยันตัวตน
│   │   ├── login.tsx             # หน้า Login (รองรับทั้ง Email และ Username)
│   │   ├── forgot-password.tsx    # หน้าขอตั้งรหัสผ่านใหม่ทางอีเมล
│   │   └── reset-password.tsx    # หน้ากู้คืนรหัสผ่าน
│   ├── (tabs)/                   # แท็บเมนูหลัก (Bottom Navigation Tabs)
│   │   ├── index.tsx             # Dashboard งานซ่อม + Filter สถานะ/ช่าง/ช่วงเวลา
│   │   ├── receive.tsx           # ฟอร์มรับเครื่องซ่อมเข้าระบบใหม่
│   │   ├── customer.tsx          # รายชื่อและประวัติลูกค้า (โทรออกได้ทันที)
│   │   ├── employee.tsx          # รายชื่อพนักงานและช่างซ่อม
│   │   ├── report.tsx            # แดชบอร์ดสรุปรายรับและสถิติงานซ่อม
│   │   └── settings.tsx          # ตั้งค่าระบบ / สลับบัญชี / หน้าทดสอบ
│   ├── _layout.tsx               # Root Layout Navigation & Session Handler
│   ├── edit-customer.tsx         # แก้ไขข้อมูลลูกค้า
│   ├── edit-job.tsx              # แก้ไขรายละเอียดและสถานะงานซ่อม
│   ├── job-detail.tsx            # ประวัติและรายละเอียดเชิงลึกของงานซ่อม
│   ├── receipt.tsx               # ระบบสร้างและพิมพ์/แชร์ใบเสร็จ PDF
│   ├── slips.tsx                 # ตรวจสอบประวัติสลิปโอนเงิน
│   ├── signing-test.tsx          # หน้าทดสอบระบบวาดลายเซ็นดิจิทัล
│   └── report-error.tsx          # หน้าแจ้งปัญหาและบันทึก Error Logs
├── components/                   # Reusable UI Components
│   ├── signature/                # Component ลายเซ็นดิจิทัล (Pure React Native)
│   │   └── SignaturePad.tsx      # PanResponder Canvas -> SVG Generator
│   └── ui/                       # Icon Symbols และ UI Components พื้นฐาน
├── constants/                    # ค่าคงที่และธีม
│   └── theme.ts                  # Color Palette (#D32F2F) และดีไซน์ระบบ
├── lib/                          # Third-party Connectors
│   └── supabase.ts               # Supabase Client Setup & Initialization
├── app.json                      # คอนฟิกหลักของ Expo โปรเจกต์
├── eas.json                      # คอนฟิกสำหรับการทำ Build ขึ้นคลาวด์ของ Expo
├── tailwind.config.js            # การตั้งค่า TailwindCSS
├── testsprite-test.json          # แผนการทดสอบอัตโนมัติด้วย AI ของ TestSprite
└── package.json                  # Dependencies & Executable Scripts
```

---

## 🗄️ 4. ฐานข้อมูลและ API (Database & Backend Architecture)

โปรเจกต์ใช้ **Supabase** เป็นหลัก โดยมีตารางข้อมูลสำคัญดังนี้:

1. **`customer`**: เก็บรหัสลูกค้า, ชื่อ-นามสกุล, เบอร์โทรศัพท์, ที่อยู่, วันที่สร้าง
2. **`device`**: เก็บข้อมูลอุปกรณ์ (ยี่ห้อ, รุ่น, Serial Number, ประเภทอุปกรณ์, รหัสผ่านเครื่อง, รหัสลูกค้า)
3. **`repair_job`**: รายการงานซ่อม
   * **สถานะงาน (Status):** `รอชำระ`, `กำลังซ่อม`, `ชำระแล้ว`, `ส่งมอบแล้ว`, `แจ้งปัญหา`
   * **ข้อมูลอื่นๆ:** ราคาประเมิน, ช่างผู้รับผิดชอบ, อาการเสีย, รายการอะไหล่, URL สภาพเครื่อง/สลิป/ลายเซ็น
4. **`profiles` / `employee`**: ข้อมูลพนักงาน ช่างซ่อม บทบาท (Admin / Technician / Staff)
5. **`slips`**: บันทึกการอัปโหลดสลิปและการยืนยันยอดเงินผ่าน SlipOK API
6. **`error_logs`**: บันทึก Log ข้อผิดพลาดของแอปพลิเคชันสำหรับนักพัฒนา

---

## ✅ 5. ฟีเจอร์ที่พัฒนาเสร็จสมบูรณ์แล้ว (Completed Features)

- [x] **Authentication:** ลงชื่อเข้าใช้ด้วย Email หรือ Username + ระบบเปลี่ยนรหัสผ่าน
- [x] **Intake Form (รับเครื่อง):** บันทึกข้อมูลลูกค้า, อุปกรณ์, อาการชำรุด, รหัสผ่านเครื่อง, และราคาประเมิน
- [x] **Dashboard & Filters:** กรองงานซ่อมตามช่างผู้รับผิดชอบ และช่วงเวลา (วันนี้/สัปดาห์นี้/เดือนนี้) พร้อมตัวเลขอัปเดตสถิติ
- [x] **Customer & Employee Directory:** ค้นหาลูกค้า กดโทรออกตรงจากแอป และดูรายการงานซ่อมย้อนหลัง
- [x] **Digital Signature Pad:** วาดลายเซ็นลูกค้า/ช่างด้วย Pure React Native Canvas ส่งออกเป็น SVG data URI
- [x] **PDF Receipt Generator:** สร้างใบเสร็จรับเงิน/ใบแจ้งหนี้ สั่งพิมพ์หรือกดแชร์ออกเป็น PDF ได้ทันที
- [x] **Slip Verification System:** อัปโหลดสลิปขึ้น Supabase Storage และตรวจเช็กยอดเงินโอนด้วย SlipOK API
- [x] **Error Reporting:** บันทึกข้อผิดพลาดส่งตรงเข้าฐานข้อมูล
- [x] **Automated UI Testing:** ติดตั้งและเซ็ตอัประบบทดสอบหน้าจออัตโนมัติด้วย **TestSprite**
- [x] **Global Typography:** กำหนดฟอนต์ **Kanit** เป็นฟอนต์หลักทั้งระบบ (แก้ปัญหา React Native Web ซ้อนทับ CSS โดยไม่กระทบ Icon)
- [x] **Supabase Stability:** แก้ปัญหา Network Crash และการจัดการ `.env` สำหรับทั้ง Dev และ Production Build

---

## 🔑 6. การตั้งค่าสภาพแวดล้อม (Environment Variables)

สร้างไฟล์ `.env` ไว้ที่ Root directory (`my-app/.env`):

```env
EXPO_PUBLIC_SUPABASE_URL=https://qcoorijuyyaoutlsjraw.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=YOUR_SUPABASE_ANON_KEY
```

---

## 🏃 7. คำสั่งการรันและทดสอบ (Commands)

```bash
# 1. ติดตั้ง Dependencies
npm install

# 2. เริ่มต้นใช้งาน Expo Dev Server
npx expo start

# 3. รันแยกตาม Platform
npm run android    # รันบน Android Emulator หรือเครื่องจริง
npm run ios        # รันบน iOS Simulator
npm run web        # รันบน Web Browser
```

---

## 🚀 8. คำแนะนำสำหรับการพัฒนาต่อ (Next Steps & Recommendations)

1. **Push Notifications:** เพิ่มการส่งการแจ้งเตือน (Expo Notifications) แจ้งเตือนสถานะงานซ่อมเมื่อมีการอัปเดตงานถึงลูกค้า
2. **Bluetooth Thermal Printer Integration:** เพิ่มฟังก์ชันพิมพ์ใบรับเครื่องขนาดสลิป (58mm/80mm) ผ่าน Bluetooth โดยตรง
3. **Real-time Subscriptions:** เปิดใช้งาน Supabase Realtime บน Dashboard (`app/(tabs)/index.tsx`) เพื่อให้สถานะเปลี่ยนทันทีเมื่อช่างอีกคนอัปเดตงาน
4. **Offline Mode & Caching:** รองรับการบันทึกงานซ่อมชั่วคราวเมื่อไม่มีสัญญาณอินเทอร์เน็ต
