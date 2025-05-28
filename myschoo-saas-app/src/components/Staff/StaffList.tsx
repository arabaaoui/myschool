import React from 'react';
import { UserProfile } from '../../types'; // Import UserProfile type
import HelpTooltip from '../common/HelpTooltip';

interface StaffListProps {
  staffMembers: UserProfile[];
  onEdit: (staffMember: UserProfile) => void;
  loading?: boolean;
  error?: string | null;
}

const StaffList: React.FC<StaffListProps> = ({
  staffMembers,
  onEdit,
  loading,
  error,
}) => {
  if (loading) {
    return <p className="text-center text-gray-500 py-4 text-sm md:text-base">Loading staff members...</p>;
  }

  if (error) {
    return <p className="text-center text-red-500 py-4 bg-red-100 rounded text-sm md:text-base">{error}</p>;
  }

  if (staffMembers.length === 0) {
    return <p className="text-center text-gray-500 py-4 text-sm md:text-base">No staff members found.</p>;
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
              Full Name
            </th>
            <th
              scope="col"
              className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Email
            </th>
            <th
              scope="col"
              className="hidden sm:table-cell px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Role
            </th>
            <th
              scope="col"
              className="hidden md:table-cell px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Status
            </th>
            <th scope="col" className="relative px-4 py-2 sm:px-6 sm:py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {staffMembers.map((staff) => (
            <tr key={staff.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{staff.full_name || 'N/A'}</div>
              </td>
              <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-500">
                {staff.email}
              </td>
              <td className="hidden sm:table-cell px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-500">
                {staff.role ? staff.role.charAt(0).toUpperCase() + staff.role.slice(1) : 'N/A'}
              </td>
              <td className="hidden md:table-cell px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap">
                <span
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    staff.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {staff.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end space-x-1">
                  <button
                    onClick={() => onEdit(staff)}
                    className="text-indigo-600 hover:text-indigo-900 p-1"
                    title="Edit Staff Member"
                  >
                    Edit
                  </button>
                  <HelpTooltip helpKey="staffList_editButton" position="left" className="inline-flex" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default StaffList;
