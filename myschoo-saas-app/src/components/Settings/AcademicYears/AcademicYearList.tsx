import React from 'react';
import { AcademicYear } from './AcademicYearForm';
import HelpTooltip from '../../common/HelpTooltip';

interface AcademicYearListProps {
  years: AcademicYear[];
  onEdit: (year: AcademicYear) => void;
  onDelete: (yearId: string) => void;
  loading?: boolean;
  error?: string | null;
}

const AcademicYearList: React.FC<AcademicYearListProps> = ({
  years,
  onEdit,
  onDelete,
  loading,
  error,
}) => {
  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return 'N/A';
    // Handles potential timezone issues by ensuring we work with the date as is.
    const date = new Date(dateString + 'T00:00:00'); // Assume date string is YYYY-MM-DD and interpret as local
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (loading) {
    return <p className="text-center text-gray-500 py-4 text-sm md:text-base">Loading academic years...</p>;
  }

  if (error) {
    return <p className="text-center text-red-500 py-4 bg-red-100 rounded text-sm md:text-base">{error}</p>;
  }

  if (years.length === 0) {
    return <p className="text-center text-gray-500 py-4 text-sm md:text-base">No academic years found. Add one to get started!</p>;
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
              Academic Year Name
            </th>
            <th
              scope="col"
              className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Start Date
            </th>
            <th
              scope="col"
              className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              End Date
            </th>
            <th scope="col" className="relative px-4 py-2 sm:px-6 sm:py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {years.map((year) => (
            <tr key={year.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{year.name}</div>
              </td>
              <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDate(year.start_date)}
              </td>
              <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDate(year.end_date)}
              </td>
              <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end space-x-1">
                  <button
                    onClick={() => onEdit(year)}
                    className="text-indigo-600 hover:text-indigo-900 p-1"
                    title="Edit Academic Year"
                  >
                    Edit
                  </button>
                  <HelpTooltip helpKey="academicYearList_editButton" position="left" className="inline-flex" />
                </div>
                <div className="flex items-center justify-end space-x-1 mt-1">
                  <button
                    onClick={() => year.id && onDelete(year.id)}
                    className="text-red-600 hover:text-red-900 p-1"
                    title="Delete Academic Year"
                    disabled={!year.id}
                  >
                    Delete
                  </button>
                  <HelpTooltip helpKey="academicYearList_deleteButton" position="left" className="inline-flex" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AcademicYearList;
