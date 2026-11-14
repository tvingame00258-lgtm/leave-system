-- ==============================================================================
-- นโยบายความปลอดภัย Row Level Security (RLS) สำหรับ Supabase
-- คำแนะนำ: เนื่องจาก Cloudflare Worker เชื่อมต่อผ่าน SUPABASE_SECRET_KEY (Service Role)
-- ซึ่งจะ Bypass RLS อยู่แล้ว การเปิด RLS จึงช่วยป้องกันไม่ให้บุคคลภายนอกที่ได้ anon key
-- สามารถอ่านหรือแก้ไขข้อมูลพนักงานและใบลาผ่าน REST API โดยตรงได้
-- ==============================================================================

-- 1. เปิดใช้งาน RLS บนตาราง
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- 2. ตั้งค่าความปลอดภัยให้กับ View hr_overview
ALTER VIEW public.hr_overview SET (security_invoker = true);

-- 2. สร้าง Policy ป้องกันการเข้าถึงแบบสาธารณะ (anon)
-- หรืออนุญาตเฉพาะ authenticated / service_role เท่านั้น
-- ตัวอย่าง: ไม่อนุญาตให้ anon อ่านหรือเขียนโดยตรง (ทุกคำขอต้องผ่าน Cloudflare Worker ที่ยืนยันตัวตน LINE แล้ว)

-- หากต้องการให้เปิดอ่านเฉพาะผู้ใช้ที่ล็อกอิน หรือใช้ผ่าน Service Role จาก Cloudflare Worker:
-- Service role จะข้าม RLS เสมอ ดังนั้นเมื่อเปิด RLS แล้ว Cloudflare Worker จะทำงานได้ตามปกติ 100%
-- และผู้ใช้ทั่วไปจะไม่สามารถส่องข้อมูลผ่าน anon key ได้
