import React from 'react';
import { Course } from './CourseForm';
import { Subject } from '../Subjects/SubjectForm';
import HelpTooltip from '../../common/HelpTooltip';

interface CourseListProps {
  courses: Course[];
  subjects: Subject[]; // To display subject name
  onEdit: (course: Course) => void;
  onDelete: (courseId: string) => void;
  loading?: boolean;
  error?: string | null;
}

const CourseList: React.FC<CourseListProps> = ({
  courses,
  subjects,
  onEdit,
  onDelete,
  loading,
  error,
}) => {
  const getSubjectName = (subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject ? subject.name : 'Unknown Subject';
  };

  if (loading) {
    return <p className="text-center text-gray-500 py-4 text-sm md:text-base">Loading courses...</p>;
  }

  if (error) {
    return <p className="text-center text-red-500 py-4 bg-red-100 rounded text-sm md:text-base">{error}</p>;
  }

  if (courses.length === 0) {
    return <p className="text-center text-gray-500 py-4 text-sm md:text-base">No courses found. Add one to get started!</p>;
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
              Course Name
            </th>
            <th
              scope="col"
              className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Subject
            </th>
            <th
              scope="col"
              className="hidden sm:table-cell px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Credits
            </th>
            <th scope="col" className="relative px-4 py-2 sm:px-6 sm:py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {courses.map((course) => (
            <tr key={course.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-normal break-words"> {/* Allow name to wrap */}
                <div className="text-sm font-medium text-gray-900">{course.name}</div>
                {course.description && (
                  <div className="text-xs text-gray-500 mt-1 truncate hover:whitespace-normal max-w-xs"> {/* Truncate description */}
                    {course.description}
                  </div>
                )}
              </td>
              <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-500">
                {getSubjectName(course.subject_id)}
              </td>
              <td className="hidden sm:table-cell px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-500">
                {course.default_credits !== null ? Number(course.default_credits).toFixed(2) : 'N/A'}
              </td>
              <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end space-x-1">
                  <button
                    onClick={() => onEdit(course)}
                    className="text-indigo-600 hover:text-indigo-900 p-1"
                    title="Edit Course"
                  >
                    Edit
                  </button>
                  <HelpTooltip helpKey="courseList_editButton" position="left" className="inline-flex" />
                </div>
                <div className="flex items-center justify-end space-x-1 mt-1">
                  <button
                    onClick={() => course.id && onDelete(course.id)}
                    className="text-red-600 hover:text-red-900 p-1"
                    title="Delete Course"
                    disabled={!course.id}
                  >
                    Delete
                  </button>
                  <HelpTooltip helpKey="courseList_deleteButton" position="left" className="inline-flex" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CourseList;
