import React from 'react';
import { Student } from './StudentForm'; // Re-use the Student interface
import HelpTooltip from '../common/HelpTooltip'; // Import HelpTooltip

interface StudentListProps {
  students: Student[];
  gradeLevels: { id: string; name: string }[];
  onEdit: (student: Student) => void;
  onDelete: (studentId: string) => void;
  loading?: boolean;
  error?: string | null;
}

const StudentList: React.FC<StudentListProps> = ({
  students,
  gradeLevels,
  onEdit,
  onDelete,
  loading,
  error,
}) => {
  const getGradeLevelName = (gradeLevelId: string | null | undefined) => {
    if (!gradeLevelId) return 'N/A';
    const grade = gradeLevels.find((g) => g.id === gradeLevelId);
    return grade ? grade.name : 'Unknown Grade';
  };

  if (loading) {
    return <p className="text-center text-gray-500 py-4 text-sm md:text-base">Loading students...</p>;
  }

  if (error) {
    return <p className="text-center text-red-500 py-4 bg-red-100 rounded text-sm md:text-base">{error}</p>;
  }

  if (students.length === 0) {
    return <p className="text-center text-gray-500 py-4 text-sm md:text-base">No students found. Add one to get started!</p>;
  }

  return (
    <div className="overflow-x-auto bg-white shadow-md rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th
              scope="col"
              className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Name
            </th>
            <th
              scope="col"
              className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Student ID
            </th>
            <th
              scope="col"
              className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Grade Level
            </th>
            <th
              scope="col"
              className="hidden sm:table-cell px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Enrollment Date
            </th>
            <th scope="col" className="relative px-4 py-2 sm:px-6 sm:py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {students.map((student) => (
            <tr key={student.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">
                  {student.first_name} {student.last_name}
                </div>
                <div className="text-xs sm:text-sm text-gray-500">
                  DOB: {student.date_of_birth || 'N/A'}
                </div>
              </td>
              <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-500">
                {student.student_identifier || 'N/A'}
              </td>
              <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-500">
                {getGradeLevelName(student.current_grade_level_id)}
              </td>
              <td className="hidden sm:table-cell px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-500">
                {student.enrollment_date || 'N/A'}
              </td>
              <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-right text-sm font-medium">
                {/* Using a div with flex to align button and tooltip nicely */}
                <div className="flex items-center justify-end space-x-1">
                  <button
                    onClick={() => onEdit(student)}
                    className="text-indigo-600 hover:text-indigo-900 p-1"
                    title="Edit Student"
                  >
                    Edit
                  </button>
                  <HelpTooltip helpKey="studentList_editButton" position="left" className="inline-flex" />
                </div>
                <div className="flex items-center justify-end space-x-1 mt-1">
                  <button
                    onClick={() => student.id && onDelete(student.id)}
                    className="text-red-600 hover:text-red-900 p-1"
                    title="Delete Student"
                    disabled={!student.id}
                  >
                    Delete
                  </button>
                  <HelpTooltip helpKey="studentList_deleteButton" position="left" className="inline-flex" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default StudentList;
