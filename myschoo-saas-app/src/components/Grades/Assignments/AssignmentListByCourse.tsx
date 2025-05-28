import React from 'react';
import { Assignment } from './AssignmentForm'; // Assuming Assignment type is defined in AssignmentForm
import { AssignmentType } from '../../Settings/AssignmentTypes/AssignmentTypeForm';
import HelpTooltip from '../../common/HelpTooltip';

interface AssignmentListByCourseProps {
  assignments: Assignment[];
  assignmentTypes: AssignmentType[]; // To display type name
  onEdit: (assignment: Assignment) => void;
  onDelete: (assignmentId: string) => void;
  loading?: boolean;
  error?: string | null;
  coursePeriodName?: string; // For context
}

const AssignmentListByCourse: React.FC<AssignmentListByCourseProps> = ({
  assignments,
  assignmentTypes,
  onEdit,
  onDelete,
  loading,
  error,
  coursePeriodName,
}) => {
  const getAssignmentTypeName = (typeId: string) => {
    const type = assignmentTypes.find(t => t.id === typeId);
    return type ? type.name : 'Unknown Type';
  };

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return <p className="text-center text-gray-500 py-4 text-sm md:text-base">Loading assignments for {coursePeriodName || 'class'}...</p>;
  }

  if (error) {
    return <p className="text-center text-red-500 py-4 bg-red-100 rounded text-sm md:text-base">{error}</p>;
  }

  if (assignments.length === 0) {
    return <p className="text-center text-gray-500 py-4 text-sm md:text-base">No assignments found for {coursePeriodName || 'this class'}. Add one to get started!</p>;
  }

  return (
    <div className="overflow-x-auto bg-white shadow-md rounded-lg mt-4">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
            <th className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
            <th className="hidden sm:table-cell px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
            <th className="hidden md:table-cell px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Max Points</th>
            <th className="relative px-4 py-2 sm:px-6 sm:py-3"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {assignments.map((assignment) => (
            <tr key={assignment.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-normal break-words">
                <div className="text-sm font-medium text-gray-900">{assignment.title}</div>
                {assignment.description && (
                  <div className="text-xs text-gray-500 mt-1 truncate hover:whitespace-normal max-w-xs">
                    {assignment.description}
                  </div>
                )}
              </td>
              <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-500">
                {getAssignmentTypeName(assignment.assignment_type_id)}
              </td>
              <td className="hidden sm:table-cell px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDate(assignment.due_date)}
              </td>
              <td className="hidden md:table-cell px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-500">
                {Number(assignment.max_points).toFixed(2)}
              </td>
              <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end space-x-1">
                  <button
                    onClick={() => onEdit(assignment)}
                    className="text-indigo-600 hover:text-indigo-900 p-1"
                    title="Edit Assignment"
                  >
                    Edit
                  </button>
                  <HelpTooltip helpKey="assignmentList_editButton" position="left" className="inline-flex" />
                </div>
                <div className="flex items-center justify-end space-x-1 mt-1">
                  <button
                    onClick={() => assignment.id && onDelete(assignment.id)}
                    className="text-red-600 hover:text-red-900 p-1"
                    title="Delete Assignment"
                    disabled={!assignment.id}
                  >
                    Delete
                  </button>
                  <HelpTooltip helpKey="assignmentList_deleteButton" position="left" className="inline-flex" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AssignmentListByCourse;
