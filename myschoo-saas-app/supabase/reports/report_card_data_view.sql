-- supabase/reports/report_card_data_view.sql

CREATE OR REPLACE VIEW public.report_card_data_view AS
WITH course_attendance_summary AS (
    -- Aggregate attendance counts per student, per course_period, per marking_period
    SELECT
        ar.student_id,
        ar.course_period_id,
        cp.marking_period_id,
        SUM(CASE WHEN ac.is_absent_code = TRUE THEN 1 ELSE 0 END) AS total_absences,
        SUM(CASE WHEN ac.code = 'T' THEN 1 ELSE 0 END) AS total_tardies -- Assuming 'T' is the code for Tardy
        -- Add other specific code counts if needed
    FROM
        public.attendance_records ar
    JOIN
        public.attendance_codes ac ON ar.attendance_code_id = ac.id
    JOIN
        public.course_periods cp ON ar.course_period_id = cp.id -- To link to marking_period_id for filtering
    WHERE 
        ar.tenant_id = public.get_current_tenant_id()
    GROUP BY
        ar.student_id,
        ar.course_period_id,
        cp.marking_period_id
)
SELECT
    s.id AS student_id,
    s.first_name || ' ' || s.last_name AS student_name,
    s.student_identifier,
    s.tenant_id,
    mp.id AS marking_period_id,
    mp.name AS marking_period_name,
    mp.start_date AS marking_period_start_date,
    mp.end_date AS marking_period_end_date,
    ay.name AS academic_year_name,
    cp.id AS course_period_id,
    c.name AS course_name,
    cp.name AS course_period_name, -- Section name
    up_teacher.full_name AS teacher_name,
    overall_grades.overall_percentage AS course_overall_percentage,
    overall_grades.overall_letter_grade AS course_letter_grade, -- Placeholder
    rccc.comment AS course_comment,
    COALESCE(cas.total_absences, 0) AS course_total_absences,
    COALESCE(cas.total_tardies, 0) AS course_total_tardies,
    gl.name as grade_level_name -- Added student's grade level
FROM
    public.students s
JOIN
    public.student_enrollments se ON s.id = se.student_id
JOIN
    public.course_periods cp ON se.course_period_id = cp.id
JOIN
    public.courses c ON cp.course_id = c.id
JOIN
    public.marking_periods mp ON cp.marking_period_id = mp.id
JOIN
    public.academic_years ay ON mp.academic_year_id = ay.id
LEFT JOIN
    public.user_profiles up_teacher ON cp.teacher_id = up_teacher.id
LEFT JOIN
    public.course_period_overall_grades_view overall_grades 
    ON s.id = overall_grades.student_id 
    AND cp.id = overall_grades.course_period_id
    AND mp.id = overall_grades.marking_period_id -- Ensure overall grade is for the correct marking period context if applicable
LEFT JOIN
    public.report_card_course_comments rccc 
    ON s.id = rccc.student_id 
    AND cp.id = rccc.course_period_id 
    AND mp.id = rccc.marking_period_id
LEFT JOIN
    course_attendance_summary cas
    ON s.id = cas.student_id
    AND cp.id = cas.course_period_id
    AND mp.id = cas.marking_period_id -- Ensure attendance summary matches the report card's marking period
LEFT JOIN 
    public.grade_levels gl ON s.current_grade_level_id = gl.id -- Added join for grade level
WHERE
    s.tenant_id = public.get_current_tenant_id() -- Primary tenant isolation
    AND se.tenant_id = public.get_current_tenant_id()
    AND cp.tenant_id = public.get_current_tenant_id()
    AND c.tenant_id = public.get_current_tenant_id()
    AND mp.tenant_id = public.get_current_tenant_id()
    AND ay.tenant_id = public.get_current_tenant_id()
    AND (up_teacher.tenant_id = public.get_current_tenant_id() OR up_teacher.tenant_id IS NULL)
    AND (overall_grades.tenant_id = public.get_current_tenant_id() OR overall_grades.tenant_id IS NULL)
    AND (rccc.tenant_id = public.get_current_tenant_id() OR rccc.tenant_id IS NULL)
    AND (gl.tenant_id = public.get_current_tenant_id() OR gl.tenant_id IS NULL);


COMMENT ON VIEW public.report_card_data_view IS 'Gathers comprehensive data for student report cards, including course details, grades, teacher comments, and attendance summaries for a specific marking period, scoped by tenant.';

-- RLS for this view is primarily handled by the underlying tables' RLS policies
-- and the tenant_id checks within the view.
-- Users (admins, teachers, students, parents) will only see data they are permitted to see
-- based on their roles and relationships defined in those policies.

-- Example Usage:
-- SELECT * FROM public.report_card_data_view
-- WHERE student_id = 'student_uuid_here' AND marking_period_id = 'marking_period_uuid_here'
-- ORDER BY course_name;
