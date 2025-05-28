import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import HelpTooltip from '../common/HelpTooltip';
import { StudentGrade } from '../../types'; 
import { Assignment } from '../Grades/Assignments/AssignmentForm'; 

interface MyGradesViewProps {
  studentId: string;
}

interface CoursePeriodOption {
  id: string;
  name: string; 
  course_name: string;
  marking_period_name: string;
}

interface GradeWithAssignmentDetails extends StudentGrade {
  assignments?: Pick<Assignment, 'title' | 'max_points' | 'due_date' | 'assignment_type_id'> & {
    assignment_types?: { name?: string }
  };
}

interface OverallGradeDataPortal {
    student_id: string; // Should match studentId prop
    course_period_id: string;
    overall_percentage: number | null;
    overall_letter_grade?: string | null;
}

const MyGradesView: React.FC<MyGradesViewProps> = ({ studentId }) => {
  const [coursePeriods, setCoursePeriods] = useState<CoursePeriodOption[]>([]);
  const [selectedCoursePeriodId, setSelectedCoursePeriodId] = useState<string>('');
  const [grades, setGrades] = useState<GradeWithAssignmentDetails[]>([]);
  const [overallGrade, setOverallGrade] = useState<OverallGradeDataPortal | null>(null);
  
  const [loading, setLoading] = useState(false); // Combined loading state
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEnrolledCoursePeriods = async () => {
      if (!studentId) return;
      setLoading(true); // Start loading when studentId is available
      try {
        const { data, error: enrollError } = await supabase
          .from('student_enrollments')
          .select(`
            id,
            course_periods (
              id, name,
              courses (name),
              marking_periods (name)
            )
          `)
          .eq('student_id', studentId)
          .is('withdrawal_date', null); 

        if (enrollError) throw enrollError;
        
        const options: CoursePeriodOption[] = (data || []).map((e: any) => ({
          id: e.course_periods.id,
          name: e.course_periods.name,
          course_name: e.course_periods.courses.name,
          marking_period_name: e.course_periods.marking_periods.name,
        }));
        setCoursePeriods(options);
        if (options.length > 0) {
          setSelectedCoursePeriodId(options[0].id); 
        } else {
          setError("You are not currently enrolled in any classes, or no classes have been set up for you.");
          setLoading(false); // Stop loading if no classes
        }
      } catch (err: any) {
        setError('Failed to load your classes: ' + err.message);
        setLoading(false); // Stop loading on error
      }
      // setLoading(false) will be handled by fetchGradesAndOverall if a course period is selected
    };
    fetchEnrolledCoursePeriods();
  }, [studentId]);

  const fetchGradesAndOverall = useCallback(async () => {
    if (!studentId || !selectedCoursePeriodId) {
        setGrades([]);
        setOverallGrade(null);
        setLoading(false); // Ensure loading stops if no selection
        return;
    }
    setLoading(true);
    setError(null);
    try {
      // Fetch individual grades
      const { data: gradesData, error: gradesError } = await supabase
        .from('student_grades')
        .select(`
          *,
          assignments (
            title, 
            max_points, 
            due_date,
            assignment_type_id,
            assignment_types (name) 
          )
        `)
        .eq('student_id', studentId)
        .eq('course_period_id', selectedCoursePeriodId)
        .order('due_date', { referencedTable: 'assignments', ascending: true, nullsLast: true });

      if (gradesError) throw gradesError;
      setGrades(gradesData || []);
      
      // Fetch overall grade
      const { data: overallGradeData, error: overallGradeError } = await supabase
        .from('course_period_overall_grades_view')
        .select('student_id, course_period_id, overall_percentage, overall_letter_grade')
        .eq('student_id', studentId)
        .eq('course_period_id', selectedCoursePeriodId)
        .single();
      
      if (overallGradeError && overallGradeError.code !== 'PGRST116') { // PGRST116: single row not found, which is fine
        throw overallGradeError;
      }
      setOverallGrade(overallGradeData || null);

      if (gradesData?.length === 0 && !overallGradeData) { // No grades and no overall calculated
        setError("No grades recorded for this class yet, or no assignments have been created.");
      }

    } catch (err: any) {
      console.error('Error fetching grades/overall:', err);
      setError('Failed to load grades: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [studentId, selectedCoursePeriodId]);

  useEffect(() => {
    if (selectedCoursePeriodId) { // Only fetch if a course period is selected
      fetchGradesAndOverall();
    }
  }, [fetchGradesAndOverall, selectedCoursePeriodId]);


  return (
    <div className="p-4 md:p-6 bg-white shadow-lg rounded-lg">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 flex items-center">
          My Grades
          <HelpTooltip helpKey="portal_myGrades" position="right" className="ml-2" />
        </h2>
        <div>
          <label htmlFor="grades_cp_filter" className="text-sm font-medium text-gray-700 mr-2">
            Select Class:
            <HelpTooltip helpKey="portal_grades_selectClass" />
            </label>
          <select
            id="grades_cp_filter"
            value={selectedCoursePeriodId}
            onChange={(e) => setSelectedCoursePeriodId(e.target.value)}
            disabled={loading && coursePeriods.length === 0} // Disable if still loading initial CPs
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="">-- Select a Class --</option>
            {coursePeriods.map(cp => 
                <option key={cp.id} value={cp.id}>
                    {cp.course_name} - {cp.name} ({cp.marking_period_name})
                </option>
            )}
          </select>
        </div>
      </div>

      {loading && <p className="text-center text-gray-500 py-4">Loading grades...</p>}
      {error && <p className="text-center text-red-500 py-4 bg-red-100 p-3 rounded-md">{error}</p>}
      
      {!loading && !error && grades.length === 0 && selectedCoursePeriodId && (
        <p className="text-center text-gray-500 py-6">
            <HelpTooltip helpKey="portal_grades_noGrades" position="bottom" /> No grades found for this class.
        </p>
      )}
       {!loading && !selectedCoursePeriodId && coursePeriods.length > 0 && (
        <p className="text-center text-gray-500 py-6">Please select a class to view grades.</p>
      )}

      {/* Overall Grade Display */}
      {!loading && selectedCoursePeriodId && overallGrade && (
        <div className="mb-6 p-4 bg-indigo-100 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-indigo-800 flex items-center">
                Overall Grade
                <HelpTooltip helpKey="portal_grades_overallGrade" position="right" className="ml-2"/>
            </h3>
            <p className="text-2xl font-bold text-indigo-700">
                {overallGrade.overall_percentage !== null ? `${overallGrade.overall_percentage.toFixed(1)}%` : 'N/A'}
                {/* {overallGrade.overall_letter_grade && ` (${overallGrade.overall_letter_grade})`} */}
            </p>
        </div>
      )}


      {!loading && grades.length > 0 && selectedCoursePeriodId && (
        <div className="overflow-x-auto">
          <h4 className="text-md font-semibold text-gray-700 mb-2">Assignments</h4>
          <table className="min-w-full divide-y divide-gray-200 border">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Assignment</th>
                <th className="hidden sm:table-cell px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Type</th>
                <th className="hidden md:table-cell px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Due Date</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase">Score</th>
                <th className="hidden sm:table-cell px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Comments</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {grades.map(grade => (
                <tr key={grade.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-normal break-words text-sm font-medium text-gray-900">{grade.assignments?.title || 'N/A'}</td>
                  <td className="hidden sm:table-cell px-4 py-3 whitespace-nowrap text-sm text-gray-500">{grade.assignments?.assignment_types?.name || 'N/A'}</td>
                  <td className="hidden md:table-cell px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {grade.assignments?.due_date ? new Date(grade.assignments.due_date + 'T00:00:00').toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700">
                    {grade.points_earned !== null && grade.points_earned !== undefined ? Number(grade.points_earned).toFixed(2) : '-'}{' '}
                    / {grade.assignments?.max_points !== null && grade.assignments?.max_points !== undefined ? Number(grade.assignments.max_points).toFixed(2) : '-'}
                  </td>
                  <td className="hidden sm:table-cell px-4 py-3 whitespace-normal break-words text-sm text-gray-500">{grade.comments || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MyGradesView;
