-- ==============================================================================
-- สคริปต์ฐานข้อมูลระบบลางาน (Leave Management System) บน Supabase PostgreSQL
-- เชื่อมต่อกับ Cloudflare Workers & LINE LIFF / LINE Messaging API
-- ==============================================================================

-- 1. ตารางพนักงาน (employees)
CREATE TABLE IF NOT EXISTS public.employees (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    line_user_id TEXT UNIQUE NOT NULL,
    company TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    title TEXT NOT NULL,
    full_name TEXT NOT NULL,
    division TEXT NOT NULL,
    department TEXT NOT NULL,
    position TEXT NOT NULL,
    manager_line_id TEXT,
    registration_status TEXT NOT NULL DEFAULT 'PENDING',
    approval_role TEXT NOT NULL DEFAULT 'EMPLOYEE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.employees
    ADD COLUMN IF NOT EXISTS registration_status TEXT NOT NULL DEFAULT 'PENDING',
    ADD COLUMN IF NOT EXISTS approval_role TEXT NOT NULL DEFAULT 'EMPLOYEE',
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Index สำหรับค้นหาพนักงานและหัวหน้า
CREATE INDEX IF NOT EXISTS idx_employees_manager_line_id ON public.employees(manager_line_id);
CREATE INDEX IF NOT EXISTS idx_employees_company_emp_id ON public.employees(company, employee_id);

-- 2. ตารางคำขอลา (leave_requests)
CREATE TABLE IF NOT EXISTS public.leave_requests (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    request_id TEXT UNIQUE NOT NULL,
    employee_line_id TEXT NOT NULL,
    employee_name TEXT NOT NULL,
    company TEXT,
    division TEXT,
    department TEXT,
    position TEXT,
    leave_type TEXT NOT NULL,
    other_leave_detail TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days NUMERIC NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING',
    manager_line_id TEXT,
    action_by_name TEXT,
    action_date TIMESTAMP WITH TIME ZONE,
    action_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    manager_status TEXT DEFAULT 'PENDING',
    manager_action_date TIMESTAMP WITH TIME ZONE,
    gm_status TEXT DEFAULT 'PENDING',
    gm_action_date TIMESTAMP WITH TIME ZONE,
    gm_line_id TEXT
);

ALTER TABLE public.leave_requests
    ADD COLUMN IF NOT EXISTS manager_status TEXT DEFAULT 'PENDING',
    ADD COLUMN IF NOT EXISTS manager_action_date TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS gm_status TEXT DEFAULT 'PENDING',
    ADD COLUMN IF NOT EXISTS gm_action_date TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS gm_line_id TEXT;

-- Index สำหรับค้นหาคำขอลาตามรหัสคำขอและสถานะ
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON public.leave_requests(employee_line_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_manager_status ON public.leave_requests(manager_line_id, status);

-- 3. View สำหรับฝ่ายบุคคล (hr_overview)
CREATE OR REPLACE VIEW public.hr_overview WITH (security_invoker = true) AS
SELECT 
    lr.company AS "บริษัท",
    to_char((lr.created_at AT TIME ZONE 'Asia/Bangkok'), 'YYYY-MM-DD HH24:MI:SS') AS "วันที่ลงบันทึกการขอลา",
    emp.employee_id AS "รหัสพนักงาน",
    emp.title AS "คำนำหน้า",
    lr.employee_name AS "ชื่อ-สกุล",
    lr.division AS "ฝ่าย",
    lr.department AS "แผนก",
    lr.position AS "ตำแหน่ง",
    lr.leave_type AS "ประเภทการลา",
    lr.other_leave_detail AS "รายละเอียดเพิ่มเติม",
    CASE
        WHEN lr.start_date = lr.end_date THEN to_char(lr.start_date, 'YYYY-MM-DD')
        ELSE (to_char(lr.start_date, 'YYYY-MM-DD') || ' ถึง ') || to_char(lr.end_date, 'YYYY-MM-DD')
    END AS "วันที่ลาใช้สิทธิ",
    lr.total_days AS "จำนวนวันลา",
    lr.reason AS "เหตุผลการลา",
    mgr.full_name AS "หัวหน้าผู้อนุมัติ",
    CASE
        WHEN lr.status = 'APPROVED' THEN 'ได้'
        WHEN lr.status = 'REJECTED' THEN 'ไม่ได้'
        WHEN lr.status = 'PENDING_GM' THEN 'รอผู้จัดการทั่วไป'
        ELSE 'รอพิจารณา'
    END AS "สถานะการได้ลา",
    lr.action_by_name AS "ผู้อนุมัติ",
    to_char((lr.action_date AT TIME ZONE 'Asia/Bangkok'), 'YYYY-MM-DD HH24:MI:SS') AS "วันที่พิจารณา",
    lr.action_reason AS "เหตุผลที่ไม่อนุมัติ"
FROM public.leave_requests lr
LEFT JOIN public.employees emp ON emp.line_user_id = lr.employee_line_id
LEFT JOIN public.employees mgr ON mgr.line_user_id = lr.manager_line_id
ORDER BY lr.created_at DESC;
