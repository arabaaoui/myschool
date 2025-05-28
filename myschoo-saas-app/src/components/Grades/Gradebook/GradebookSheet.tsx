import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';
import { StudentEnrollmentWithStudent } from '../../Attendance/AttendanceSheet'; 
import { Assignment } from '../Assignments/AssignmentForm';
import { StudentGrade } from '../../../types'; 
import HelpTooltip from '../../common/HelpTooltip';
import { useAuth } from '../../../App';

export interface AttendanceRecord { // This seems like a leftover type, not used here.
  id?: string;
  student_enrollment_id: string;
  course_period_id: string;
  student_id: string;
  attendance_date: string; 
  attendance_code_id: string;
  taken_by_user_id: string;
  comments?: string | null;
}

interface OverallGradeData {
    student_id: string;
    overall_percentage: number | null;
    overall_letter_grade?: string | null; // Optional
}

interface GradebookSheetProps {
  coursePeriodId: string;
  coursePeriodName?: string; 
}

const GradebookSheet: React.FC<GradebookSheetProps> = ({ coursePeriodId, coursePeriodName }) => {
  const { user } = useAuth();
  const [enrolledStudents, setEnrolledStudents] = useState<StudentEnrollmentWithStudent[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [grades, setGrades] = useState<Record<string, Record<string, StudentGrade>>>({}); 
  const [overallGrades, setOverallGrades] = useState<Record<string, OverallGradeData>>({}); // { studentId: OverallGradeData }
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!coursePeriodId) return;
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from('student_enrollments')
        .select(`
          id, 
          student_id,
          course_period_id,
          students (id, first_name, last_name, student_identifier)
        `)
        .eq('course_period_id', coursePeriodId)
        .lte('enrollment_date', today)
        .or(`withdrawal_date.is.null,withdrawal_date.gt.${today}`);
      if (enrollmentsError) throw enrollmentsError;
      const validEnrollments = (enrollmentsData || []).filter(e => e.students).map(e => e as StudentEnrollmentWithStudent)
      setEnrolledStudents(validEnrollments);

      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('assignments')
        .select('*')
        .eq('course_period_id', coursePeriodId)
        .order('due_date', { ascending: true, nullsLast: true })
        .order('title', { ascending: true });
      if (assignmentsError) throw assignmentsError;
      setAssignments(assignmentsData || []);

      if (validEnrollments.length > 0 && assignmentsData && assignmentsData.length > 0) {
        const studentIds = validEnrollments.map(e => e.student_id);
        const assignmentIds = assignmentsData.map(a => a.id);

        const { data: gradesData, error: gradesError } = await supabase
          .from('student_grades')
          .select('*')
          .in('student_id', studentIds)
          .in('assignment_id', assignmentIds)
          .eq('course_period_id', coursePeriodId);
        if (gradesError) throw gradesError;
        
        const gradesMap: Record<string, Record<string, StudentGrade>> = {};
        (gradesData || []).forEach(grade => {
          if (!gradesMap[grade.student_id]) {
            gradesMap[grade.student_id] = {};
          }
          gradesMap[grade.student_id][grade.assignment_id] = grade;
        });
        setGrades(gradesMap);
      } else {
        setGrades({});
      }

      // Fetch overall grades
      const { data: overallGradesData, error: overallGradesError } = await supabase
        .from('course_period_overall_grades_view')
        .select('student_id, overall_percentage, overall_letter_grade')
        .eq('course_period_id', coursePeriodId);
      if (overallGradesError) throw overallGradesError;

      const overallGradesMap: Record<string, OverallGradeData> = {};
      (overallGradesData || []).forEach(og => {
        overallGradesMap[og.student_id] = og;
      });
      setOverallGrades(overallGradesMap);


    } catch (err: any) {
      console.error('Error fetching gradebook data:', err);
      setError('Failed to load gradebook data. ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [coursePeriodId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleGradeChange = (studentId: string, assignmentId: string, points: string | null) => {
    setGrades(prev => {
      const studentGrades = prev[studentId] || {};
      const existingGrade = studentGrades[assignmentId];
      const newPoints = points === null || points === '' ? null : parseFloat(points);

      return {
        ...prev,
        [studentId]: {
          ...studentGrades,
          [assignmentId]: {
            ...existingGrade, 
            student_id: studentId,
            assignment_id: assignmentId,
            course_period_id: coursePeriodId, 
            points_earned: newPoints,
          } as StudentGrade, 
        },
      };
    });
  };
  
  const handleCommentChange = (studentId: string, assignmentId: string, commentText: string) => {
    setGrades(prev => {
      const studentGrades = prev[studentId] || {};
      const existingGrade = studentGrades[assignmentId];
      return {
        ...prev,
        [studentId]: {
          ...studentGrades,
          [assignmentId]: {
            ...existingGrade,
            student_id: studentId,
            assignment_id: assignmentId,
            course_period_id: coursePeriodId,
            comments: commentText.trim() === '' ? null : commentText.trim(),
          } as StudentGrade,
        }
      }
    });
  };


  const handleSubmitGrades = async () => {
    if (!user?.id) {
      setError("User not identified. Cannot save grades.");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    const gradesToUpsert: Omit<StudentGrade, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>[] = [];

    for (const studentEnrollment of enrolledStudents) {
      const studentId = studentEnrollment.student_id;
      const studentEnrollmentId = studentEnrollment.id!; 

      if (grades[studentId]) {
        for (const assignmentId in grades[studentId]) {
          const gradeEntry = grades[studentId][assignmentId];
          const assignment = assignments.find(a => a.id === assignmentId);

          if (gradeEntry.points_earned !== undefined && assignment) { 
            gradesToUpsert.push({
              student_id: studentId,
              assignment_id: assignmentId,
              student_enrollment_id: studentEnrollmentId,
              course_period_id: coursePeriodId,
              points_earned: gradeEntry.points_earned, 
              comments: gradeEntry.comments,
              graded_by_user_id: user.id,
            });
          }
        }
      }
    }
    
    if (gradesToUpsert.length === 0) {
        setSuccessMessage("No changes to save.");
        setSaving(false);
        return;
    }

    try {
      const { error: upsertError } = await supabase
        .from('student_grades')
        .upsert(gradesToUpsert, { 
            onConflict: 'assignment_id, student_enrollment_id', 
        });

      if (upsertError) throw upsertError;
      setSuccessMessage('Grades saved successfully! Overall grades will update.');
      fetchData(); // Refetch all data including overall grades
    } catch (err: any) {
      console.error('Error saving grades:', err);
      setError('Failed to save grades. ' + err.message);
    } finally {
      setSaving(false);
    }
  };


  if (loading && !enrolledStudents.length) { // Show main loading only if nothing is displayed yet
    return <p className="text-center text-gray-500 py-8">Loading gradebook...</p>;
  }
  if (error && !saving && !enrolledStudents.length) { 
    return <p className="text-center text-red-500 py-4 bg-red-100 p-3 rounded-md">{error}</p>;
  }
  if (enrolledStudents.length === 0 && !loading) {
    return <p className="text-center text-gray-500 py-4">No students enrolled in {coursePeriodName || 'this class'}.</p>;
  }
  if (assignments.length === 0 && !loading) {
    return <p className="text-center text-gray-500 py-4">No assignments created for {coursePeriodName || 'this class'}.</p>;
  }


  return (
    <div className="bg-white shadow-md rounded-lg mt-6">
      <h3 className="text-lg sm:text-xl font-semibold text-gray-700 p-4 border-b border-gray-200">
        Gradebook for {coursePeriodName || 'Class'}
      </h3>
      {successMessage && <p className="m-4 text-green-600 bg-green-100 p-3 rounded-md text-sm">{successMessage}</p>}
      {error && saving && <p className="m-4 text-red-500 bg-red-100 p-3 rounded-md text-sm">{error}</p>}
      
      <div className="overflow-x-auto p-2">
        <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="sticky left-0 bg-gray-50 z-10 px-3 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                Student Name <HelpTooltip helpKey="gradebookSheet_studentName" position="top" />
              </th>
              {assignments.map(assignment => (
                <th key={assignment.id} className="px-3 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  <div className="flex flex-col items-center">
                    <span className="truncate max-w-[100px] sm:max-w-[150px]">{assignment.title}</span>
                    <span className="font-normal text-gray-400">({Number(assignment.max_points).toFixed(1)} pts)</span>
                  </div>
                  <HelpTooltip helpKey="gradebookSheet_assignmentHeader" position="top" />
                </th>
              ))}
              <th className="px-3 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                Overall <HelpTooltip helpKey="gradebookSheet_overallGrade" position="top" />
              </th>
              <th className="px-3 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Comments</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {enrolledStudents.map(enrollment => {
              const student = enrollment.students;
              const overallGrade = overallGrades[student.id!];
              return (
                <tr key={enrollment.id} className="hover:bg-gray-50">
                  <td className="sticky left-0 bg-white hover:bg-gray-50 z-10 px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap border-r">
                    <div className="text-sm font-medium text-gray-900">{student.last_name}, {student.first_name}</div>
                    <div className="text-xs text-gray-500">{student.student_identifier || 'N/A'}</div>
                  </td>
                  {assignments.map(assignment => {
                    const gradeEntry = grades[student.id!]?.[assignment.id!] || {};
                    const points = gradeEntry.points_earned;
                    return (
                      <td key={assignment.id} className="px-2 py-1 sm:px-3 sm:py-2 whitespace-nowrap">
                        <input
                          type="number"
                          value={points === null || points === undefined ? '' : String(points)}
                          onChange={(e) => handleGradeChange(student.id!, assignment.id!, e.target.value)}
                          max={Number(assignment.max_points)}
                          min={0}
                          step="0.01" 
                          className="mt-1 block w-20 sm:w-24 px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          placeholder="-"
                        />
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap text-sm font-semibold">
                    {overallGrade?.overall_percentage !== null && overallGrade?.overall_percentage !== undefined 
                        ? `${overallGrade.overall_percentage.toFixed(1)}%` 
                        : 'N/A'}
                    {/* {overallGrade?.overall_letter_grade && ` (${overallGrade.overall_letter_grade})`} */}
                  </td>
                  <td className="px-2 py-1 sm:px-3 sm:py-2">
                    <input
                      type="text"
                      value={grades[student.id!]?.[assignments[0]?.id!]?.comments || ''} // Example: comment on first assignment
                      onChange={(e) => handleCommentChange(student.id!, assignments[0]?.id!, e.target.value)}
                      className="mt-1 block w-full min-w-[150px] px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Comment (e.g., for first assignment)"
                      disabled={!assignments[0]} // Disable if no assignments
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="p-4 border-t border-gray-200 flex justify-end">
        <button
          onClick={handleSubmitGrades}
          disabled={saving || loading}
          className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 disabled:opacity-50 transition ease-in-out duration-150"
        >
          {saving ? 'Saving...' : 'Save All Grades'}
          <HelpTooltip helpKey="gradebookSheet_saveButton" position="top" className="ml-1.5 inline-flex align-middle" />
        </button>
      </div>
    </div>
  );
};

export default GradebookSheet;
