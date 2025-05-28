import React from 'react';
import { StudentEnrollmentWithStudent } from '../../Attendance/AttendanceSheet'; // Re-use this type

interface StudentListForCommentsProps {
  students: StudentEnrollmentWithStudent[]; // Students enrolled in the selected course period
  onSelectStudent: (studentId: string, studentName: string) => void;
  selectedStudentId?: string | null;
  loading: boolean;
  error?: string | null;
}

const StudentListForComments: React.FC<StudentListForCommentsProps> = ({
  students,
  onSelectStudent,
  selectedStudentId,
  loading,
  error,
}) => {
  if (loading) {
    return <p className="text-sm text-gray-500 py-2">Loading students...</p>;
  }
  if (error) {
    return <p className="text-sm text-red-500 py-2 bg-red-50 p-2 rounded">{error}</p>;
  }
  if (students.length === 0) {
    return <p className="text-sm text-gray-500 py-2">No students found for this class in the selected period, or no period selected.</p>;
  }

  return (
    <div className="mt-4">
      <h4 className="text-md font-semibold text-gray-700 mb-2">Select Student to Enter Comment:</h4>
      <div className="max-h-60 overflow-y-auto border rounded-md">
        <ul className="divide-y divide-gray-200">
          {students.map(enrollment => {
            const student = enrollment.students;
            const studentFullName = `${student.last_name}, ${student.first_name}`;
            return (
              <li key={enrollment.student_id}>
                <button
                  onClick={() => onSelectStudent(enrollment.student_id, studentFullName)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 focus:outline-none
                    ${selectedStudentId === enrollment.student_id ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'text-gray-700'}`}
                >
                  {studentFullName} ({student.student_identifier || 'ID N/A'})
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default StudentListForComments;
