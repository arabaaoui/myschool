import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { StudentEnrollment } from './EnrollStudentForm'; // Re-use type
import { Student } from '../Students/StudentForm';
import { CoursePeriod } from '../Courses/CoursePeriods/CoursePeriodForm';
import { Course } from '../Courses/Courses/CourseForm';
import HelpTooltip from '../common/HelpTooltip';

// Extended types for display
interface DisplayableCoursePeriod extends CoursePeriod {
  course_name?: string;
  courses?: { name?: string }; // Nested course for Supabase join
}
interface DisplayableEnrollment extends StudentEnrollment {
  students?: { first_name?: string, last_name?: string, student_identifier?: string };
  course_periods?: DisplayableCoursePeriod;
}


interface StudentEnrollmentListProps {
  enrollments: DisplayableEnrollment[];
  onWithdraw: (enrollmentId: string, withdrawalDate: string) => Promise<void>; // Make it async
  loading?: boolean;
  error?: string | null;
  listTitle?: string; // e.g., "Enrollments for [Student Name]" or "[Class Name] Roster"
}

const StudentEnrollmentList: React.FC<StudentEnrollmentListProps> = ({
  enrollments,
  onWithdraw,
  loading,
  error,
  listTitle = "Current Enrollments"
}) => {
  const [withdrawalDateMap, setWithdrawalDateMap] = useState<Record<string, string>>({});
  const [showWithdrawInputMap, setShowWithdrawInputMap] = useState<Record<string, boolean>>({});

  const handleWithdrawDateChange = (enrollmentId: string, date: string) => {
    setWithdrawalDateMap(prev => ({ ...prev, [enrollmentId]: date }));
  };

  const toggleWithdrawInput = (enrollmentId: string) => {
    setShowWithdrawInputMap(prev => ({ ...prev, [enrollmentId]: !prev[enrollmentId] }));
    if (!showWithdrawInputMap[enrollmentId]) {
      // Default to today if opening input
      setWithdrawalDateMap(prev => ({ ...prev, [enrollmentId]: new Date().toISOString().split('T')[0] }));
    }
  };

  const handleConfirmWithdraw = async (enrollmentId: string) => {
    const date = withdrawalDateMap[enrollmentId];
    if (!date) {
        alert("Please select a withdrawal date.");
        return;
    }
    await onWithdraw(enrollmentId, date);
    setShowWithdrawInputMap(prev => ({ ...prev, [enrollmentId]: false })); // Hide input after action
  };


  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return 'N/A';
    // Handles potential timezone issues by ensuring we work with the date as is.
    const date = new Date(dateString + 'T00:00:00'); // Assume date string is YYYY-MM-DD and interpret as local
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };


  if (loading) {
    return <p className="text-center text-gray-500 py-4 text-sm md:text-base">Loading enrollments...</p>;
  }

  if (error) {
    return <p className="text-center text-red-500 py-4 bg-red-100 rounded text-sm md:text-base">{error}</p>;
  }

  return (
    <div className="bg-white shadow-md rounded-lg mt-6">
      <h3 className="text-lg sm:text-xl font-semibold text-gray-700 p-4 border-b border-gray-200">{listTitle}</h3>
      {enrollments.length === 0 ? (
         <p className="text-center text-gray-500 py-6 text-sm md:text-base">No enrollments found for the current selection.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                <th scope="col" className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class/Section</th>
                <th scope="col" className="hidden sm:table-cell px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enrollment Date</th>
                <th scope="col" className="hidden md:table-cell px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Withdrawal Date</th>
                <th scope="col" className="relative px-4 py-2 sm:px-6 sm:py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {enrollments.map((enrollment) => (
                <tr key={enrollment.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {enrollment.students?.last_name}, {enrollment.students?.first_name}
                    </div>
                    <div className="text-xs text-gray-500">{enrollment.students?.student_identifier || 'N/A'}</div>
                  </td>
                  <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-normal break-words text-sm text-gray-500">
                    {enrollment.course_periods?.courses?.name || enrollment.course_periods?.course_name} - {enrollment.course_periods?.name}
                  </td>
                  <td className="hidden sm:table-cell px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(enrollment.enrollment_date)}
                  </td>
                  <td className="hidden md:table-cell px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-500">
                    {enrollment.withdrawal_date ? formatDate(enrollment.withdrawal_date) : 'Active'}
                  </td>
                  <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-right text-sm font-medium">
                    {!enrollment.withdrawal_date && !showWithdrawInputMap[enrollment.id!] && (
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => toggleWithdrawInput(enrollment.id!)}
                          className="text-orange-600 hover:text-orange-900 p-1"
                          title="Withdraw Student"
                        >
                          Withdraw
                        </button>
                        <HelpTooltip helpKey="enrollmentList_withdrawButton" position="left" className="inline-flex" />
                      </div>
                    )}
                    {showWithdrawInputMap[enrollment.id!] && (
                      <div className="space-y-1">
                        <input
                          type="date"
                          value={withdrawalDateMap[enrollment.id!] || ''}
                          onChange={(e) => handleWithdrawDateChange(enrollment.id!, e.target.value)}
                          className="block w-full max-w-xs px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                        <div className="flex justify-end space-x-2">
                            <button onClick={() => handleConfirmWithdraw(enrollment.id!)} className="text-xs p-1 bg-green-500 text-white rounded hover:bg-green-600">Confirm</button>
                            <button onClick={() => toggleWithdrawInput(enrollment.id!)} className="text-xs p-1 bg-gray-300 rounded hover:bg-gray-400">Cancel</button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default StudentEnrollmentList;
