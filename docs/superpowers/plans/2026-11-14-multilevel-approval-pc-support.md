# Multi-Level Approval, Rejection Reason & PC Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 2-step approval workflow (Department Head -> General Manager), rejection reason prompt with HR notifications, PC web browser auto-login support, and verify with Playwright E2E tests.

**Architecture:**
- **Database (Supabase PostgreSQL):** Add columns for manager/GM approval statuses, dates, and rejection reasons. Update `hr_overview` view.
- **Frontend (Cloudflare Worker HTML Views):** Add `reject.html` LIFF dialog, update `leave.html` and `register.html` with PC auto-redirect to LINE Login.
- **Backend (Cloudflare Worker):** Route approvals: Employee -> Manager (`PENDING_MGR`) -> GM (`PENDING_GM`) -> Final (`APPROVED`). Handle rejection with reasons, notify HR and employee.
- **Testing (Playwright):** Automated E2E testing of PC & mobile views, form fields, and rejection flow.

**Tech Stack:** Cloudflare Workers, Supabase PostgreSQL, LINE Messaging API & LIFF SDK v2, Playwright, Tailwind CSS.

---

## Tasks

- [ ] **Task 1: Supabase Database Migration**
  - Add columns to `leave_requests`: `manager_status`, `manager_action_date`, `gm_status`, `gm_action_date`, `gm_line_id`, `action_reason`.
  - Update `hr_overview` view to include `action_reason` (เหตุผลการไม่อนุมัติ).
  - Verify migration using `supabase_mcp` `execute_sql`.

- [ ] **Task 2: Frontend Views & PC Auto-Login Support**
  - Create `src/views/reject.html` for managers/GM to enter rejection reasons with auto-close.
  - Update `src/views/register.html` and `src/views/leave.html` to auto-trigger `liff.login()` when opened in PC browsers.
  - Ensure responsive styling on desktop monitors.

- [ ] **Task 3: Cloudflare Worker Multi-Level Approval Logic**
  - Update `src/worker-core.js`:
    - Lookup General Manager (GM) automatically.
    - Set initial status based on role (`PENDING_MANAGER` vs `PENDING_GM`).
    - Handle Manager Approval: transition to `PENDING_GM` and push flex card to GM.
    - Handle GM Approval: transition to `APPROVED` and push notifications to Employee and HR.
    - Handle Rejection: record `action_reason`, push notifications to Employee and HR.
    - Export route `/export-hr` updated to include rejection reason.

- [ ] **Task 4: Bundle & Build Worker**
  - Update `build.js` to include `reject.html`.
  - Build `worker.js`.

- [ ] **Task 5: Playwright E2E Testing**
  - Install local `playwright` package if needed.
  - Write Playwright test script testing `register.html`, `leave.html`, and `reject.html` in both Desktop PC and Mobile viewport.
  - Run Playwright test and verify results.

- [ ] **Task 6: Deploy to Cloudflare & Final Verification**
  - Deploy using `npx wrangler deploy`.
  - Verify `/ping`, `/export-hr`, `/register`, `/leave`, and `/reject` live endpoints.
