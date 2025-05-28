import React from 'react';
import { CoursePeriod } from './CoursePeriodForm';
import { Course } from '../Courses/CourseForm';
import { UserProfile } from '../../../types'; // Assuming a UserProfile type
import HelpTooltip from '../../common/HelpTooltip';

// Placeholder for MarkingPeriod type
interface MarkingPeriod {
  id: string;
  name: string;
}

interface CoursePeriodListProps {
  periods: CoursePeriod[];
  courses: Course[];
  teachers: UserProfile[];
  markingPeriods: MarkingPeriod[]; // Placeholder
  onEdit: (period: CoursePeriod) => void;
  onDelete: (periodId: string) => void;
  loading?: boolean;
  error?: string | null;
}

const CoursePeriodList: React.FC<CoursePeriodListProps> = ({
  periods,
  courses,
  teachers,
  markingPeriods,
  onEdit,
  onDelete,
  loading,
  error,
}) => {
  const getCourseName = (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    return course ? course.name : 'Unknown Course';
  };

  const getTeacherName = (teacherId?: string | null) => {
    if (!teacherId) return 'N/A';
    const teacher = teachers.find(t => t.id === teacherId);
    return teacher ? (teacher.full_name || teacher.email) : 'Unknown Teacher';
  };

  const getMarkingPeriodName = (markingPeriodId: string) => {
    // Using placeholder markingPeriods list
    const mp = markingPeriods.find(m => m.id === markingPeriodId);
    return mp ? mp.name : 'Unknown Marking Period';
  };


  if (loading) {
    return <p className="text-center text-gray-500 py-4 text-sm md:text-base">Loading classes/sections...</p>;
  }

  if (error) {
    return <p className="text-center text-red-500 py-4 bg-red-100 rounded text-sm md:text-base">{error}</p>;
  }

  if (periods.length === 0) {
    return <p className="text-center text-gray-500 py-4 text-sm md:text-base">No classes/sections found. Add one to get started!</p>;
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
              Class/Section Name
            </th>
            <th
              scope="col"
              className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Course
            </th>
            <th
              scope="col"
              className="hidden md:table-cell px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Teacher
            </th>
            <th
              scope="col"
              className="hidden sm:table-cell px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Marking Period
            </th>
             <th
              scope="col"
              className="hidden lg:table-cell px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Room / Seats
            </th>
            <th scope="col" className="relative px-4 py-2 sm:px-6 sm:py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {periods.map((period) => (
            <tr key={period.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{period.name}</div>
              </td>
              <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-normal break-words text-sm text-gray-500">
                {getCourseName(period.course_id)}
              </td>
              <td className="hidden md:table-cell px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-500">
                {getTeacherName(period.teacher_id)}
              </td>
              <td className="hidden sm:table-cell px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-500">
                {getMarkingPeriodName(period.marking_period_id)}
              </td>
              <td className="hidden lg:table-cell px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-500">
                <div>Room: {period.room || 'N/A'}</div>
                <div>Seats: {period.max_seats !== null ? period.max_seats : 'N/A'}</div>
              </td>
              <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end space-x-1">
                  <button
                    onClick={() => onEdit(period)}
                    className="text-indigo-600 hover:text-indigo-900 p-1"
                    title="Edit Class/Section"
                  >
                    Edit
                  </button>
                  <HelpTooltip helpKey="coursePeriodList_editButton" position="left" className="inline-flex" />
                </div>
                <div className="flex items-center justify-end space-x-1 mt-1">
                  <button
                    onClick={() => period.id && onDelete(period.id)}
                    className="text-red-600 hover:text-red-900 p-1"
                    title="Delete Class/Section"
                    disabled={!period.id}
                  >
                    Delete
                  </button>
                  <HelpTooltip helpKey="coursePeriodList_deleteButton" position="left" className="inline-flex" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CoursePeriodList;
