-- #############################################################################
-- ## Table Definitions
-- #############################################################################

-- --------------
-- -- Tenants Table
-- -- Stores information about each tenant (e.g., a school or institution).
-- --------------
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
  -- Add other tenant-specific fields here, e.g., subscription_status, address, etc.
);
COMMENT ON TABLE public.tenants IS 'Stores information about each tenant (e.g., a school or institution).';

-- --------------
-- -- User Profiles Table
-- -- Extends auth.users to store application-specific user information,
-- -- including tenant association and role.
-- --------------
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL, -- Kept for easier querying, should match auth.users.email
  role TEXT NOT NULL DEFAULT 'pending', -- e.g., 'admin', 'teacher', 'student', 'parent', 'support_staff'
  full_name TEXT,
  is_active BOOLEAN DEFAULT FALSE NOT NULL, -- Changed default to FALSE for invited users
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
  -- Add other profile-specific fields here, e.g., phone_number, avatar_url, etc.
);
COMMENT ON TABLE public.user_profiles IS 'Extends auth.users to store application-specific user information, including tenant association and role.';
COMMENT ON COLUMN public.user_profiles.is_active IS 'Whether the user account is active within the tenant. Invited users start as FALSE.';


-- --------------
-- -- Grade Levels Table
-- -- Defines the different grade levels available within a tenant (e.g., Grade 1, Grade 2).
-- --------------
CREATE TABLE IF NOT EXISTS public.grade_levels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., "Kindergarten", "Grade 1", "Year 10"
  sort_order INT, -- For ordering grade levels in UI
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, name) -- Ensure grade level names are unique within a tenant
);
COMMENT ON TABLE public.grade_levels IS 'Defines the different grade levels available within a tenant.';

-- --------------
-- -- Students Table
-- -- Stores information about individual students.
-- --------------
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_profile_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL, -- Optional link to a user profile (e.g., if student has login)
  student_identifier TEXT, -- School-specific student ID, unique within a tenant
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT, -- e.g., 'Male', 'Female', 'Non-binary', 'Prefer not to say'
  ethnicity TEXT, -- Consider making this a lookup table or using a standardized list
  current_grade_level_id UUID REFERENCES public.grade_levels(id) ON DELETE SET NULL, -- Current assigned grade level
  enrollment_date DATE,
  graduation_date DATE,
  notes TEXT, -- General notes about the student
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, student_identifier) -- Ensure student identifiers are unique within a tenant if provided
);
COMMENT ON TABLE public.students IS 'Stores information about individual students within a tenant.';
COMMENT ON COLUMN public.students.user_profile_id IS 'If the student has their own login, this links to their user_profiles record.';


-- #############################################################################
-- ## Parent-Student Links Table
-- #############################################################################
CREATE TABLE IF NOT EXISTS public.parent_student_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  parent_user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  relationship_type TEXT, -- e.g., 'Mother', 'Father', 'Guardian'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, parent_user_id, student_id)
);
COMMENT ON TABLE public.parent_student_links IS 'Links parent user profiles to student records.';

-- #############################################################################
-- ## Academic & Marking Period Tables
-- #############################################################################

-- --------------
-- -- Academic Years Table
-- -- Defines academic years for a tenant.
-- --------------
CREATE TABLE IF NOT EXISTS public.academic_years (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., "2023-2024 School Year"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, name),
  CONSTRAINT check_start_end_dates CHECK (start_date < end_date)
);
COMMENT ON TABLE public.academic_years IS 'Defines academic years for a tenant.';

-- --------------
-- -- Marking Periods Table
-- -- Defines marking periods within an academic year (e.g., semesters, quarters).
-- --------------
CREATE TABLE IF NOT EXISTS public.marking_periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., "Semester 1", "Quarter 1"
  short_name TEXT, -- e.g., "S1", "Q1"
  type TEXT, -- e.g., 'semester', 'quarter', 'trimester', 'year', 'custom'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  parent_marking_period_id UUID REFERENCES public.marking_periods(id) ON DELETE SET NULL, -- For hierarchical structures
  sort_order INT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, academic_year_id, name),
  CONSTRAINT check_mp_start_end_dates CHECK (start_date < end_date)
  -- Add constraint to ensure marking period dates are within its academic year dates (can be complex with triggers or deferred constraints)
);
COMMENT ON TABLE public.marking_periods IS 'Defines marking periods within an academic year (e.g., semesters, quarters).';
COMMENT ON COLUMN public.marking_periods.parent_marking_period_id IS 'For hierarchical structures like quarters within a semester.';


-- #############################################################################
-- ## Course Management Tables
-- #############################################################################

-- --------------
-- -- Subjects Table
-- -- Defines academic subjects offered by a tenant.
-- --------------
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT, -- e.g., "MATH", "SCI"
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, name),
  UNIQUE (tenant_id, code) -- Code should also be unique within a tenant if provided
);
COMMENT ON TABLE public.subjects IS 'Defines academic subjects offered by a tenant.';

-- --------------
-- -- Courses Table
-- -- Defines specific courses offered within a subject.
-- --------------
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., "Algebra 101", "Introduction to Biology"
  description TEXT,
  default_credits NUMERIC(4,2), -- e.g., 3.00, 0.50
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, subject_id, name) -- Course name unique within a subject for that tenant
);
COMMENT ON TABLE public.courses IS 'Defines specific courses offered within a subject.';

-- --------------
-- -- Course Periods Table (Classes/Sections)
-- -- Represents a specific class or section of a course for a given marking period.
-- --------------
ALTER TABLE public.course_periods DROP CONSTRAINT IF EXISTS fk_marking_period; -- Drop old FK if it exists without proper table

CREATE TABLE IF NOT EXISTS public.course_periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL, -- Assumes teachers are in user_profiles
  marking_period_id UUID NOT NULL REFERENCES public.marking_periods(id) ON DELETE CASCADE, -- Now references the defined table
  name TEXT NOT NULL, -- e.g., "Section A", "Period 1 Block"
  room TEXT,
  max_seats INT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
COMMENT ON TABLE public.course_periods IS 'Represents a specific class/section of a course for a given marking period.';
COMMENT ON COLUMN public.course_periods.marking_period_id IS 'References the defined marking_periods table.';

-- #############################################################################
-- ## Student Enrollment Table
-- #############################################################################

-- --------------
-- -- Student Enrollments Table
-- -- Links students to specific course periods (classes/sections).
-- --------------
CREATE TABLE IF NOT EXISTS public.student_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  course_period_id UUID NOT NULL REFERENCES public.course_periods(id) ON DELETE CASCADE,
  enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  withdrawal_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, student_id, course_period_id), -- Prevent duplicate enrollments
  CONSTRAINT check_withdrawal_after_enrollment CHECK (withdrawal_date IS NULL OR withdrawal_date >= enrollment_date)
);
COMMENT ON TABLE public.student_enrollments IS 'Links students to specific course periods (classes/sections).';
COMMENT ON COLUMN public.student_enrollments.withdrawal_date IS 'Date student withdrew from the course period. Null if currently enrolled.';

-- #############################################################################
-- ## Attendance Tables
-- #############################################################################

-- --------------
-- -- Attendance Codes Table
-- -- Defines codes used for marking attendance (e.g., Present, Absent, Tardy).
-- --------------
CREATE TABLE IF NOT EXISTS public.attendance_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL, -- e.g., "P", "A", "T", "E"
  description TEXT NOT NULL, -- e.g., "Present", "Absent", "Tardy", "Excused Absence"
  is_present_code BOOLEAN DEFAULT FALSE NOT NULL,
  is_absent_code BOOLEAN DEFAULT FALSE NOT NULL,
  sort_order INT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, code)
);
COMMENT ON TABLE public.attendance_codes IS 'Defines codes used for marking attendance.';
COMMENT ON COLUMN public.attendance_codes.is_present_code IS 'Indicates if this code counts as present.';
COMMENT ON COLUMN public.attendance_codes.is_absent_code IS 'Indicates if this code counts as absent.';

-- --------------
-- -- Attendance Records Table
-- -- Stores attendance records for each student in each course period on a given date.
-- --------------
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_enrollment_id UUID NOT NULL REFERENCES public.student_enrollments(id) ON DELETE CASCADE,
  course_period_id UUID NOT NULL REFERENCES public.course_periods(id) ON DELETE CASCADE, -- Denormalized for easier querying
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE, -- Denormalized for easier querying
  attendance_date DATE NOT NULL,
  attendance_code_id UUID NOT NULL REFERENCES public.attendance_codes(id) ON DELETE RESTRICT, -- Prevent deleting code in use
  taken_by_user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (student_enrollment_id, attendance_date) -- One record per student per enrollment per day
);
COMMENT ON TABLE public.attendance_records IS 'Stores daily attendance for students in course periods.';
COMMENT ON COLUMN public.attendance_records.course_period_id IS 'Denormalized from student_enrollments for easier querying of class attendance.';
COMMENT ON COLUMN public.attendance_records.student_id IS 'Denormalized from student_enrollments for easier querying of student attendance.';

-- #############################################################################
-- ## Assignments and Grades Tables
-- #############################################################################

-- --------------
-- -- Assignment Types Table
-- -- Defines types of assignments (e.g., Homework, Quiz, Exam).
-- --------------
CREATE TABLE IF NOT EXISTS public.assignment_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  weight DECIMAL(5,2), -- e.g., 0.20 for 20%
  sort_order INT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, name)
);
COMMENT ON TABLE public.assignment_types IS 'Defines types of assignments (e.g., Homework, Quiz, Exam).';
COMMENT ON COLUMN public.assignment_types.weight IS 'Optional weight for calculating overall grades (e.g., 0.20 for 20%).';

-- --------------
-- -- Assignments Table
-- -- Defines specific assignments for a course period.
-- --------------
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  course_period_id UUID NOT NULL REFERENCES public.course_periods(id) ON DELETE CASCADE,
  assignment_type_id UUID NOT NULL REFERENCES public.assignment_types(id) ON DELETE RESTRICT, -- Prevent deleting type in use
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  max_points DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
COMMENT ON TABLE public.assignments IS 'Defines specific assignments for a course period.';

-- --------------
-- -- Student Grades Table
-- -- Stores grades for students on specific assignments.
-- --------------
CREATE TABLE IF NOT EXISTS public.student_grades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_enrollment_id UUID NOT NULL REFERENCES public.student_enrollments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE, -- Denormalized
  course_period_id UUID NOT NULL REFERENCES public.course_periods(id) ON DELETE CASCADE, -- Denormalized
  points_earned DECIMAL(10,2),
  grade_percentage DECIMAL(5,2), -- Can be calculated (points_earned / max_points) * 100 or entered
  grade_letter TEXT, -- e.g., A, B, C
  comments TEXT,
  graded_by_user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (assignment_id, student_enrollment_id) -- One grade per student per assignment
);
COMMENT ON TABLE public.student_grades IS 'Stores grades for students on specific assignments.';
COMMENT ON COLUMN public.student_grades.student_id IS 'Denormalized from student_enrollments for easier querying.';
COMMENT ON COLUMN public.student_grades.course_period_id IS 'Denormalized from student_enrollments for easier querying.';

-- #############################################################################
-- ## Discipline Tables
-- #############################################################################

-- --------------
-- -- Discipline Incident Types Table
-- -- Defines types of disciplinary incidents.
-- --------------
CREATE TABLE IF NOT EXISTS public.discipline_incident_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, name)
);
COMMENT ON TABLE public.discipline_incident_types IS 'Defines types of disciplinary incidents (e.g., Tardiness, Uniform Violation).';

-- --------------
-- -- Discipline Incidents Table
-- -- Stores records of disciplinary incidents.
-- --------------
CREATE TABLE IF NOT EXISTS public.discipline_incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  incident_type_id UUID NOT NULL REFERENCES public.discipline_incident_types(id) ON DELETE RESTRICT,
  incident_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  reported_by_user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  description_of_incident TEXT NOT NULL,
  action_taken TEXT,
  status TEXT, -- e.g., "Pending Review", "Resolved", "Escalated"
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
COMMENT ON TABLE public.discipline_incidents IS 'Stores records of student disciplinary incidents.';
COMMENT ON COLUMN public.discipline_incidents.status IS 'Current status of the incident (e.g., Pending Review, Resolved).';

-- #############################################################################
-- ## Billing Tables
-- #############################################################################

-- --------------
-- -- Fee Types Table
-- -- Defines types of fees that can be assigned to students.
-- --------------
CREATE TABLE IF NOT EXISTS public.fee_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  default_amount DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, name)
);
COMMENT ON TABLE public.fee_types IS 'Defines types of fees (e.g., Tuition, Library Fine).';

-- --------------
-- -- Student Fees Table
-- -- Assigns specific fees to students.
-- --------------
CREATE TABLE IF NOT EXISTS public.student_fees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  fee_type_id UUID NOT NULL REFERENCES public.fee_types(id) ON DELETE RESTRICT,
  description_override TEXT,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE,
  is_paid BOOLEAN DEFAULT FALSE NOT NULL,
  paid_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
COMMENT ON TABLE public.student_fees IS 'Assigns specific fees to students.';
COMMENT ON COLUMN public.student_fees.description_override IS 'Optional override for the fee type description for this specific instance.';
COMMENT ON COLUMN public.student_fees.amount IS 'Can default from fee_type but is stored per instance.';

-- --------------
-- -- Student Payments Table
-- -- Records payments made by/for students.
-- --------------
CREATE TABLE IF NOT EXISTS public.student_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  payment_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  amount_paid DECIMAL(10,2) NOT NULL,
  payment_method TEXT, -- e.g., "Cash", "Credit Card", "Bank Transfer"
  notes TEXT,
  recorded_by_user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
COMMENT ON TABLE public.student_payments IS 'Records payments made by/for students.';

-- #############################################################################
-- ## Report Card Comments Table
-- #############################################################################
CREATE TABLE IF NOT EXISTS public.report_card_course_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  course_period_id UUID NOT NULL REFERENCES public.course_periods(id) ON DELETE CASCADE,
  marking_period_id UUID NOT NULL REFERENCES public.marking_periods(id) ON DELETE CASCADE,
  comment TEXT,
  created_by_user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL, -- Teacher who wrote the comment
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, student_id, course_period_id, marking_period_id)
);
COMMENT ON TABLE public.report_card_course_comments IS 'Stores teacher comments for a student for a specific course within a marking period for report cards.';

-- #############################################################################
-- ## Announcements Table
-- #############################################################################
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by_user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_date TIMESTAMPTZ,
  target_roles TEXT[], -- Array of roles: 'student', 'parent', 'teacher', 'support_staff', 'admin'. NULL means all.
  is_published BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT check_end_date_after_start_date CHECK (end_date IS NULL OR end_date >= start_date)
);
COMMENT ON TABLE public.announcements IS 'Stores announcements for tenants, with optional role-based targeting.';
COMMENT ON COLUMN public.announcements.target_roles IS 'If NULL or empty, announcement is for all roles in the tenant. Otherwise, specifies which roles can view it.';

-- #############################################################################
-- ## Direct Messaging Tables
-- #############################################################################

-- --------------
-- -- Message Threads Table
-- -- Represents a conversation thread between two or more users.
-- --------------
CREATE TABLE IF NOT EXISTS public.message_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subject TEXT, -- Optional subject for the thread
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now() -- To track last message time
);
COMMENT ON TABLE public.message_threads IS 'Represents a conversation thread between users.';

-- --------------
-- -- Message Thread Participants Table
-- -- Links users to message threads.
-- --------------
CREATE TABLE IF NOT EXISTS public.message_thread_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE, -- Denormalized
  unread_count INT DEFAULT 0 NOT NULL,
  last_read_at TIMESTAMPTZ, -- When the user last viewed this thread
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (thread_id, user_id)
);
COMMENT ON TABLE public.message_thread_participants IS 'Links users to message threads and tracks unread status.';

-- --------------
-- -- Messages Table
-- -- Stores individual messages within a thread.
-- --------------
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE, -- Denormalized
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.messages IS 'Stores individual messages within a thread.';

-- --------------
-- -- Message Read Statuses Table (Optional - for detailed per-message read tracking)
-- -- This helps if you need to know if EACH message was read by EACH recipient.
-- -- For unread_count on thread_participants, simpler logic or triggers might be used.
-- --------------
CREATE TABLE IF NOT EXISTS public.message_read_statuses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE, -- The recipient who read the message
  thread_id UUID NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE, -- Denormalized
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE, -- Denormalized
  is_read BOOLEAN DEFAULT TRUE NOT NULL, -- Assumed true once a record is created
  read_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (message_id, user_id)
);
COMMENT ON TABLE public.message_read_statuses IS 'Tracks read status of each message by each recipient.';


-- #############################################################################
-- ## Billing View
-- #############################################################################

CREATE OR REPLACE VIEW public.student_account_balances_view AS
SELECT
    s.id AS student_id,
    s.first_name AS student_first_name,
    s.last_name AS student_last_name,
    s.tenant_id,
    COALESCE(SUM(sf.amount) FILTER (WHERE sf.is_paid = FALSE), 0.00) AS total_outstanding_fees,
    COALESCE(SUM(sf.amount) FILTER (WHERE sf.is_paid = TRUE), 0.00) AS total_paid_fees,
    COALESCE(SUM(sp.amount_paid), 0.00) AS total_payments_received,
    (COALESCE(SUM(sf.amount), 0.00) - COALESCE(SUM(sp.amount_paid), 0.00)) AS current_balance_raw, -- Total fees - total payments
    (COALESCE(SUM(sf.amount) FILTER (WHERE sf.is_paid = FALSE), 0.00) - (COALESCE(SUM(sp.amount_paid), 0.00) - COALESCE(SUM(sf.amount) FILTER (WHERE sf.is_paid = TRUE), 0.00))) AS current_balance_intuitive -- Outstanding fees - (unallocated payments)
FROM
    public.students s
LEFT JOIN
    public.student_fees sf ON s.id = sf.student_id AND s.tenant_id = sf.tenant_id
LEFT JOIN
    public.student_payments sp ON s.id = sp.student_id AND s.tenant_id = sp.tenant_id
WHERE
    s.tenant_id = public.get_current_tenant_id()
GROUP BY
    s.id, s.first_name, s.last_name, s.tenant_id;

COMMENT ON VIEW public.student_account_balances_view IS 'Calculates total fees, total payments, and current balance for each student, scoped by tenant.';


-- #############################################################################
-- ## Helper Functions for RLS
-- #############################################################################

CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS UUID
LANGUAGE sql STABLE
AS $$
  SELECT nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'app_metadata_tenant_id', '')::UUID;
$$;
COMMENT ON FUNCTION public.get_current_tenant_id() IS 'Retrieves tenant_id from JWT custom claims (app_metadata.tenant_id).';

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE sql STABLE
AS $$
  SELECT nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'app_metadata_role', '');
$$;
COMMENT ON FUNCTION public.get_current_user_role() IS 'Retrieves role from JWT custom claims (app_metadata.role).';

CREATE OR REPLACE FUNCTION public.is_parent_of_student(student_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER -- Important: Must be able to query parent_student_links
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.parent_student_links psl
    WHERE psl.student_id = student_uuid
      AND psl.parent_user_id = auth.uid()
      AND psl.tenant_id = public.get_current_tenant_id() -- Ensure link is within the same tenant
  );
$$;
COMMENT ON FUNCTION public.is_parent_of_student(student_uuid UUID) IS 'Checks if the current user is a linked parent of the given student.';

CREATE OR REPLACE FUNCTION public.get_student_id_for_user()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT s.id
  FROM public.students s
  JOIN public.user_profiles up ON s.user_profile_id = up.id
  WHERE up.id = auth.uid() AND up.tenant_id = public.get_current_tenant_id();
$$;
COMMENT ON FUNCTION public.get_student_id_for_user() IS 'Retrieves the student.id for the currently logged-in user if they are a student.';


-- #############################################################################
-- ## Row Level Security (RLS) Policies
-- #############################################################################

-- --------------
-- -- Tenants RLS
-- --------------
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant users can view their own tenant" ON public.tenants;
CREATE POLICY "Tenant users can view their own tenant"
  ON public.tenants FOR SELECT
  USING (id = public.get_current_tenant_id());

DROP POLICY IF EXISTS "Allow all access for service_role on tenants" ON public.tenants;
CREATE POLICY "Allow all access for service_role on tenants"
  ON public.tenants FOR ALL
  USING (auth.role() = 'service_role'); 

-- --------------
-- -- User Profiles RLS
-- --------------
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
CREATE POLICY "Users can view their own profile"
  ON public.user_profiles FOR SELECT
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
CREATE POLICY "Users can update their own profile"
  ON public.user_profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid()); 

DROP POLICY IF EXISTS "Tenant admins can manage profiles in their tenant" ON public.user_profiles;
CREATE POLICY "Tenant admins can manage profiles in their tenant"
  ON public.user_profiles FOR ALL 
  USING (
    tenant_id = public.get_current_tenant_id() AND
    public.get_current_user_role() = 'admin'
  )
  WITH CHECK ( 
    tenant_id = public.get_current_tenant_id() AND
    public.get_current_user_role() = 'admin'
  );
  
DROP POLICY IF EXISTS "Users can view profiles in their own tenant" ON public.user_profiles;
CREATE POLICY "Users can view profiles in their own tenant"
    ON public.user_profiles FOR SELECT
    USING (tenant_id = public.get_current_tenant_id());


DROP POLICY IF EXISTS "Allow all access for service_role on user_profiles" ON public.user_profiles;
CREATE POLICY "Allow all access for service_role on user_profiles"
  ON public.user_profiles FOR ALL
  USING (auth.role() = 'service_role');

-- --------------
-- -- Grade Levels RLS
-- --------------
ALTER TABLE public.grade_levels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view grade levels in their tenant" ON public.grade_levels;
CREATE POLICY "Authenticated users can view grade levels in their tenant"
  ON public.grade_levels FOR SELECT
  USING (tenant_id = public.get_current_tenant_id());

DROP POLICY IF EXISTS "Tenant admins can manage grade levels" ON public.grade_levels;
CREATE POLICY "Tenant admins can manage grade levels"
  ON public.grade_levels FOR ALL
  USING (tenant_id = public.get_current_tenant_id() AND public.get_current_user_role() = 'admin')
  WITH CHECK (tenant_id = public.get_current_tenant_id() AND public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Allow all access for service_role on grade_levels" ON public.grade_levels;
CREATE POLICY "Allow all access for service_role on grade_levels"
  ON public.grade_levels FOR ALL
  USING (auth.role() = 'service_role');

-- --------------
-- -- Students RLS
-- --------------
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant admins and teachers can view students in their tenant" ON public.students;
CREATE POLICY "Tenant admins and teachers can view students in their tenant"
  ON public.students FOR SELECT
  USING (tenant_id = public.get_current_tenant_id() AND (public.get_current_user_role() = 'admin' OR public.get_current_user_role() = 'teacher'));

DROP POLICY IF EXISTS "Students can view their own student record" ON public.students;
CREATE POLICY "Students can view their own student record"
  ON public.students FOR SELECT
  USING (tenant_id = public.get_current_tenant_id() AND user_profile_id = auth.uid() AND public.get_current_user_role() = 'student');

DROP POLICY IF EXISTS "Parents can view their linked children's student records" ON public.students;
CREATE POLICY "Parents can view their linked children's student records"
  ON public.students FOR SELECT
  USING (tenant_id = public.get_current_tenant_id() AND public.is_parent_of_student(id) AND public.get_current_user_role() = 'parent');
  
DROP POLICY IF EXISTS "Tenant admins can manage students" ON public.students;
CREATE POLICY "Tenant admins can manage students"
  ON public.students FOR ALL
  USING (tenant_id = public.get_current_tenant_id() AND public.get_current_user_role() = 'admin')
  WITH CHECK (tenant_id = public.get_current_tenant_id() AND public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Allow all access for service_role on students" ON public.students;
CREATE POLICY "Allow all access for service_role on students"
  ON public.students FOR ALL
  USING (auth.role() = 'service_role');

-- --------------
-- -- Parent Student Links RLS
-- --------------
ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Parents can view their own links" ON public.parent_student_links;
CREATE POLICY "Parents can view their own links"
  ON public.parent_student_links FOR SELECT
  USING (parent_user_id = auth.uid() AND tenant_id = public.get_current_tenant_id());

DROP POLICY IF EXISTS "Tenant admins can manage parent_student_links" ON public.parent_student_links;
CREATE POLICY "Tenant admins can manage parent_student_links"
  ON public.parent_student_links FOR ALL
  USING (tenant_id = public.get_current_tenant_id() AND public.get_current_user_role() = 'admin')
  WITH CHECK (tenant_id = public.get_current_tenant_id() AND public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Allow all access for service_role on parent_student_links" ON public.parent_student_links;
CREATE POLICY "Allow all access for service_role on parent_student_links"
  ON public.parent_student_links FOR ALL
  USING (auth.role() = 'service_role');


-- --------------
-- -- Academic Years RLS
-- --------------
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view academic years in their tenant" ON public.academic_years;
CREATE POLICY "Authenticated users can view academic years in their tenant"
  ON public.academic_years FOR SELECT
  USING (tenant_id = public.get_current_tenant_id());

DROP POLICY IF EXISTS "Tenant admins can manage academic_years" ON public.academic_years;
CREATE POLICY "Tenant admins can manage academic_years"
  ON public.academic_years FOR ALL
  USING (tenant_id = public.get_current_tenant_id() AND public.get_current_user_role() = 'admin')
  WITH CHECK (tenant_id = public.get_current_tenant_id() AND public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Allow all access for service_role on academic_years" ON public.academic_years;
CREATE POLICY "Allow all access for service_role on academic_years"
  ON public.academic_years FOR ALL
  USING (auth.role() = 'service_role');

-- --------------
-- -- Marking Periods RLS
-- --------------
ALTER TABLE public.marking_periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view marking periods in their tenant" ON public.marking_periods;
CREATE POLICY "Authenticated users can view marking periods in their tenant"
  ON public.marking_periods FOR SELECT
  USING (tenant_id = public.get_current_tenant_id());
  
DROP POLICY IF EXISTS "Tenant admins can manage marking_periods" ON public.marking_periods;
CREATE POLICY "Tenant admins can manage marking_periods"
  ON public.marking_periods FOR ALL
  USING (tenant_id = public.get_current_tenant_id() AND public.get_current_user_role() = 'admin')
  WITH CHECK (tenant_id = public.get_current_tenant_id() AND public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Allow all access for service_role on marking_periods" ON public.marking_periods;
CREATE POLICY "Allow all access for service_role on marking_periods"
  ON public.marking_periods FOR ALL
  USING (auth.role() = 'service_role');

-- --------------
-- -- Subjects RLS
-- --------------
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view subjects in their tenant" ON public.subjects;
CREATE POLICY "Authenticated users can view subjects in their tenant"
  ON public.subjects FOR SELECT
  USING (tenant_id = public.get_current_tenant_id());

DROP POLICY IF EXISTS "Tenant admins and teachers can manage subjects" ON public.subjects;
CREATE POLICY "Tenant admins and teachers can manage subjects"
  ON public.subjects FOR ALL
  USING (tenant_id = public.get_current_tenant_id() AND (public.get_current_user_role() = 'admin' OR public.get_current_user_role() = 'teacher'))
  WITH CHECK (tenant_id = public.get_current_tenant_id() AND (public.get_current_user_role() = 'admin' OR public.get_current_user_role() = 'teacher'));

DROP POLICY IF EXISTS "Allow all access for service_role on subjects" ON public.subjects;
CREATE POLICY "Allow all access for service_role on subjects"
  ON public.subjects FOR ALL
  USING (auth.role() = 'service_role');

-- --------------
-- -- Courses RLS
-- --------------
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view courses in their tenant" ON public.courses;
CREATE POLICY "Authenticated users can view courses in their tenant"
  ON public.courses FOR SELECT
  USING (tenant_id = public.get_current_tenant_id());

DROP POLICY IF EXISTS "Tenant admins and teachers can manage courses" ON public.courses;
CREATE POLICY "Tenant admins and teachers can manage courses"
  ON public.courses FOR ALL
  USING (tenant_id = public.get_current_tenant_id() AND (public.get_current_user_role() = 'admin' OR public.get_current_user_role() = 'teacher'))
  WITH CHECK (tenant_id = public.get_current_tenant_id() AND (public.get_current_user_role() = 'admin' OR public.get_current_user_role() = 'teacher'));

DROP POLICY IF EXISTS "Allow all access for service_role on courses" ON public.courses;
CREATE POLICY "Allow all access for service_role on courses"
  ON public.courses FOR ALL
  USING (auth.role() = 'service_role');

-- --------------
-- -- Course Periods RLS
-- --------------
ALTER TABLE public.course_periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant admins and teachers can manage course_periods" ON public.course_periods;
CREATE POLICY "Tenant admins and teachers can manage course_periods"
  ON public.course_periods FOR ALL
  USING (tenant_id = public.get_current_tenant_id() AND (public.get_current_user_role() = 'admin' OR public.get_current_user_role() = 'teacher'))
  WITH CHECK (tenant_id = public.get_current_tenant_id() AND (public.get_current_user_role() = 'admin' OR public.get_current_user_role() = 'teacher'));
  
DROP POLICY IF EXISTS "Students and Parents can view their relevant course_periods" ON public.course_periods;
CREATE POLICY "Students and Parents can view their relevant course_periods"
  ON public.course_periods FOR SELECT
  USING (
    tenant_id = public.get_current_tenant_id() AND
    id IN (
        SELECT se.course_period_id FROM public.student_enrollments se 
        WHERE 
            se.tenant_id = public.get_current_tenant_id() AND
            (
                (public.get_current_user_role() = 'student' AND se.student_id = public.get_student_id_for_user()) OR
                (public.get_current_user_role() = 'parent' AND public.is_parent_of_student(se.student_id))
            )
    )
  );

DROP POLICY IF EXISTS "Allow all access for service_role on course_periods" ON public.course_periods;
CREATE POLICY "Allow all access for service_role on course_periods"
  ON public.course_periods FOR ALL
  USING (auth.role() = 'service_role');

-- --------------
-- -- Student Enrollments RLS
-- --------------
ALTER TABLE public.student_enrollments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant admins and teachers can manage student_enrollments" ON public.student_enrollments;
CREATE POLICY "Tenant admins and teachers can manage student_enrollments"
  ON public.student_enrollments FOR ALL
  USING (tenant_id = public.get_current_tenant_id() AND (public.get_current_user_role() = 'admin' OR public.get_current_user_role() = 'teacher'))
  WITH CHECK (tenant_id = public.get_current_tenant_id() AND (public.get_current_user_role() = 'admin' OR public.get_current_user_role() = 'teacher'));

DROP POLICY IF EXISTS "Students and Parents can view their relevant student_enrollments" ON public.student_enrollments;
CREATE POLICY "Students and Parents can view their relevant student_enrollments"
  ON public.student_enrollments FOR SELECT
  USING (
    tenant_id = public.get_current_tenant_id() AND
    (
        (public.get_current_user_role() = 'student' AND student_id = public.get_student_id_for_user()) OR
        (public.get_current_user_role() = 'parent' AND public.is_parent_of_student(student_id))
    )
  );
  
DROP POLICY IF EXISTS "Allow all access for service_role on student_enrollments" ON public.student_enrollments;
CREATE POLICY "Allow all access for service_role on student_enrollments"
  ON public.student_enrollments FOR ALL
  USING (auth.role() = 'service_role');

-- --------------
-- -- Attendance Codes RLS
-- --------------
ALTER TABLE public.attendance_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant admins can manage attendance codes" ON public.attendance_codes;
CREATE POLICY "Tenant admins can manage attendance codes"
  ON public.attendance_codes FOR ALL
  USING (
    tenant_id = public.get_current_tenant_id() AND
    public.get_current_user_role() = 'admin'
  )
  WITH CHECK (
    tenant_id = public.get_current_tenant_id() AND
    public.get_current_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "Authenticated users can view attendance codes in their tenant" ON public.attendance_codes;
CREATE POLICY "Authenticated users can view attendance codes in their tenant"
  ON public.attendance_codes FOR SELECT
  USING (tenant_id = public.get_current_tenant_id());

DROP POLICY IF EXISTS "Allow all access for service_role on attendance_codes" ON public.attendance_codes;
CREATE POLICY "Allow all access for service_role on attendance_codes"
  ON public.attendance_codes FOR ALL
  USING (auth.role() = 'service_role');

-- --------------
-- -- Attendance Records RLS
-- --------------
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant admins can manage attendance records" ON public.attendance_records;
CREATE POLICY "Tenant admins can manage attendance records"
  ON public.attendance_records FOR ALL
  USING (
    tenant_id = public.get_current_tenant_id() AND
    public.get_current_user_role() = 'admin'
  )
  WITH CHECK (
    tenant_id = public.get_current_tenant_id() AND
    public.get_current_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "Teachers can manage attendance for their course periods" ON public.attendance_records;
CREATE POLICY "Teachers can manage attendance for their course periods"
  ON public.attendance_records FOR ALL 
  USING (
    tenant_id = public.get_current_tenant_id() AND
    auth.uid() = taken_by_user_id AND 
    course_period_id IN (SELECT cp.id FROM public.course_periods cp WHERE cp.tenant_id = public.get_current_tenant_id() AND cp.teacher_id = auth.uid())
  )
  WITH CHECK (
    tenant_id = public.get_current_tenant_id() AND
    auth.uid() = taken_by_user_id AND
    course_period_id IN (SELECT cp.id FROM public.course_periods cp WHERE cp.tenant_id = public.get_current_tenant_id() AND cp.teacher_id = auth.uid())
  );
  
DROP POLICY IF EXISTS "Teachers, Students, and Parents can view relevant attendance records (SELECT)" ON public.attendance_records;
CREATE POLICY "Teachers, Students, and Parents can view relevant attendance records (SELECT)"
  ON public.attendance_records FOR SELECT
  USING (
    tenant_id = public.get_current_tenant_id() AND
    (
        ( (public.get_current_user_role() = 'teacher') AND course_period_id IN (SELECT cp.id FROM public.course_periods cp WHERE cp.tenant_id = public.get_current_tenant_id() AND cp.teacher_id = auth.uid()) ) OR
        ( (public.get_current_user_role() = 'student') AND student_id = public.get_student_id_for_user() ) OR
        ( (public.get_current_user_role() = 'parent') AND public.is_parent_of_student(student_id) )
    )
  );

DROP POLICY IF EXISTS "Allow all access for service_role on attendance_records" ON public.attendance_records;
CREATE POLICY "Allow all access for service_role on attendance_records"
  ON public.attendance_records FOR ALL
  USING (auth.role() = 'service_role');

-- --------------
-- -- Assignment Types RLS
-- --------------
ALTER TABLE public.assignment_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant admins can manage assignment types" ON public.assignment_types;
CREATE POLICY "Tenant admins can manage assignment types"
  ON public.assignment_types FOR ALL
  USING (
    tenant_id = public.get_current_tenant_id() AND
    public.get_current_user_role() = 'admin'
  )
  WITH CHECK (
    tenant_id = public.get_current_tenant_id() AND
    public.get_current_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "Authenticated users can view assignment types in their tenant" ON public.assignment_types;
CREATE POLICY "Authenticated users can view assignment types in their tenant"
  ON public.assignment_types FOR SELECT
  USING (tenant_id = public.get_current_tenant_id());

DROP POLICY IF EXISTS "Allow all access for service_role on assignment_types" ON public.assignment_types;
CREATE POLICY "Allow all access for service_role on assignment_types"
  ON public.assignment_types FOR ALL
  USING (auth.role() = 'service_role');
  
-- --------------
-- -- Assignments RLS
-- --------------
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant admins can manage assignments" ON public.assignments;
CREATE POLICY "Tenant admins can manage assignments"
  ON public.assignments FOR ALL
  USING (
    tenant_id = public.get_current_tenant_id() AND
    public.get_current_user_role() = 'admin'
  )
  WITH CHECK (
    tenant_id = public.get_current_tenant_id() AND
    public.get_current_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "Teachers can manage assignments for their course periods" ON public.assignments;
CREATE POLICY "Teachers can manage assignments for their course periods"
  ON public.assignments FOR ALL
  USING (
    tenant_id = public.get_current_tenant_id() AND
    course_period_id IN (SELECT cp.id FROM public.course_periods cp WHERE cp.tenant_id = public.get_current_tenant_id() AND cp.teacher_id = auth.uid())
  )
  WITH CHECK (
    tenant_id = public.get_current_tenant_id() AND
    course_period_id IN (SELECT cp.id FROM public.course_periods cp WHERE cp.tenant_id = public.get_current_tenant_id() AND cp.teacher_id = auth.uid())
  );

DROP POLICY IF EXISTS "Students and Parents can view assignments for relevant course periods" ON public.assignments;
CREATE POLICY "Students and Parents can view assignments for relevant course periods"
    ON public.assignments FOR SELECT
    USING (
        tenant_id = public.get_current_tenant_id() AND
        course_period_id IN (
            SELECT se.course_period_id FROM public.student_enrollments se
            WHERE 
                se.tenant_id = public.get_current_tenant_id() AND
                (
                    (public.get_current_user_role() = 'student' AND se.student_id = public.get_student_id_for_user()) OR
                    (public.get_current_user_role() = 'parent' AND public.is_parent_of_student(se.student_id))
                )
        )
    );

DROP POLICY IF EXISTS "Allow all access for service_role on assignments" ON public.assignments;
CREATE POLICY "Allow all access for service_role on assignments"
  ON public.assignments FOR ALL
  USING (auth.role() = 'service_role');

-- --------------
-- -- Student Grades RLS
-- --------------
ALTER TABLE public.student_grades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant admins can manage student grades" ON public.student_grades;
CREATE POLICY "Tenant admins can manage student grades"
  ON public.student_grades FOR ALL
  USING (
    tenant_id = public.get_current_tenant_id() AND
    public.get_current_user_role() = 'admin'
  )
  WITH CHECK (
    tenant_id = public.get_current_tenant_id() AND
    public.get_current_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "Teachers can manage student grades for their course periods" ON public.student_grades;
CREATE POLICY "Teachers can manage student grades for their course periods"
  ON public.student_grades FOR ALL
  USING (
    tenant_id = public.get_current_tenant_id() AND
    course_period_id IN (SELECT cp.id FROM public.course_periods cp WHERE cp.tenant_id = public.get_current_tenant_id() AND cp.teacher_id = auth.uid())
  )
  WITH CHECK (
    tenant_id = public.get_current_tenant_id() AND
    course_period_id IN (SELECT cp.id FROM public.course_periods cp WHERE cp.tenant_id = public.get_current_tenant_id() AND cp.teacher_id = auth.uid())
  );

DROP POLICY IF EXISTS "Students and Parents can view their relevant student grades" ON public.student_grades;
CREATE POLICY "Students and Parents can view their relevant student grades"
    ON public.student_grades FOR SELECT
    USING (
        tenant_id = public.get_current_tenant_id() AND
        (
            (public.get_current_user_role() = 'student' AND student_id = public.get_student_id_for_user()) OR
            (public.get_current_user_role() = 'parent' AND public.is_parent_of_student(student_id))
        )
    );

DROP POLICY IF EXISTS "Allow all access for service_role on student_grades" ON public.student_grades;
CREATE POLICY "Allow all access for service_role on student_grades"
  ON public.student_grades FOR ALL
  USING (auth.role() = 'service_role');

-- --------------
-- -- Discipline Incident Types RLS
-- --------------
ALTER TABLE public.discipline_incident_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant admins can manage discipline incident types" ON public.discipline_incident_types;
CREATE POLICY "Tenant admins can manage discipline incident types"
  ON public.discipline_incident_types FOR ALL
  USING (
    tenant_id = public.get_current_tenant_id() AND
    public.get_current_user_role() = 'admin'
  )
  WITH CHECK (
    tenant_id = public.get_current_tenant_id() AND
    public.get_current_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "Authenticated staff can view discipline incident types" ON public.discipline_incident_types;
CREATE POLICY "Authenticated staff can view discipline incident types"
  ON public.discipline_incident_types FOR SELECT
  USING (
    tenant_id = public.get_current_tenant_id() AND
    (public.get_current_user_role() = 'admin' OR public.get_current_user_role() = 'teacher' OR public.get_current_user_role() = 'support_staff')
  );
  
DROP POLICY IF EXISTS "Allow all access for service_role on discipline_incident_types" ON public.discipline_incident_types;
CREATE POLICY "Allow all access for service_role on discipline_incident_types"
  ON public.discipline_incident_types FOR ALL
  USING (auth.role() = 'service_role');

-- --------------
-- -- Discipline Incidents RLS
-- --------------
ALTER TABLE public.discipline_incidents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant admins can manage all discipline incidents" ON public.discipline_incidents;
CREATE POLICY "Tenant admins can manage all discipline incidents"
  ON public.discipline_incidents FOR ALL
  USING (
    tenant_id = public.get_current_tenant_id() AND
    public.get_current_user_role() = 'admin'
  )
  WITH CHECK (
    tenant_id = public.get_current_tenant_id() AND
    public.get_current_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "Staff can create discipline incidents" ON public.discipline_incidents;
CREATE POLICY "Staff can create discipline incidents"
  ON public.discipline_incidents FOR INSERT
  WITH CHECK (
    tenant_id = public.get_current_tenant_id() AND
    (public.get_current_user_role() = 'admin' OR public.get_current_user_role() = 'teacher' OR public.get_current_user_role() = 'support_staff') AND
    reported_by_user_id = auth.uid() -- Ensure reporter is the current user
  );

DROP POLICY IF EXISTS "Staff can view discipline incidents they reported or are for students in their classes (simplified)" ON public.discipline_incidents;
CREATE POLICY "Staff can view discipline incidents they reported or are for students in their classes (simplified)"
  ON public.discipline_incidents FOR SELECT
  USING (
    tenant_id = public.get_current_tenant_id() AND
    (
        (public.get_current_user_role() = 'admin' OR public.get_current_user_role() = 'teacher' OR public.get_current_user_role() = 'support_staff') AND 
        (
            reported_by_user_id = auth.uid() OR
            -- More complex: student_id IN (SELECT student_id FROM student_enrollments WHERE course_period_id IN (SELECT id FROM course_periods WHERE teacher_id = auth.uid()))
            -- For simplicity now, teachers mainly see what they reported. Admins see all via their own policy.
            (public.get_current_user_role() = 'teacher' AND reported_by_user_id = auth.uid()) 
        )
    )
  );
  
-- (Future: Students/Parents policies for read-only access to their own/child's resolved incidents)

DROP POLICY IF EXISTS "Allow all access for service_role on discipline_incidents" ON public.discipline_incidents;
CREATE POLICY "Allow all access for service_role on discipline_incidents"
  ON public.discipline_incidents FOR ALL
  USING (auth.role() = 'service_role');

-- --------------
-- -- Fee Types RLS
-- --------------
ALTER TABLE public.fee_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant admins can manage fee types" ON public.fee_types;
CREATE POLICY "Tenant admins can manage fee types"
  ON public.fee_types FOR ALL
  USING (tenant_id = public.get_current_tenant_id() AND public.get_current_user_role() = 'admin')
  WITH CHECK (tenant_id = public.get_current_tenant_id() AND public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Authenticated users can view fee types" ON public.fee_types;
CREATE POLICY "Authenticated users can view fee types"
  ON public.fee_types FOR SELECT
  USING (tenant_id = public.get_current_tenant_id());

-- --------------
-- -- Student Fees RLS
-- --------------
ALTER TABLE public.student_fees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant admins can manage student fees" ON public.student_fees;
CREATE POLICY "Tenant admins can manage student fees"
  ON public.student_fees FOR ALL
  USING (tenant_id = public.get_current_tenant_id() AND public.get_current_user_role() = 'admin')
  WITH CHECK (tenant_id = public.get_current_tenant_id() AND public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Parents/Students can view their own/child's fees" ON public.student_fees;
CREATE POLICY "Parents/Students can view their own/child's fees"
  ON public.student_fees FOR SELECT
  USING (
    tenant_id = public.get_current_tenant_id() AND
    (
      (public.get_current_user_role() = 'student' AND student_id = public.get_student_id_for_user()) OR
      (public.get_current_user_role() = 'parent' AND public.is_parent_of_student(student_id))
    )
  );

-- --------------
-- -- Student Payments RLS
-- --------------
ALTER TABLE public.student_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant admins can manage student payments" ON public.student_payments;
CREATE POLICY "Tenant admins can manage student payments"
  ON public.student_payments FOR ALL
  USING (tenant_id = public.get_current_tenant_id() AND public.get_current_user_role() = 'admin')
  WITH CHECK (tenant_id = public.get_current_tenant_id() AND public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Parents/Students can view their own/child's payments" ON public.student_payments;
CREATE POLICY "Parents/Students can view their own/child's payments"
  ON public.student_payments FOR SELECT
  USING (
    tenant_id = public.get_current_tenant_id() AND
    (
      (public.get_current_user_role() = 'student' AND student_id = public.get_student_id_for_user()) OR
      (public.get_current_user_role() = 'parent' AND public.is_parent_of_student(student_id))
    )
  );
  
-- --------------
-- -- Student Account Balances View RLS
-- -- Note: Views don't have direct RLS policies like tables. Access is controlled by RLS on underlying tables
-- -- and conditions within the view itself (like tenant_id = public.get_current_tenant_id()).
-- -- The SELECT policies on student_fees and student_payments will effectively control who can see what through this view.
-- --------------

-- --------------
-- -- Report Card Course Comments RLS
-- --------------
ALTER TABLE public.report_card_course_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant admins can manage report card comments" ON public.report_card_course_comments;
CREATE POLICY "Tenant admins can manage report card comments"
  ON public.report_card_course_comments FOR ALL
  USING (tenant_id = public.get_current_tenant_id() AND public.get_current_user_role() = 'admin')
  WITH CHECK (tenant_id = public.get_current_tenant_id() AND public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Teachers can manage comments for their course periods" ON public.report_card_course_comments;
CREATE POLICY "Teachers can manage comments for their course periods"
  ON public.report_card_course_comments FOR ALL
  USING (
    tenant_id = public.get_current_tenant_id() AND
    course_period_id IN (SELECT cp.id FROM public.course_periods cp WHERE cp.tenant_id = public.get_current_tenant_id() AND cp.teacher_id = auth.uid()) AND
    created_by_user_id = auth.uid() -- Teacher can only manage their own comments
  )
  WITH CHECK (
    tenant_id = public.get_current_tenant_id() AND
    course_period_id IN (SELECT cp.id FROM public.course_periods cp WHERE cp.tenant_id = public.get_current_tenant_id() AND cp.teacher_id = auth.uid()) AND
    created_by_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Students and Parents can view report card comments for relevant courses" ON public.report_card_course_comments;
CREATE POLICY "Students and Parents can view report card comments for relevant courses"
  ON public.report_card_course_comments FOR SELECT
  USING (
    tenant_id = public.get_current_tenant_id() AND
    (
        (public.get_current_user_role() = 'student' AND student_id = public.get_student_id_for_user()) OR
        (public.get_current_user_role() = 'parent' AND public.is_parent_of_student(student_id))
    )
  );

DROP POLICY IF EXISTS "Allow all access for service_role on report_card_course_comments" ON public.report_card_course_comments;
CREATE POLICY "Allow all access for service_role on report_card_course_comments"
  ON public.report_card_course_comments FOR ALL
  USING (auth.role() = 'service_role');

-- --------------
-- -- Announcements RLS
-- --------------
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant admins can manage announcements" ON public.announcements;
CREATE POLICY "Tenant admins can manage announcements"
  ON public.announcements FOR ALL
  USING (tenant_id = public.get_current_tenant_id() AND public.get_current_user_role() = 'admin')
  WITH CHECK (tenant_id = public.get_current_tenant_id() AND public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Authenticated users can view published announcements" ON public.announcements;
CREATE POLICY "Authenticated users can view published announcements"
  ON public.announcements FOR SELECT
  USING (
    tenant_id = public.get_current_tenant_id() AND
    is_published = TRUE AND
    start_date <= now() AND
    (end_date IS NULL OR end_date >= now()) AND
    (
      target_roles IS NULL OR -- Visible to all if target_roles is NULL
      array_length(target_roles, 1) IS NULL OR -- Visible to all if target_roles is an empty array {}
      public.get_current_user_role() = ANY(target_roles) -- Visible if user's role is in target_roles
    )
  );

DROP POLICY IF EXISTS "Allow all access for service_role on announcements" ON public.announcements;
CREATE POLICY "Allow all access for service_role on announcements"
  ON public.announcements FOR ALL
  USING (auth.role() = 'service_role');

-- --------------
-- -- Message Threads RLS
-- --------------
ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view threads they are a participant in" ON public.message_threads;
CREATE POLICY "Users can view threads they are a participant in"
  ON public.message_threads FOR SELECT
  USING (
    tenant_id = public.get_current_tenant_id() AND
    id IN (SELECT thread_id FROM public.message_thread_participants WHERE user_id = auth.uid())
  );
-- INSERT is handled by creating a message, which can create a thread.
-- UPDATE/DELETE can be admin-only or more complex (e.g., only if no messages). For now, no direct UPDATE/DELETE policies for users.
DROP POLICY IF EXISTS "Allow all access for service_role on message_threads" ON public.message_threads;
CREATE POLICY "Allow all access for service_role on message_threads"
  ON public.message_threads FOR ALL
  USING (auth.role() = 'service_role');

-- --------------
-- -- Message Thread Participants RLS
-- --------------
ALTER TABLE public.message_thread_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own participation" ON public.message_thread_participants;
CREATE POLICY "Users can manage their own participation"
  ON public.message_thread_participants FOR ALL -- SELECT, INSERT, UPDATE (for unread_count, last_read_at)
  USING (tenant_id = public.get_current_tenant_id() AND user_id = auth.uid())
  WITH CHECK (tenant_id = public.get_current_tenant_id() AND user_id = auth.uid());
-- Admins might need broader policies if they need to manage participants, not covered in this basic setup.
DROP POLICY IF EXISTS "Allow all access for service_role on message_thread_participants" ON public.message_thread_participants;
CREATE POLICY "Allow all access for service_role on message_thread_participants"
  ON public.message_thread_participants FOR ALL
  USING (auth.role() = 'service_role');

-- --------------
-- -- Messages RLS
-- --------------
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access messages in their participated threads" ON public.messages;
CREATE POLICY "Users can access messages in their participated threads"
  ON public.messages FOR ALL -- SELECT for reading, INSERT for sending
  USING (
    tenant_id = public.get_current_tenant_id() AND
    thread_id IN (SELECT thread_id FROM public.message_thread_participants WHERE user_id = auth.uid())
  )
  WITH CHECK (
    tenant_id = public.get_current_tenant_id() AND
    thread_id IN (SELECT thread_id FROM public.message_thread_participants WHERE user_id = auth.uid()) AND
    sender_id = auth.uid() -- Users can only send messages as themselves
  );
-- UPDATE/DELETE of messages can be restricted (e.g., only sender for a short period, or admin only). For now, no specific UPDATE/DELETE policies for users.
DROP POLICY IF EXISTS "Allow all access for service_role on messages" ON public.messages;
CREATE POLICY "Allow all access for service_role on messages"
  ON public.messages FOR ALL
  USING (auth.role() = 'service_role');

-- --------------
-- -- Message Read Statuses RLS
-- --------------
ALTER TABLE public.message_read_statuses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own message read statuses" ON public.message_read_statuses;
CREATE POLICY "Users can manage their own message read statuses"
  ON public.message_read_statuses FOR ALL
  USING (tenant_id = public.get_current_tenant_id() AND user_id = auth.uid())
  WITH CHECK (tenant_id = public.get_current_tenant_id() AND user_id = auth.uid());

DROP POLICY IF EXISTS "Allow all access for service_role on message_read_statuses" ON public.message_read_statuses;
CREATE POLICY "Allow all access for service_role on message_read_statuses"
  ON public.message_read_statuses FOR ALL
  USING (auth.role() = 'service_role');


-- #############################################################################
-- ## TODO: Seeding Data (Optional - for development)
-- #############################################################################
-- Example (ensure a tenant exists for these to work if tenant_id is from get_current_tenant_id()):
--
-- -- Assuming a tenant has been created and its UUID is known.
-- -- Replace 'your_tenant_id_here' with an actual tenant ID.
--
-- -- INSERT INTO public.grade_levels (tenant_id, name, sort_order) VALUES
-- -- ('your_tenant_id_here', 'Kindergarten', 1),
-- -- ('your_tenant_id_here', 'Grade 1', 2),
-- -- ('your_tenant_id_here', 'Grade 2', 3)
-- -- ON CONFLICT (tenant_id, name) DO NOTHING;
--
-- -- INSERT INTO public.students (tenant_id, first_name, last_name, current_grade_level_id)
-- -- VALUES
-- -- ('your_tenant_id_here', 'John', 'Doe', (SELECT id from public.grade_levels WHERE name='Grade 1' AND tenant_id='your_tenant_id_here')),
-- -- ('your_tenant_id_here', 'Jane', 'Smith', (SELECT id from public.grade_levels WHERE name='Grade 2' AND tenant_id='your_tenant_id_here'))
-- -- ON CONFLICT (tenant_id, student_identifier) DO NOTHING;

-- Note on `get_current_tenant_id()`:
-- This function relies on the JWT custom claims. The `handle_new_user` function
-- (from `myschoo-saas-app/supabase/functions/handle_new_user.sql`)
-- is responsible for populating `raw_app_meta_data` in `auth.users` upon user sign-up,
-- which Supabase then uses to include `tenant_id` and `role` in the JWT's `app_metadata`.
-- If `app_metadata.tenant_id` is not present in the JWT, `get_current_tenant_id()` will return NULL,
-- and RLS policies based on it will effectively block access unless the user has `service_role` privileges.

-- Final check on RLS enablement:
-- SELECT relname, relrowsecurity FROM pg_class WHERE relkind = 'r' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
-- Ensure relrowsecurity is true for all relevant tables.

SELECT 'Database setup script completed.';

[end of myschoo-saas-app/supabase/database_setup.sql]
