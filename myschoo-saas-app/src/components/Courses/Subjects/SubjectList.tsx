import React from 'react';
import { Subject } from './SubjectForm';
import HelpTooltip from '../../common/HelpTooltip';

interface SubjectListProps {
  subjects: Subject[];
  onEdit: (subject: Subject) => void;
  onDelete: (subjectId: string) => void;
  loading?: boolean;
  error?: string | null;
}

const SubjectList: React.FC<SubjectListProps> = ({
  subjects,
  onEdit,
  onDelete,
  loading,
  error,
}) => {
  if (loading) {
    return <p className="text-center text-gray-500 py-4 text-sm md:text-base">Loading subjects...</p>;
  }

  if (error) {
    return <p className="text-center text-red-500 py-4 bg-red-100 rounded text-sm md:text-base">{error}</p>;
  }

  if (subjects.length === 0) {
    return <p className="text-center text-gray-500 py-4 text-sm md:text-base">No subjects found. Add one to get started!</p>;
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
              Subject Name
            </th>
            <th
              scope="col"
              className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Code
            </th>
            <th scope="col" className="relative px-4 py-2 sm:px-6 sm:py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {subjects.map((subject) => (
            <tr key={subject.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{subject.name}</div>
              </td>
              <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-500">
                {subject.code || 'N/A'}
              </td>
              <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end space-x-1">
                  <button
                    onClick={() => onEdit(subject)}
                    className="text-indigo-600 hover:text-indigo-900 p-1"
                    title="Edit Subject"
                  >
                    Edit
                  </button>
                  <HelpTooltip helpKey="subjectList_editButton" position="left" className="inline-flex" />
                </div>
                <div className="flex items-center justify-end space-x-1 mt-1">
                  <button
                    onClick={() => subject.id && onDelete(subject.id)}
                    className="text-red-600 hover:text-red-900 p-1"
                    title="Delete Subject"
                    disabled={!subject.id}
                  >
                    Delete
                  </button>
                  <HelpTooltip helpKey="subjectList_deleteButton" position="left" className="inline-flex" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SubjectList;
