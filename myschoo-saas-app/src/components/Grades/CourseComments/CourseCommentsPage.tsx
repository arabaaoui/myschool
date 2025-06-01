import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';
import SelectCoursePeriodForComments from './SelectCoursePeriodForComments';
import SelectMarkingPeriodForComments from './SelectMarkingPeriodForComments';
import StudentListForComments, { StudentEnrollmentWithStudent } from '../../Attendance/AttendanceSheet'; // Re-using for student list
import CommentEntryForm, { ReportCardCourseComment } from './CommentEntryForm';
import HelpTooltip from '../../common/HelpTooltip';
import { useAuth } from '../../../App';
import { MarkingPeriod } from '../../Settings/MarkingPeriods/MarkingPeriodForm'; // For marking period name context

const CourseCommentsPage: React.FC = () => {
  const { user, isTeacher, isTenantAdmin } = useAuth();
  const [selectedCoursePeriodId, setSelectedCoursePeriodId] = useState<string | null>(null);
  const [selectedCoursePeriodName, setSelectedCoursePeriodName] = useState<string>('');
  const [selectedMarkingPeriodId, setSelectedMarkingPeriodId] = useState<string | null>(null);
  const [selectedMarkingPeriodName, setSelectedMarkingPeriodName] = useState<string>('');

  const [academicYearIdForSelectedCP, setAcademicYearIdForSelectedCP] = useState<string | null>(null);

  const [enrolledStudents, setEnrolledStudents] = useState<StudentEnrollmentWithStudent[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedStudentName, setSelectedStudentName] = useState<string>('');

  const [existingComment, setExistingComment] = useState<ReportCardCourseComment | null>(null);

  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingComment, setLoadingComment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch academic year for selected course period to filter marking periods
  useEffect(() => {
    const fetchAcademicYear = async () => {
      if (selectedCoursePeriodId) {
        const { data, error: cpError } = await supabase
          .from('course_periods')
          .select('marking_periods(academic_year_id)')
          .eq('id', selectedCoursePeriodId)
          .single();
        if (cpError) console.error("Error fetching academic year for course period:", cpError);
        setAcademicYearIdForSelectedCP(cpError || !data ? null : (data.marking_periods as any)?.academic_year_id);
      } else {
        setAcademicYearIdForSelectedCP(null);
      }
    };
    fetchAcademicYear();
  }, [selectedCoursePeriodId]);


  const fetchEnrolledStudents = useCallback(async () => {
    if (!selectedCoursePeriodId || !selectedMarkingPeriodId) { // Need both to fetch students relevant for comments
      setEnrolledStudents([]);
      return;
    }
    setLoadingStudents(true);
    setError(null);
    try {
      const today = new Date().toISOString().split('T')[0]; // Using today to filter active enrollments
      const { data, error: fetchError } = await supabase
        .from('student_enrollments')
        .select(`
          id,
          student_id,
          course_period_id,
          students (id, first_name, last_name, student_identifier)
        `)
        .eq('course_period_id', selectedCoursePeriodId)
        .lte('enrollment_date', today)
        .or(`withdrawal_date.is.null,withdrawal_date.gt.${today}`);

      if (fetchError) throw fetchError;
      const validEnrollments = (data || []).filter(e => e.students).map(e => e as StudentEnrollmentWithStudent);
      setEnrolledStudents(validEnrollments);
      if (validEnrollments.length === 0) {
        setError("No students enrolled in this class for the selected period or no active enrollments.");
      }
    } catch (err: any) {
      console.error('Error fetching enrolled students:', err);
      setError('Failed to load students for comments. ' + err.message);
    } finally {
      setLoadingStudents(false);
    }
  }, [selectedCoursePeriodId, selectedMarkingPeriodId]);

  useEffect(() => {
    fetchEnrolledStudents();
  }, [fetchEnrolledStudents]);

  // Fetch existing comment when student, course period, and marking period are selected
  const fetchExistingComment = useCallback(async () => {
    if (!selectedStudentId || !selectedCoursePeriodId || !selectedMarkingPeriodId) {
      setExistingComment(null);
      return;
    }
    setLoadingComment(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('report_card_course_comments')
        .select('*')
        .eq('student_id', selectedStudentId)
        .eq('course_period_id', selectedCoursePeriodId)
        .eq('marking_period_id', selectedMarkingPeriodId)
        .maybeSingle(); // Use maybeSingle as a comment might not exist

      if (fetchError) throw fetchError;
      setExistingComment(data);
    } catch (err: any) {
      console.error('Error fetching existing comment:', err);
      setError('Failed to load existing comment. ' + err.message);
    } finally {
      setLoadingComment(false);
    }
  }, [selectedStudentId, selectedCoursePeriodId, selectedMarkingPeriodId]);

  useEffect(() => {
    fetchExistingComment();
  }, [fetchExistingComment]);


  const handleCoursePeriodSelect = (coursePeriodId: string, name: string) => {
    setSelectedCoursePeriodId(coursePeriodId);
    setSelectedCoursePeriodName(name);
    setSelectedStudentId(null); // Reset student when class changes
    setExistingComment(null);
    setSelectedMarkingPeriodId(null); // Reset marking period when class changes
    setAcademicYearIdForSelectedCP(null); // Will be refetched
  };

  const handleMarkingPeriodSelect = (markingPeriodId: string, name: string) => {
    setSelectedMarkingPeriodId(markingPeriodId);
    setSelectedMarkingPeriodName(name);
    setSelectedStudentId(null); // Reset student when marking period changes
    setExistingComment(null);
  };

  const handleStudentSelect = (studentId: string, name: string) => {
    setSelectedStudentId(studentId);
    setSelectedStudentName(name);
  };

  const handleCommentSave = (savedComment: ReportCardCourseComment) => {
    setExistingComment(savedComment); // Update local state with saved/new comment
    // Optionally, show a success message
  };

  if (!isTeacher && !isTenantAdmin) {
    return <p className="p-4 text-red-500">You do not have permission to manage course comments.</p>;
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div className="flex items-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Course Comments for Report Cards</h1>
          <HelpTooltip helpKey="courseComments_intro" position="right" className="ml-2" />
        </div>
      </div>

      {error && <p className="mb-4 text-red-600 bg-red-100 p-3 rounded-md text-sm md:text-base">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <SelectCoursePeriodForComments onCoursePeriodSelect={handleCoursePeriodSelect} currentSelection={selectedCoursePeriodId} />
        {selectedCoursePeriodId && (
          <SelectMarkingPeriodForComments
            onMarkingPeriodSelect={handleMarkingPeriodSelect}
            currentSelection={selectedMarkingPeriodId}
            academicYearId={academicYearIdForSelectedCP}
          />
        )}
      </div>

      {selectedCoursePeriodId && selectedMarkingPeriodId && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <StudentListForComments
              students={enrolledStudents}
              onSelectStudent={handleStudentSelect}
              selectedStudentId={selectedStudentId}
              loading={loadingStudents}
              // error can be displayed globally or per component
            />
          </div>
          <div className="md:col-span-2">
            {selectedStudentId && !loadingComment ? (
              <CommentEntryForm
                studentId={selectedStudentId}
                studentName={selectedStudentName}
                coursePeriodId={selectedCoursePeriodId}
                markingPeriodId={selectedMarkingPeriodId!} // Should be selected if student is selected
                existingComment={existingComment}
                onSave={handleCommentSave}
              />
            ) : selectedStudentId && loadingComment ? (
              <p className="text-center text-gray-500 py-4">Loading comment...</p>
            ) : (
              <p className="text-center text-gray-500 py-4">Please select a student to enter comments.</p>
            )}
          </div>
        </div>
      )}

      {(!selectedCoursePeriodId || !selectedMarkingPeriodId) && !loadingStudents && (
          <p className="text-center text-gray-500 py-4">Please select a class and a marking period to manage comments.</p>
      )}

    </div>
  );
};

export default CourseCommentsPage;
