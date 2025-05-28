-- supabase/reports/course_period_overall_grades_view.sql

CREATE OR REPLACE VIEW public.course_period_overall_grades_view AS
WITH student_assignment_type_scores AS (
    -- Calculate the average percentage for each assignment type for each student in each course period
    SELECT
        sg.student_id,
        sg.course_period_id,
        a.assignment_type_id,
        at.name AS assignment_type_name,
        at.weight AS assignment_type_weight,
        -- Sum of (points_earned / max_points) for assignments of this type
        -- This effectively calculates the student's average score for this assignment type, scaled by max_points
        SUM(sg.points_earned) AS total_points_earned_for_type,
        SUM(a.max_points) AS total_max_points_for_type
    FROM
        public.student_grades sg
    JOIN
        public.assignments a ON sg.assignment_id = a.id
    JOIN
        public.assignment_types at ON a.assignment_type_id = at.id
    WHERE
        sg.points_earned IS NOT NULL AND a.max_points IS NOT NULL AND a.max_points > 0 -- Only consider graded assignments with valid max_points
    GROUP BY
        sg.student_id,
        sg.course_period_id,
        a.assignment_type_id,
        at.name,
        at.weight
),
student_weighted_scores AS (
    -- Calculate the weighted score for each assignment type
    SELECT
        sats.student_id,
        sats.course_period_id,
        sats.assignment_type_id,
        sats.assignment_type_name,
        sats.assignment_type_weight,
        (sats.total_points_earned_for_type / sats.total_max_points_for_type) * sats.assignment_type_weight AS weighted_type_score,
        sats.assignment_type_weight AS weight_for_this_type -- This is the weight of the type if it has graded assignments
    FROM
        student_assignment_type_scores sats
    WHERE
        sats.assignment_type_weight IS NOT NULL AND sats.assignment_type_weight > 0 -- Only consider types with actual weight
)
-- Aggregate weighted scores for overall grade
SELECT
    s.id AS student_id,
    s.first_name || ' ' || s.last_name AS student_name,
    cp.id AS course_period_id,
    cp.name AS course_period_name,
    c.name AS course_name, -- Added for context
    mp.id AS marking_period_id,
    mp.name AS marking_period_name, -- Added for context
    s.tenant_id,
    -- Calculate overall percentage: SUM(weighted_type_score) / SUM(weight_for_this_type for types that had grades)
    -- This correctly normalizes if not all weighted types have grades yet.
    CASE
        WHEN SUM(sws.weight_for_this_type) > 0 THEN (SUM(sws.weighted_type_score) / SUM(sws.weight_for_this_type)) * 100
        ELSE NULL -- Or 0, depending on desired behavior for no weighted grades
    END AS overall_percentage,
    NULL AS overall_letter_grade -- Placeholder for future letter grade logic
FROM
    public.students s
JOIN
    public.student_enrollments se ON s.id = se.student_id
JOIN
    public.course_periods cp ON se.course_period_id = cp.id
JOIN 
    public.courses c ON cp.course_id = c.id -- Join to get course_name
JOIN
    public.marking_periods mp ON cp.marking_period_id = mp.id -- Join to get marking_period_name and id
LEFT JOIN
    student_weighted_scores sws ON s.id = sws.student_id AND cp.id = sws.course_period_id
WHERE
    s.tenant_id = public.get_current_tenant_id() -- Ensures tenant isolation
    AND se.tenant_id = public.get_current_tenant_id()
    AND cp.tenant_id = public.get_current_tenant_id()
    AND c.tenant_id = public.get_current_tenant_id()
    AND mp.tenant_id = public.get_current_tenant_id()
GROUP BY
    s.id,
    s.first_name,
    s.last_name,
    cp.id,
    cp.name,
    c.name,
    mp.id,
    mp.name,
    s.tenant_id;

COMMENT ON VIEW public.course_period_overall_grades_view IS 'Calculates overall weighted grades for students in each course period, scoped by tenant.';

-- RLS for this view relies on the underlying tables' RLS policies.
-- Specifically, users (teachers, students, parents) should only be able to see data
-- for students/course_periods they have access to via existing policies on
-- students, student_enrollments, course_periods, assignments, student_grades, etc.
-- The get_current_tenant_id() ensures primary tenant isolation.
-- The function-based RLS (is_parent_of_student, get_student_id_for_user, teacher_id checks) on underlying tables will restrict rows.

-- Example Usage:
-- SELECT * FROM course_period_overall_grades_view WHERE student_id = 'student_uuid_here';
-- SELECT * FROM course_period_overall_grades_view WHERE course_period_id = 'course_period_uuid_here';
