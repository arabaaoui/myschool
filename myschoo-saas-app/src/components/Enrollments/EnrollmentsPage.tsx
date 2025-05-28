import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import EnrollStudentForm, { StudentEnrollment } from './EnrollStudentForm';
import StudentEnrollmentList from './StudentEnrollmentList';
import { Student } from '../Students/StudentForm';
import { CoursePeriod } from '../Courses/CoursePeriods/CoursePeriodForm';
import { Course } from '../Courses/Courses/CourseForm';
import { UserProfile } from '../../types';
import HelpTooltip from '../common/HelpTooltip';
import { useAuth } from '../../App';

type EnrollmentView = 'enroll' | 'view';

// Extended types for display in list
interface DisplayableCoursePeriod extends CoursePeriod {
  course_name?: string;
  courses?: { name?: string };
  user_profiles?: { full_name?: string, email?: string };
}
interface DisplayableEnrollment extends StudentEnrollment {
  students?: { first_name?: string, last_name?: string, student_identifier?: string };
  course_periods?: DisplayableCoursePeriod;
}


const EnrollmentsPage: React.FC = () => {
  const { user, isTenantAdmin } = useAuth();
  const [currentView, setCurrentView] = useState<EnrollmentView>('enroll');
  
  const [enrollments, setEnrollments] = useState<DisplayableEnrollment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [coursePeriods, setCoursePeriods] = useState<DisplayableCoursePeriod[]>([]);

  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedCoursePeriodId, setSelectedCoursePeriodId] = useState<string>('');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [listTitle, setListTitle] = useState<string>("All Current Enrollments");


  const fetchEnrollmentData = useCallback(async (studentId?: string, coursePeriodId?: string) => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('student_enrollments')
        .select(`
          *,
          students (id, first_name, last_name, student_identifier),
          course_periods (
            *,
            courses (id, name),
            user_profiles (id, full_name, email) 
          )
        `)
        .order('enrollment_date', { ascending: false });

      if (studentId) {
        query = query.eq('student_id', studentId);
        const studentName = students.find(s => s.id === studentId);
        setListTitle(studentName ? `Enrollments for ${studentName.first_name} ${studentName.last_name}` : "Filtered Enrollments");
      } else if (coursePeriodId) {
        query = query.eq('course_period_id', coursePeriodId);
        const cpName = coursePeriods.find(cp => cp.id === coursePeriodId);
        setListTitle(cpName ? `Roster for ${cp.courses?.name} - ${cp.name}` : "Filtered Enrollments");
      } else {
        setListTitle("All Current Enrollments");
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      
      // Manually map course_name if join syntax was tricky for Supabase or if courses table is not directly joined
      const processedData = (data || []).map(e => ({
        ...e,
        course_periods: {
            ...e.course_periods,
            course_name: e.course_periods?.courses?.name || 'Unknown Course'
        }
      }));
      setEnrollments(processedData);

    } catch (err: any) {
      console.error('Error fetching enrollments:', err);
      setError('Failed to load enrollments. ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [students, coursePeriods]); // Add dependencies if they are used to derive query params directly

  // Fetch initial data for filters and potentially initial list
  useEffect(() => {
    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const { data: studentsData, error: studentsError } = await supabase
                .from('students').select('id, first_name, last_name, student_identifier').order('last_name');
            if (studentsError) throw studentsError;
            setStudents(studentsData || []);

            const { data: cpData, error: cpError } = await supabase
                .from('course_periods').select('*, courses(name), user_profiles(full_name, email)').order('name');
            if (cpError) throw cpError;
            const displayPeriods = (cpData || []).map((cp: any) => ({
                ...cp,
                course_name: cp.courses?.name || 'Unknown Course',
                teacher_name: cp.user_profiles?.full_name || cp.user_profiles?.email || 'N/A',
            }));
            setCoursePeriods(displayPeriods);
            
            // Fetch all enrollments initially or based on default filter
            fetchEnrollmentData(); 

        } catch (err:any) {
            setError('Failed to load initial page data. ' + err.message);
        } finally {
            setLoading(false);
        }
    };
    fetchInitialData();
  }, [fetchEnrollmentData]);


  const handleEnrollmentSave = (newEnrollment: StudentEnrollment) => {
    // Re-fetch enrollments or add to list, then switch view
    fetchEnrollmentData(selectedStudentId, selectedCoursePeriodId); // Refetch current view
    alert('Student enrolled successfully!');
    // Optionally switch view or clear form
  };

  const handleWithdraw = async (enrollmentId: string, withdrawalDate: string) => {
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from('student_enrollments')
        .update({ withdrawal_date: withdrawalDate, updated_at: new Date().toISOString() })
        .eq('id', enrollmentId);
      if (updateError) throw updateError;
      fetchEnrollmentData(selectedStudentId, selectedCoursePeriodId); // Refresh list
    } catch (err: any) {
      console.error('Error withdrawing student:', err);
      setError('Failed to withdraw student. ' + err.message);
    }
  };
  
  const handleFilterChange = () => {
      fetchEnrollmentData(selectedStudentId, selectedCoursePeriodId);
  };
  
  const clearFilters = () => {
      setSelectedStudentId('');
      setSelectedCoursePeriodId('');
      fetchEnrollmentData(); // Fetch all
  };

  if (!isTenantAdmin) {
    return (
        <div className="p-4 md:p-6">
            <p className="text-red-500">You do not have permission to manage enrollments.</p>
        </div>
    );
  }


  const NavButton: React.FC<{ view: EnrollmentView; label: string; }> = ({ view, label }) => (
    <button
      onClick={() => setCurrentView(view)}
      className={`px-3 py-2 md:px-4 text-sm md:text-base rounded-md font-medium transition-colors
        ${currentView === view ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-indigo-100 hover:text-indigo-700'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div className="flex items-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Student Enrollments</h1>
          <HelpTooltip helpKey="enrollments_intro" position="right" className="ml-2" />
        </div>
      </div>
      
      <div className="mb-6 bg-white shadow-sm rounded-lg p-2 md:p-3">
        <nav className="flex flex-wrap items-center gap-2 md:gap-3" aria-label="Enrollment Navigation">
          <NavButton view="enroll" label="Enroll Student" />
          <NavButton view="view" label="View Enrollments" />
        </nav>
      </div>

      {error && <p className="mb-4 text-red-600 bg-red-100 p-3 rounded-md text-sm md:text-base">{error}</p>}

      {currentView === 'enroll' && (
        <EnrollStudentForm onEnrollmentSave={handleEnrollmentSave} />
      )}

      {currentView === 'view' && (
        <div className="mt-6">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 mb-4">View Enrollments</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg shadow">
            <div>
              <label htmlFor="filter_student_id" className="block text-sm font-medium text-gray-700">Filter by Student:</label>
              <select
                id="filter_student_id"
                value={selectedStudentId}
                onChange={(e) => { setSelectedStudentId(e.target.value); setSelectedCoursePeriodId(''); /* Clear other filter */ }}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="">All Students</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.last_name}, {s.first_name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="filter_course_period_id" className="block text-sm font-medium text-gray-700">Filter by Class/Section:</label>
              <select
                id="filter_course_period_id"
                value={selectedCoursePeriodId}
                onChange={(e) => { setSelectedCoursePeriodId(e.target.value); setSelectedStudentId(''); /* Clear other filter */}}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="">All Classes/Sections</option>
                {coursePeriods.map(cp => <option key={cp.id} value={cp.id}>{cp.course_name} - {cp.name}</option>)}
              </select>
            </div>
            <div className="flex items-end space-x-2">
                <button onClick={handleFilterChange} className="w-full md:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm">Apply Filter</button>
                <button onClick={clearFilters} className="w-full md:w-auto px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 sm:text-sm">Clear</button>
            </div>
          </div>
          <StudentEnrollmentList
            enrollments={enrollments}
            onWithdraw={handleWithdraw}
            loading={loading}
            listTitle={listTitle}
          />
        </div>
      )}
    </div>
  );
};

export default EnrollmentsPage;
