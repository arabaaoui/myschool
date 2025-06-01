import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { StudentEnrollment } from '../Enrollments/EnrollStudentForm'; // Assuming StudentEnrollment has student_id
import { Student } from '../Students/StudentForm';
import { AttendanceCode } from '../Settings/AttendanceCodes/AttendanceCodeForm';
import HelpTooltip from '../common/HelpTooltip';
import { useAuth } from '../../App';

export interface AttendanceRecord {
  id?: string;
  student_enrollment_id: string;
  course_period_id: string;
  student_id: string;
  attendance_date: string; // YYYY-MM-DD
  attendance_code_id: string;
  taken_by_user_id: string;
  comments?: string | null;
}

interface AttendanceSheetProps {
  coursePeriodId: string;
  attendanceDate: string; // YYYY-MM-DD
  enrolledStudents: StudentEnrollmentWithStudent[]; // List of students enrolled in the course period
  attendanceCodes: AttendanceCode[]; // List of available attendance codes
  existingRecords: AttendanceRecord[]; // Existing attendance records for this class on this day
  onSaveAttendance: (records: Omit<AttendanceRecord, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>[]) => Promise<void>;
}

// Helper type for combining enrollment and student details
export interface StudentEnrollmentWithStudent extends StudentEnrollment {
  students: Pick<Student, 'id' | 'first_name' | 'last_name' | 'student_identifier'>;
}


const AttendanceSheet: React.FC<AttendanceSheetProps> = ({
  coursePeriodId,
  attendanceDate,
  enrolledStudents,
  attendanceCodes,
  existingRecords,
  onSaveAttendance,
}) => {
  const { user } = useAuth();
  const [attendanceData, setAttendanceData] = useState<Record<string, { codeId: string; comments: string }>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize attendanceData based on existingRecords or default to first code for new records
    const initialData: Record<string, { codeId: string; comments: string }> = {};
    const defaultCodeId = attendanceCodes.find(ac => ac.is_present_code)?.id || (attendanceCodes.length > 0 ? attendanceCodes[0].id : '');

    enrolledStudents.forEach(enrollment => {
      const studentEnrollmentId = enrollment.id!; // Assuming enrollment.id is the student_enrollment_id
      const existing = existingRecords.find(rec => rec.student_enrollment_id === studentEnrollmentId);
      initialData[studentEnrollmentId] = {
        codeId: existing ? existing.attendance_code_id : defaultCodeId,
        comments: existing ? existing.comments || '' : '',
      };
    });
    setAttendanceData(initialData);
  }, [enrolledStudents, attendanceCodes, existingRecords]);

  const handleAttendanceChange = (studentEnrollmentId: string, codeId: string) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentEnrollmentId]: { ...prev[studentEnrollmentId], codeId },
    }));
  };

  const handleCommentChange = (studentEnrollmentId: string, comments: string) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentEnrollmentId]: { ...prev[studentEnrollmentId], comments },
    }));
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      setError("User not identified. Cannot save attendance.");
      return;
    }
    setLoading(true);
    setError(null);

    const recordsToSave: Omit<AttendanceRecord, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>[] = [];

    for (const enrollment of enrolledStudents) {
        const studentEnrollmentId = enrollment.id!; // This is student_enrollments.id
        const studentId = enrollment.student_id;
        const data = attendanceData[studentEnrollmentId];
        if (data && data.codeId) { // Ensure a code is selected
            recordsToSave.push({
                student_enrollment_id: studentEnrollmentId,
                course_period_id: coursePeriodId,
                student_id: studentId,
                attendance_date: attendanceDate,
                attendance_code_id: data.codeId,
                taken_by_user_id: user.id,
                comments: data.comments.trim() === '' ? null : data.comments.trim(),
            });
        } else {
            // Handle case where a student might not have an attendance code selected if that's possible
            console.warn(`No attendance data for student enrollment ID: ${studentEnrollmentId}`);
        }
    }

    if (recordsToSave.length === 0 && enrolledStudents.length > 0) {
        setError("No attendance data to save. Please select attendance codes for students.");
        setLoading(false);
        return;
    }
    if (recordsToSave.length > 0) {
        await onSaveAttendance(recordsToSave);
    }
    setLoading(false);
    // Parent component (TakeAttendancePage) will handle success message & potential refetch
  };

  if (enrolledStudents.length === 0) {
    return <p className="text-center text-gray-500 py-4">No students enrolled in this class for the selected date.</p>;
  }

  return (
    <div className="bg-white shadow-md rounded-lg mt-6">
      <h3 className="text-lg sm:text-xl font-semibold text-gray-700 p-4 border-b border-gray-200">
        Attendance for {new Date(attendanceDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </h3>
      {error && <p className="m-4 text-red-500 text-sm bg-red-100 p-3 rounded-md">{error}</p>}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Name <HelpTooltip helpKey="attendanceSheet_studentName" position="top" /></th>
              <th className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attendance Code <HelpTooltip helpKey="attendanceSheet_attendanceCode" position="top" /></th>
              <th className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comments <HelpTooltip helpKey="attendanceSheet_comments" position="top" /></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {enrolledStudents.map(enrollment => {
              const studentEnrollmentId = enrollment.id!;
              const currentData = attendanceData[studentEnrollmentId] || { codeId: '', comments: '' };
              return (
                <tr key={studentEnrollmentId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{enrollment.students.last_name}, {enrollment.students.first_name}</div>
                    <div className="text-xs text-gray-500">{enrollment.students.student_identifier || 'N/A'}</div>
                  </td>
                  <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap">
                    <select
                      value={currentData.codeId}
                      onChange={(e) => handleAttendanceChange(studentEnrollmentId, e.target.value)}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    >
                      <option value="" disabled>Select code</option>
                      {attendanceCodes.map(code => (
                        <option key={code.id} value={code.id!}>{code.code} - {code.description}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 sm:px-6 sm:py-4">
                    <input
                      type="text"
                      value={currentData.comments}
                      onChange={(e) => handleCommentChange(studentEnrollmentId, e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Optional comments"
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
          onClick={handleSubmit}
          disabled={loading || enrolledStudents.length === 0}
          className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 disabled:opacity-50 transition ease-in-out duration-150"
        >
          {loading ? 'Saving...' : 'Save Attendance'}
          <HelpTooltip helpKey="attendanceSheet_saveButton" position="top" className="ml-1.5 inline-flex align-middle" />
        </button>
      </div>
    </div>
  );
};

export default AttendanceSheet;
