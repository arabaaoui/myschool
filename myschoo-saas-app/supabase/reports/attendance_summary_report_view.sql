-- supabase/reports/attendance_summary_report_view.sql

CREATE OR REPLACE VIEW public.attendance_summary_report_view AS
SELECT
    ar.id AS attendance_record_id,
    s.id AS student_id,
    s.first_name AS student_first_name,
    s.last_name AS student_last_name,
    s.tenant_id,
    cp.id AS course_period_id,
    cp.name AS course_period_name,
    c.name AS course_name,
    ar.attendance_date,
    ac.code AS attendance_code,
    ac.description AS attendance_description,
    ac.is_present_code,
    ac.is_absent_code,
    ar.comments AS attendance_comments,
    mp.id AS marking_period_id, -- For filtering by marking period if needed
    mp.name AS marking_period_name
FROM
    public.attendance_records ar
JOIN
    public.students s ON ar.student_id = s.id
JOIN
    public.course_periods cp ON ar.course_period_id = cp.id
JOIN
    public.courses c ON cp.course_id = c.id
JOIN
    public.attendance_codes ac ON ar.attendance_code_id = ac.id
LEFT JOIN
    public.marking_periods mp ON cp.marking_period_id = mp.id
WHERE
    ar.tenant_id = public.get_current_tenant_id() -- Ensures tenant isolation at the root
    AND s.tenant_id = public.get_current_tenant_id()
    AND cp.tenant_id = public.get_current_tenant_id()
    AND c.tenant_id = public.get_current_tenant_id()
    AND ac.tenant_id = public.get_current_tenant_id()
    AND (mp.tenant_id = public.get_current_tenant_id() OR mp.tenant_id IS NULL);

COMMENT ON VIEW public.attendance_summary_report_view IS 'Provides detailed attendance records for students in course periods, scoped by tenant.';

-- RLS is primarily handled by the underlying tables and the get_current_tenant_id() function.
-- The policies on `attendance_records` (allowing admins to see all, and teachers to see their own class attendance)
-- will further refine what data is visible through this view for specific roles.

-- Example usage:
-- To get summary for a specific course period and date range:
-- SELECT student_first_name, student_last_name, attendance_code, COUNT(*) as count
-- FROM attendance_summary_report_view
-- WHERE course_period_id = 'some_cp_uuid' AND attendance_date BETWEEN 'start_date' AND 'end_date'
-- GROUP BY student_first_name, student_last_name, attendance_code
-- ORDER BY student_last_name, student_first_name, attendance_code;

-- To get all attendance for a specific student:
-- SELECT course_period_name, attendance_date, attendance_code, attendance_description
-- FROM attendance_summary_report_view
-- WHERE student_id = 'some_student_uuid'
-- ORDER BY attendance_date DESC, course_period_name;
