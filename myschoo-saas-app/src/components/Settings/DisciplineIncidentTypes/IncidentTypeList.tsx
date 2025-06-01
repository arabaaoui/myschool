import React from 'react';
import { DisciplineIncidentType } from './IncidentTypeForm';
import HelpTooltip from '../../common/HelpTooltip';

interface IncidentTypeListProps {
  types: DisciplineIncidentType[];
  onEdit: (type: DisciplineIncidentType) => void;
  onDelete: (typeId: string) => void;
  loading?: boolean;
  error?: string | null;
}

const IncidentTypeList: React.FC<IncidentTypeListProps> = ({
  types,
  onEdit,
  onDelete,
  loading,
  error,
}) => {
  if (loading) {
    return <p className="text-center text-gray-500 py-4 text-sm md:text-base">Loading incident types...</p>;
  }

  if (error) {
    return <p className="text-center text-red-500 py-4 bg-red-100 rounded text-sm md:text-base">{error}</p>;
  }

  if (types.length === 0) {
    return <p className="text-center text-gray-500 py-4 text-sm md:text-base">No incident types found. Add one to get started!</p>;
  }

  return (
    <div className="overflow-x-auto bg-white shadow-md rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th scope="col" className="hidden sm:table-cell px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
            <th scope="col" className="hidden md:table-cell px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th scope="col" className="relative px-4 py-2 sm:px-6 sm:py-3"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {types.map((type) => (
            <tr key={type.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{type.name}</div>
              </td>
              <td className="hidden sm:table-cell px-4 py-3 sm:px-6 sm:py-4 whitespace-normal break-words text-sm text-gray-500 max-w-sm truncate hover:whitespace-normal">
                {type.description || 'N/A'}
              </td>
              <td className="hidden md:table-cell px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap">
                <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    type.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                >
                    {type.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end space-x-1">
                  <button
                    onClick={() => onEdit(type)}
                    className="text-indigo-600 hover:text-indigo-900 p-1"
                    title="Edit Incident Type"
                  >
                    Edit
                  </button>
                  <HelpTooltip helpKey="incidentTypeList_editButton" position="left" className="inline-flex" />
                </div>
                <div className="flex items-center justify-end space-x-1 mt-1">
                  <button
                    onClick={() => type.id && onDelete(type.id)}
                    className="text-red-600 hover:text-red-900 p-1"
                    title="Delete Incident Type"
                    disabled={!type.id}
                  >
                    Delete
                  </button>
                  <HelpTooltip helpKey="incidentTypeList_deleteButton" position="left" className="inline-flex" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default IncidentTypeList;
