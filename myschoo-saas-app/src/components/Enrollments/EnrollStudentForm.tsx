import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import HelpTooltip from '../common/HelpTooltip';
import { Student } from '../Students/StudentForm'; // Assuming Student type is exported
import { CoursePeriod } from '../Courses/CoursePeriods/CoursePeriodForm'; // Assuming CoursePeriod type
import { Course } from '../Courses/Courses/CourseForm'; // For course names
import { UserProfile } from '../../types'; // For teacher names

// Extended CoursePeriod type for display purposes
interface DisplayCoursePeriod extends CoursePeriod {
  course_name?: string;
  teacher_name?: string;
}

export interface StudentEnrollment {
  id?: string;
  tenant_id?: string; // Handled by RLS
  student_id: string;
  course_period_id: string;
  enrollment_date: string; // YYYY-MM-DD
  withdrawal_date?: string | null; // YYYY-MM-DD
}

interface EnrollStudentFormProps {
  onEnrollmentSave: (enrollment: StudentEnrollment) => void;
  // Optional: Pass existing enrollment to edit (e.g., withdrawal date)
  // enrollmentToEdit?: StudentEnrollment | null; 
}

const EnrollStudentForm: React.FC<EnrollStudentFormProps> = ({ onEnrollmentSave }) => {
  const [studentId, setStudentId] = useState<string>('');
  const [coursePeriodId, setCoursePeriodId] = useState<string>('');
  const [enrollmentDate, setEnrollmentDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const [students, setStudents] = useState<Student[]>([]);
  const [coursePeriods, setCoursePeriods] = useState<DisplayCoursePeriod[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);

  useEffect(() => {
    const fetchDropdownData = async () => {
      setLoadingDropdowns(true);
      setError(null);
      try {
        // Fetch Students
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('id, first_name, last_name, student_identifier')
          .order('last_name', { ascending: true })
          .order('first_name', { ascending: true });
        if (studentsError) throw studentsError;
        setStudents(studentsData || []);

        // Fetch Course Periods with Course Name and Teacher Name
        const { data: cpData, error: cpError } = await supabase
          .from('course_periods')
          .select(`
            *,
            courses (name),
            user_profiles (full_name, email)
          `)
          .order('name', { ascending: true });
        if (cpError) throw cpError;
        
        const displayPeriods = (cpData || []).map((cp: any) => ({
          ...cp,
          course_name: cp.courses?.name || 'Unknown Course',
          teacher_name: cp.user_profiles?.full_name || cp.user_profiles?.email || 'N/A',
        }));
        setCoursePeriods(displayPeriods);

      } catch (err: any) {
        console.error('Error fetching dropdown data:', err);
        setError('Failed to load students or classes. ' + err.message);
      } finally {
        setLoadingDropdowns(false);
      }
    };
    fetchDropdownData();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!studentId) { setError('Please select a student.'); setLoading(false); return; }
    if (!coursePeriodId) { setError('Please select a class/section.'); setLoading(false); return; }
    if (!enrollmentDate) { setError('Enrollment date is required.'); setLoading(false); return; }

    try {
      const newEnrollment: Omit<StudentEnrollment, 'id' | 'tenant_id' | 'withdrawal_date'> = {
        student_id: studentId,
        course_period_id: coursePeriodId,
        enrollment_date: enrollmentDate,
      };

      const { data, error: insertError } = await supabase
        .from('student_enrollments')
        .insert(newEnrollment)
        .select()
        .single();

      if (insertError) throw insertError;
      
      onEnrollmentSave(data as StudentEnrollment);
      // Reset form after successful save
      setStudentId('');
      setCoursePeriodId('');
      setEnrollmentDate(new Date().toISOString().split('T')[0]);

    } catch (err: any) {
      console.error('Error creating enrollment:', err);
      setError(err.message || 'Failed to enroll student.');
    } finally {
      setLoading(false);
    }
  };
  
  if (loadingDropdowns) {
    return <p className="text-center text-gray-500 py-4">Loading form data...</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-4 sm:p-6 bg-white shadow-md rounded-lg max-w-xl mx-auto">
      <h3 className="text-lg sm:text-xl font-semibold text-gray-700">Enroll Student in Class</h3>
      {error && <p className="text-red-500 text-sm bg-red-100 p-3 rounded-md">{error}</p>}

      {/* Student Dropdown */}
      <div>
        <label htmlFor="student_id" className="flex items-center text-sm font-medium text-gray-700">
          Student <span className="text-red-500 ml-1">*</span>
          <HelpTooltip helpKey="enrollStudentForm_student" position="right" className="ml-1.5" />
        </label>
        <select
          name="student_id"
          id="student_id"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        >
          <option value="" disabled>Select a student</option>
          {students.map(s => (
            <option key={s.id} value={s.id}>
              {s.last_name}, {s.first_name} ({s.student_identifier || s.id?.substring(0,8)})
            </option>
          ))}
        </select>
      </div>

      {/* Course Period Dropdown */}
      <div>
        <label htmlFor="course_period_id" className="flex items-center text-sm font-medium text-gray-700">
          Class/Section <span className="text-red-500 ml-1">*</span>
          <HelpTooltip helpKey="enrollStudentForm_coursePeriod" position="right" className="ml-1.5" />
        </label>
        <select
          name="course_period_id"
          id="course_period_id"
          value={coursePeriodId}
          onChange={(e) => setCoursePeriodId(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        >
          <option value="" disabled>Select a class/section</option>
          {coursePeriods.map(cp => (
            <option key={cp.id} value={cp.id}>
              {cp.course_name} - {cp.name} (Teacher: {cp.teacher_name})
            </option>
          ))}
        </select>
      </div>
      
      {/* Enrollment Date */}
      <div>
        <label htmlFor="enrollment_date" className="flex items-center text-sm font-medium text-gray-700">
          Enrollment Date <span className="text-red-500 ml-1">*</span>
          <HelpTooltip helpKey="enrollStudentForm_enrollmentDate" position="right" className="ml-1.5" />
        </label>
        <input
          type="date"
          name="enrollment_date"
          id="enrollment_date"
          value={enrollmentDate}
          onChange={(e) => setEnrollmentDate(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={loading || loadingDropdowns}
          className="w-full sm:w-auto inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? 'Enrolling...' : 'Enroll Student'}
        </button>
      </div>
    </form>
  );
};

export default EnrollStudentForm;
