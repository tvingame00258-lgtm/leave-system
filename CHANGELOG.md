# บันทึกการอัปเดต (Changelog)

## 2026-11-24 — แก้ไขปัญหาวนลูปล็อกอินหน้ายื่นใบลา (`/leave`) และเสริมความปลอดภัยระบบยืนยันตัวตนทุกหน้า

### ปัญหาที่แก้ไข
- **แก้ไขอาการวนลูปล็อกอินหน้ายื่นใบลา (`/leave`) ทั้งบนคอมพิวเตอร์และมือถือ**
  - สาเหตุ: การซิงค์สถานะล็อกอินข้าม LIFF ID (`LeaveSystemAuth.prepareSession`) คัดลอกเฉพาะข้อมูลใน `localStorage` โดยไม่ได้ซิงค์ Cookie `LIFF_STORE:expires:<liffId>` ทำให้ LINE LIFF SDK v2 ล้าง session และ `loginTmp` (PKCE `codeVerifier`) ทิ้งทุกครั้งระหว่างรับค่า OAuth callback (`?code=...&state=...`)
  - การแก้ไข:
    - ข้าม `prepareSession()` ทันทีเมื่อ URL เป็น OAuth callback เพื่อไม่ให้รบกวน `loginTmp` ระหว่างแลก Token
    - คัดลอกเฉพาะคีย์ session ที่ปลอดภัย (`accessToken`, `IDToken`, `decodedIDToken`, `clientId`, `context`) และซิงค์ Cookie `LIFF_STORE:expires:<liffId>` ควบคู่กัน (รวมถึงลบ Cookie ออกเมื่อกดออกจากระบบ)
    - บังคับตรวจวันหมดอายุที่ใช้งานได้ก่อนซิงค์ session ข้าม LIFF ID

### การปรับปรุงเพิ่มเติมครบทุกหน้า
- **หน้ายื่นใบลา (`/leave`) & หน้าลงทะเบียน (`/register`):** เพิ่มตัวป้องกันการวนลูป auto-login (จำกัดจำนวนครั้งและหยุดทันทีหากกลับจาก OAuth แล้วยังไม่ล็อกอิน) พร้อมปรับปุ่มลองเข้าสู่ระบบใหม่ให้รีเซ็ตตัวนับและเรียก `beginLogin()` ถูกต้อง
- **หน้าแรก (`/`, Portal):** ใช้ `cleanRedirectUri` สำหรับล็อกอิน และเมื่อ `IDToken` หมดอายุ (HTTP `401`) ให้แจ้งให้เข้าสู่ระบบใหม่แทนการแสดงสถานะผิดว่า "ยังไม่ลงทะเบียน"
- **หน้ารายงาน HR (`/export-hr`) & หน้าปฏิเสธคำขอลา (`/reject`):** เพิ่มตัวกันวนลูปล็อกอิน, ล้าง OAuth query parameters ออกจาก URL (โดยยังคงพารามิเตอร์ `reqId`/`uid`/`exp`/`sig` ของ `/reject`), และเชื่อม `shouldBlock` / `beginLogin` / `completeLogin` ให้สอดคล้องกันทั้งระบบ

### การทดสอบ
- เพิ่ม Playwright regression test จำลองพฤติกรรม `LIFF_STORE:expires:<liffId>` และ `loginTmp` ของ LINE LIFF SDK v2 ใน `tests/playwright/security.spec.cjs`
- ทดสอบผ่านครบ **20/20** รายการ และ Deploy ขึ้น Cloudflare Workers แล้ว

---

## 2026-11-21 — ปรับปรุงระบบอนุมัติ, รายงาน CSV และ View ฝ่ายบุคคล
- ปรับปรุง View `public.hr_overview` ด้วย `security_invoker = true`
- ป้องกัน CSV Formula Injection ในการส่งออกรายงาน HR
- ป้องกันการกดอนุมัติ/ปฏิเสธซ้ำ และเพิ่มการตรวจสอบความถูกต้องของวันที่และจำนวนวันลาฝั่ง Backend
