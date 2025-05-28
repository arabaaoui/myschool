-- supabase/reports/student_progress_report_view.sql

CREATE OR REPLACE VIEW public.student_progress_report_view AS
SELECT
    s.id AS student_id,
    s.first_name AS student_first_name,
    s.last_name AS student_last_name,
    s.tenant_id,
    cp.id AS course_period_id,
    cp.name AS course_period_name,
    c.name AS course_name,
    up_teacher.full_name AS teacher_name,
    a.id AS assignment_id,
    a.title AS assignment_title,
    a.due_date AS assignment_due_date,
    a.max_points AS assignment_max_points,
    at.name AS assignment_type_name,
    at.weight AS assignment_type_weight,
    sg.points_earned,
    sg.grade_percentage,
    sg.grade_letter,
    sg.comments AS grade_comments,
    mp.id AS marking_period_id,
    mp.name AS marking_period_name
FROM
    public.students s
JOIN
    public.student_enrollments se ON s.id = se.student_id
JOIN
    public.course_periods cp ON se.course_period_id = cp.id
JOIN
    public.courses c ON cp.course_id = c.id
LEFT JOIN
    public.user_profiles up_teacher ON cp.teacher_id = up_teacher.id
JOIN
    public.assignments a ON cp.id = a.course_period_id
LEFT JOIN
    public.student_grades sg ON a.id = sg.assignment_id AND se.id = sg.student_enrollment_id
LEFT JOIN
    public.assignment_types at ON a.assignment_type_id = at.id
LEFT JOIN
    public.marking_periods mp ON cp.marking_period_id = mp.id
WHERE
    s.tenant_id = public.get_current_tenant_id() -- Ensures tenant isolation at the root
    AND se.tenant_id = public.get_current_tenant_id()
    AND cp.tenant_id = public.get_current_tenant_id()
    AND c.tenant_id = public.get_current_tenant_id()
    AND (up_teacher.tenant_id = public.get_current_tenant_id() OR up_teacher.tenant_id IS NULL)
    AND a.tenant_id = public.get_current_tenant_id()
    AND (sg.tenant_id = public.get_current_tenant_id() OR sg.tenant_id IS NULL)
    AND (at.tenant_id = public.get_current_tenant_id() OR at.tenant_id IS NULL)
    AND (mp.tenant_id = public.get_current_tenant_id() OR mp.tenant_id IS NULL);

COMMENT ON VIEW public.student_progress_report_view IS 'Aggregates data for student progress reports, including grades, assignments, and course details, scoped by tenant.';

-- RLS is primarily handled by the underlying tables and the get_current_tenant_id() function.
-- Ensure that users querying this view have appropriate SELECT permissions on the underlying tables,
-- or that the view is queried by roles that bypass RLS (like service_role) or through SECURITY DEFINER functions
-- that properly check permissions.
-- For this application, RLS policies on underlying tables and the tenant_id checks in the view itself are the primary mechanism.
-- The `get_current_tenant_id()` function is crucial.

-- Example usage:
-- SELECT * FROM student_progress_report_view WHERE student_id = 'some_student_uuid' AND (marking_period_id = 'some_mp_uuid' OR marking_period_id IS NULL);
-- (Adjust WHERE clause as needed for filtering)
