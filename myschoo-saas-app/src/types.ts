// src/types.ts

// Basic UserProfile structure, can be expanded as needed
export interface UserProfile {
  id: string; // Corresponds to auth.users.id
  tenant_id?: string | null;
  email?: string | null;
  role?: string | null;
  full_name?: string | null;
  is_active?: boolean; // Added for staff management
}

export interface StudentGrade {
  id?: string;
  tenant_id?: string;
  assignment_id: string;
  student_enrollment_id: string; // This is the ID from student_enrollments table
  student_id: string; // Denormalized: students.id
  course_period_id: string; // Denormalized: course_periods.id
  points_earned?: number | null;
  grade_percentage?: number | null;
  grade_letter?: string | null;
  comments?: string | null;
  graded_by_user_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

// You can define other shared types here as your application grows.
// For example, if MarkingPeriod was fully implemented:
/*
export interface MarkingPeriod {
  id: string;
  tenant_id: string;
  name: string;
  start_date: string;
  end_date: string;
}
*/
