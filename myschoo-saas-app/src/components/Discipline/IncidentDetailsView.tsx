import React from 'react';
import { DisplayableDisciplineIncident } from './IncidentList'; // Use the extended type
import HelpTooltip from '../common/HelpTooltip';
import { useAuth } from '../../App';

interface IncidentDetailsViewProps {
  incident: DisplayableDisciplineIncident;
  onClose: () => void;
  onEdit: (incident: DisplayableDisciplineIncident) => void; // To trigger editing
}

const IncidentDetailsView: React.FC<IncidentDetailsViewProps> = ({ incident, onClose, onEdit }) => {
  const { isTenantAdmin } = useAuth(); // Or specific role for editing

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center p-4 print:bg-white print:inset-auto print:overflow-visible">
      <div className="relative bg-white p-6 sm:p-8 rounded-lg shadow-xl w-full max-w-2xl print:shadow-none print:rounded-none print:p-0">
        <div className="flex justify-between items-center border-b pb-3 mb-4 print:hidden">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">Incident Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close details"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="space-y-4 print:space-y-2">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Student</h3>
            <p className="text-base text-gray-900">{incident.students?.first_name} {incident.students?.last_name || 'N/A'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Incident Type</h3>
            <p className="text-base text-gray-900">{incident.discipline_incident_types?.name || incident.incident_type_name || 'N/A'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Date & Time of Incident</h3>
            <p className="text-base text-gray-900">{formatDate(incident.incident_date)}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Reported By</h3>
            <p className="text-base text-gray-900">{incident.user_profiles?.full_name || incident.user_profiles?.email || incident.reported_by_name || 'N/A'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Description of Incident</h3>
            <p className="text-base text-gray-900 whitespace-pre-wrap">{incident.description_of_incident}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Action Taken</h3>
            <p className="text-base text-gray-900 whitespace-pre-wrap">{incident.action_taken || 'N/A'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Status</h3>
            <p className={`text-base font-semibold ${
                incident.status === 'Resolved' ? 'text-green-600' :
                incident.status === 'Escalated' ? 'text-yellow-600' :
                'text-blue-600'
            }`}>
                {incident.status || 'N/A'}
            </p>
          </div>
           <div>
            <h3 className="text-sm font-medium text-gray-500">Reported At</h3>
            <p className="text-xs text-gray-700">{formatDate(incident.created_at)}</p>
          </div>
          {incident.updated_at && incident.updated_at !== incident.created_at && (
             <div>
                <h3 className="text-sm font-medium text-gray-500">Last Updated At</h3>
                <p className="text-xs text-gray-700">{formatDate(incident.updated_at)}</p>
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t flex flex-col sm:flex-row sm:justify-end space-y-2 sm:space-y-0 sm:space-x-3 print:hidden">
          {(isTenantAdmin) && ( // Example: Only admins can edit from here
             <button
                onClick={() => onEdit(incident)}
                className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Edit Incident
              </button>
          )}
          <button
            onClick={() => window.print()}
            className="w-full sm:w-auto px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            Print Details
          </button>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncidentDetailsView;
