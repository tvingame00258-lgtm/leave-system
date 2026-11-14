# ระบบบริหารจัดการการลางานผ่าน LINE (Leave Management System)
> เชื่อมต่อด้วย **Cloudflare Workers**, **Supabase (PostgreSQL)**, และ **LINE Messaging API / LIFF**

---

## 📌 สถาปัตยกรรมของระบบ (Architecture)

```
[ พนักงาน / หัวหน้างาน ผ่าน LINE App ]
                 │
                 ├── 1. เปิดแบบฟอร์ม LIFF (ลงทะเบียน / ยื่นใบลา)
                 │         │
                 │         ▼
      [ Cloudflare Worker (line-leave-relay) ]
      (https://line-leave-relay.tvingame00258.workers.dev)
                 │
                 ├── 2. ตรวจสอบ LINE ID Token & ประมวลผลคำขอ
                 │         │
                 ├── 3. บันทึก / ดึงข้อมูลแบบเรียลไทม์ (REST API)
                 │         ▼
            [ Supabase Database (PostgreSQL) ]
            - ตาราง `employees` (ข้อมูลพนักงานและหัวหน้า)
            - ตาราง `leave_requests` (ประวัติการลาและสถานะ)
            - วิว `hr_overview` (สรุปข้อมูลสำหรับฝ่ายบุคคล)
                 │
                 ├── 4. ส่งข้อความแจ้งเตือน / Flex Message ขออนุมัติ
                 │         ▼
        [ LINE Messaging API ]
        - ส่ง Flex Message หาหัวหน้างาน
        - หัวหน้ากดปุ่ม "อนุมัติ" หรือ "ไม่อนุมัติ" (Postback)
        - อัปเดตสถานะใน Supabase
        - แจ้งผลกลับไปยังพนักงาน + แจ้งฝ่ายบุคคล (HR)
```

---

## 🚀 ข้อมูลการเชื่อมต่อปัจจุบัน (Current Status)

| ส่วนประกอบ | รายละเอียด | สถานะ |
| :--- | :--- | :---: |
| **Cloudflare Worker** | `line-leave-relay.tvingame00258.workers.dev` | 🟢 ทำงานปกติ |
| **Supabase Project** | `tsjfqjisabmbrgbdgyif` (leave-system) | 🟢 เชื่อมต่อแล้ว |
| **LINE Official Account** | Channel Secret & Access Token ติดตั้งใน Worker | 🟢 พร้อมใช้งาน |
| **LIFF ลงทะเบียน** | ID: `2011955364-O2qTmo0r` (`/register`) | 🟢 พร้อมใช้งาน |
| **LIFF ยื่นใบลา** | ID: `2011955364-FCY27ABh` (`/leave`) | 🟢 พร้อมใช้งาน |

---

## 📁 โครงสร้างโปรเจกต์

```
โปรเจกต์ระบบลา/
├── src/
│   ├── views/
│   │   ├── register.html     # หน้าเว็บแบบฟอร์มลงทะเบียนพนักงาน (LINE LIFF)
│   │   └── leave.html        # หน้าเว็บแบบฟอร์มขอยื่นใบลา (LINE LIFF)
│   └── worker-core.js        # โค้ด Backend หลักของ Cloudflare Worker
├── supabase/
│   ├── schema.sql            # สคริปต์สร้างตาราง, View, Index
│   └── rls_security.sql      # สคริปต์ตั้งค่าความปลอดภัย Row Level Security (RLS)
├── build.js                  # สคริปต์ Bundle รวม HTML เข้ากับ Worker
├── worker.js                 # ไฟล์ Bundle สุดท้ายสำหรับ Deploy ขึ้น Cloudflare
├── wrangler.jsonc            # ไฟล์การตั้งค่า Cloudflare Wrangler
├── package.json              # รายละเอียดโปรเจกต์และ npm scripts
├── test-connection.js        # สคริปต์ทดสอบการเชื่อมต่อ
└── .env.example              # ตัวอย่างตัวแปรสภาพแวดล้อม
```

---

## ⚙️ ขั้นตอนการทำงาน (Workflow)

1. **การลงทะเบียนพนักงาน (`/register`)**:
   - พนักงานเปิดผ่าน LINE LIFF ระบบจะดึง LINE User ID อัตโนมัติ
   - กรอกข้อมูล: บริษัทในเครือ, รหัสพนักงาน, คำนำหน้า, ชื่อ-สกุล, ฝ่าย, แผนก, ตำแหน่งงาน และเลือกหัวหน้าผู้อนุมัติ
   - บันทึกลงตาราง `employees` ใน Supabase
2. **การยื่นคำขอลา (`/leave`)**:
   - พนักงานเปิดผ่าน LINE LIFF เลือกประเภทการลา (ลาป่วย, ลากิจ, ลาพักร้อน, อื่นๆ), ระบุวันที่และเหตุผล
   - บันทึกลงตาราง `leave_requests` สถานะเริ่มต้นเป็น `PENDING`
   - ระบบส่ง **Flex Message การขออนุมัติ** ไปยัง LINE ของหัวหน้าที่ระบุไว้
3. **การอนุมัติผ่าน LINE (Webhook Postback)**:
   - หัวหน้ากดปุ่ม **"อนุมัติ"** หรือ **"ไม่อนุมัติ"** จาก Flex Card บน LINE
   - Worker ดักจับ Webhook และบันทึกผลการพิจารณาลง Supabase
   - Worker ส่ง Flex Message แจ้งผลการพิจารณากลับไปยังพนักงาน
   - หากได้รับการอนุมัติ จะส่งสรุปรายละเอียดไปยัง LINE ของฝ่ายบุคคล (HR) อัตโนมัติ

---

## 🔒 ข้อแนะนำด้านความปลอดภัย (Supabase Security Advisory)

ปัจจุบันตาราง `employees` และ `leave_requests` ยังไม่ได้เปิดใช้งาน **Row Level Security (RLS)**:
- **คำแนะนำ**: ควรกดเปิด RLS เพื่อป้องกันไม่ให้บุคคลภายนอกใช้ Anonymous API Key เข้าถึงหรือเปลี่ยนแปลงข้อมูลในฐานข้อมูลโดยตรง
- เนื่องจาก Cloudflare Worker เชื่อมต่อด้วย `SUPABASE_SECRET_KEY` (Service Role Key) อยู่แล้ว การเปิด RLS จะไม่กระทบต่อการทำงานของระบบ แต่จะช่วยป้องกันการเจาะระบบจากภายนอกได้อย่างสมบูรณ์
- สามารถดูคำสั่ง SQL ได้ที่ไฟล์ [`supabase/rls_security.sql`](file:///c:/Users/USER/Downloads/โปรเจกต์ระบบลา/supabase/rls_security.sql)

---

## 🛠️ วิธีการทดสอบและ Deploy

### 1. ทดสอบการเชื่อมต่อ
```bash
node test-connection.js
```

### 2. บิลด์ไฟล์ใหม่เมื่อมีการแก้ไขหน้า HTML หรือ Worker
```bash
node build.js
```

### 3. Deploy ไปยัง Cloudflare Worker
```bash
npx wrangler deploy
```
