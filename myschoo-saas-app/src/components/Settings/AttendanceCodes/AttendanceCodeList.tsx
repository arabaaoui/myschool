import React from 'react';
import { AttendanceCode } from './AttendanceCodeForm';
import HelpTooltip from '../../common/HelpTooltip';

interface AttendanceCodeListProps {
  codes: AttendanceCode[];
  onEdit: (code: AttendanceCode) => void;
  onDelete: (codeId: string) => void;
  loading?: boolean;
  error?: string | null;
}

const AttendanceCodeList: React.FC<AttendanceCodeListProps> = ({
  codes,
  onEdit,
  onDelete,
  loading,
  error,
}) => {
  if (loading) {
    return <p className="text-center text-gray-500 py-4 text-sm md:text-base">Loading attendance codes...</p>;
  }

  if (error) {
    return <p className="text-center text-red-500 py-4 bg-red-100 rounded text-sm md:text-base">{error}</p>;
  }

  if (codes.length === 0) {
    return <p className="text-center text-gray-500 py-4 text-sm md:text-base">No attendance codes found. Add one to get started!</p>;
  }

  return (
    <div className="overflow-x-auto bg-white shadow-md rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
            <th scope="col" className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
            <th scope="col" className="hidden sm:table-cell px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
            <th scope="col" className="hidden md:table-cell px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sort Order</th>
            <th scope="col" className="relative px-4 py-2 sm:px-6 sm:py-3"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {codes.map((code) => (
            <tr key={code.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{code.code}</div>
              </td>
              <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-normal break-words text-sm text-gray-500">
                {code.description}
              </td>
              <td className="hidden sm:table-cell px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-500">
                {code.is_present_code && <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Present</span>}
                {code.is_absent_code && <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 ${code.is_present_code ? 'ml-1' : ''}`}>Absent</span>}
                {!(code.is_present_code || code.is_absent_code) && <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">Other</span>}
              </td>
              <td className="hidden md:table-cell px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-500">
                {code.sort_order !== null && code.sort_order !== undefined ? code.sort_order : 'N/A'}
              </td>
              <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end space-x-1">
                  <button
                    onClick={() => onEdit(code)}
                    className="text-indigo-600 hover:text-indigo-900 p-1"
                    title="Edit Attendance Code"
                  >
                    Edit
                  </button>
                  <HelpTooltip helpKey="attendanceCodeList_editButton" position="left" className="inline-flex" />
                </div>
                <div className="flex items-center justify-end space-x-1 mt-1">
                  <button
                    onClick={() => code.id && onDelete(code.id)}
                    className="text-red-600 hover:text-red-900 p-1"
                    title="Delete Attendance Code"
                    disabled={!code.id}
                  >
                    Delete
                  </button>
                  <HelpTooltip helpKey="attendanceCodeList_deleteButton" position="left" className="inline-flex" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AttendanceCodeList;
