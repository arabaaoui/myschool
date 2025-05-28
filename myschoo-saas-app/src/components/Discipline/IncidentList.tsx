import React from 'react';
import { DisciplineIncident } from './ReportIncidentForm'; // Assuming type is exported
import { Student } from '../Students/StudentForm';
import { DisciplineIncidentType } from '../Settings/DisciplineIncidentTypes/IncidentTypeForm';
import { UserProfile } from '../../types';
import HelpTooltip from '../common/HelpTooltip';

// Extend DisciplineIncident for display purposes
export interface DisplayableDisciplineIncident extends DisciplineIncident {
  student_name?: string;
  incident_type_name?: string;
  reported_by_name?: string;
  students?: Pick<Student, 'first_name' | 'last_name'>;
  discipline_incident_types?: Pick<DisciplineIncidentType, 'name'>;
  user_profiles?: Pick<UserProfile, 'full_name' | 'email'>;
}


interface IncidentListProps {
  incidents: DisplayableDisciplineIncident[];
  onViewDetails: (incident: DisplayableDisciplineIncident) => void; // For viewing/editing details
  // onDelete?: (incidentId: string) => void; // Optional delete, might be admin only
  loading?: boolean;
  error?: string | null;
  title?: string;
}

const IncidentList: React.FC<IncidentListProps> = ({
  incidents,
  onViewDetails,
  // onDelete,
  loading,
  error,
  title = "Discipline Incidents"
}) => {

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString(undefined, { 
        year: 'numeric', month: 'short', day: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
    });
  };

  if (loading) {
    return <p className="text-center text-gray-500 py-4 text-sm md:text-base">Loading incidents...</p>;
  }

  if (error) {
    return <p className="text-center text-red-500 py-4 bg-red-100 rounded text-sm md:text-base">{error}</p>;
  }

  if (incidents.length === 0) {
    return <p className="text-center text-gray-500 py-4 text-sm md:text-base">No discipline incidents found for the current filters.</p>;
  }

  return (
    <div className="overflow-x-auto bg-white shadow-md rounded-lg">
       <h3 className="text-lg sm:text-xl font-semibold text-gray-700 p-4 border-b border-gray-200">{title}</h3>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
            <th scope="col" className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Incident Type</th>
            <th scope="col" className="hidden md:table-cell px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
            <th scope="col" className="hidden sm:table-cell px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reported By</th>
            <th scope="col" className="hidden lg:table-cell px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th scope="col" className="relative px-4 py-2 sm:px-6 sm:py-3"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {incidents.map((incident) => (
            <tr key={incident.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">
                    {incident.students?.last_name || 'N/A'}, {incident.students?.first_name || ''}
                </div>
              </td>
              <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-normal break-words text-sm text-gray-500">
                {incident.discipline_incident_types?.name || incident.incident_type_name || 'N/A'}
              </td>
              <td className="hidden md:table-cell px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDate(incident.incident_date)}
              </td>
              <td className="hidden sm:table-cell px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-500">
                {incident.user_profiles?.full_name || incident.user_profiles?.email || incident.reported_by_name || 'N/A'}
              </td>
              <td className="hidden lg:table-cell px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap">
                 <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        incident.status === 'Resolved' ? 'bg-green-100 text-green-800' : 
                        incident.status === 'Escalated' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-blue-100 text-blue-800' // Pending Review or other
                    }`}
                    >
                    {incident.status || 'N/A'}
                </span>
              </td>
              <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end space-x-1">
                  <button
                    onClick={() => onViewDetails(incident)}
                    className="text-indigo-600 hover:text-indigo-900 p-1"
                    title="View/Edit Details"
                  >
                    Details
                  </button>
                  <HelpTooltip helpKey="disciplineIncidentList_viewDetailsButton" position="left" className="inline-flex" />
                </div>
                {/* Optional: Delete button for admins, if required
                {onDelete && (
                    <div className="flex items-center justify-end space-x-1 mt-1">
                    <button
                        onClick={() => incident.id && onDelete(incident.id)}
                        className="text-red-600 hover:text-red-900 p-1"
                        title="Delete Incident"
                        disabled={!incident.id}
                    >
                        Delete
                    </button>
                    </div>
                )}
                */}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default IncidentList;
