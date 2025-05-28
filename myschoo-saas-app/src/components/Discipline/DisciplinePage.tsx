import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import IncidentList, { DisplayableDisciplineIncident } from './IncidentList';
import ReportIncidentForm, { DisciplineIncident } from './ReportIncidentForm';
import IncidentDetailsView from './IncidentDetailsView';
import HelpTooltip from '../common/HelpTooltip';
import { useAuth } from '../../App';
import { Student } from '../Students/StudentForm'; // For filtering
import { DisciplineIncidentType } from '../Settings/DisciplineIncidentTypes/IncidentTypeForm'; // For filtering

const DisciplinePage: React.FC = () => {
  const { user, isTenantAdmin, isTeacher } = useAuth();
  const [incidents, setIncidents] = useState<DisplayableDisciplineIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [showReportForm, setShowReportForm] = useState(false);
  const [showDetailsView, setShowDetailsView] = useState(false);
  const [incidentToEdit, setIncidentToEdit] = useState<DisciplineIncident | null>(null);
  const [incidentToView, setIncidentToView] = useState<DisplayableDisciplineIncident | null>(null);

  // For filtering the list
  const [students, setStudents] = useState<Student[]>([]);
  const [incidentTypes, setIncidentTypes] = useState<DisciplineIncidentType[]>([]);
  const [filterStudentId, setFilterStudentId] = useState<string>('');
  const [filterTypeId, setFilterTypeId] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');


  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('discipline_incidents')
        .select(`
          *,
          students (first_name, last_name),
          discipline_incident_types (name),
          user_profiles (full_name, email)
        `)
        .order('incident_date', { ascending: false });

      if (filterStudentId) query = query.eq('student_id', filterStudentId);
      if (filterTypeId) query = query.eq('incident_type_id', filterTypeId);
      if (filterStatus) query = query.eq('status', filterStatus);
        
      // Non-admins (teachers) might have more restricted view based on RLS (e.g., only see what they reported)
      // The RLS policy handles this, so no explicit client-side role check is strictly needed for the query itself,
      // but it's good to be aware of for UI/UX.

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      
      const displayData = (data || []).map(inc => ({
          ...inc,
          student_name: `${inc.students?.first_name || ''} ${inc.students?.last_name || ''}`.trim() || 'N/A',
          incident_type_name: inc.discipline_incident_types?.name || 'N/A',
          reported_by_name: inc.user_profiles?.full_name || inc.user_profiles?.email || 'N/A',
      }));
      setIncidents(displayData);

    } catch (err: any) {
      console.error('Error fetching incidents:', err);
      setError('Failed to load incidents. ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [filterStudentId, filterTypeId, filterStatus]);
  
  // Fetch data for filters
  useEffect(() => {
    const fetchFilterData = async () => {
        try {
            const { data: studentsData, error: sError } = await supabase.from('students').select('id, first_name, last_name').order('last_name');
            if(sError) throw sError;
            setStudents(studentsData || []);

            const { data: typesData, error: tError } = await supabase.from('discipline_incident_types').select('id, name').order('name');
            if(tError) throw tError;
            setIncidentTypes(typesData || []);
        } catch (err:any) {
            console.error("Error fetching filter data for discipline page: ", err);
            setError(prev => (prev ? prev + "; " : "") + "Failed to load filter options.");
        }
    };
    if(isTeacher || isTenantAdmin) {
        fetchFilterData();
    }
  }, [isTeacher, isTenantAdmin]);


  useEffect(() => {
    if(isTeacher || isTenantAdmin) {
        fetchIncidents();
    } else {
        setLoading(false);
        setError("You do not have permission to view discipline incidents.");
    }
  }, [fetchIncidents, isTeacher, isTenantAdmin]);

  const handleReportIncidentClick = () => {
    setIncidentToEdit(null);
    setShowReportForm(true);
    setShowDetailsView(false);
  };

  const handleViewDetails = (incident: DisplayableDisciplineIncident) => {
    setIncidentToView(incident);
    setShowDetailsView(true);
    setShowReportForm(false);
  };
  
  const handleEditIncident = (incident: DisciplineIncident) => {
    setIncidentToEdit(incident);
    setShowDetailsView(false); // Close details view if open
    setShowReportForm(true); // Open form for editing
  };


  const handleFormSave = (savedIncident: DisciplineIncident) => {
    fetchIncidents(); // Refetch to get the latest list including the new/updated one
    setShowReportForm(false);
    setIncidentToEdit(null);
    // If details view was for the edited item, update it or close it
    if(incidentToView?.id === savedIncident.id) {
        // Potentially refetch the single incident for details view or just close
        setShowDetailsView(false); 
        setIncidentToView(null);
    }
  };

  const handleFormCancel = () => {
    setShowReportForm(false);
    setIncidentToEdit(null);
  };
  
  const handleDetailsClose = () => {
      setShowDetailsView(false);
      setIncidentToView(null);
  }

  if (!isTeacher && !isTenantAdmin && !loading) {
    return <p className="p-4 text-red-500">{error || "You do not have permission to access this module."}</p>;
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div className="flex items-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Discipline Management</h1>
          <HelpTooltip helpKey="discipline_intro" position="right" className="ml-2" />
        </div>
        { !showReportForm && !showDetailsView && (isTeacher || isTenantAdmin) && (
          <button
            onClick={handleReportIncidentClick}
            className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition ease-in-out duration-150"
          >
            Report New Incident
          </button>
        )}
      </div>

      {/* Filters for Incident List */}
      { !showReportForm && !showDetailsView && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg shadow grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
                <label htmlFor="filter_student_disc" className="block text-sm font-medium text-gray-700">Student:</label>
                <select id="filter_student_disc" value={filterStudentId} onChange={e => setFilterStudentId(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                    <option value="">All Students</option>
                    {students.map(s => <option key={s.id} value={s.id!}>{s.last_name}, {s.first_name}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="filter_type_disc" className="block text-sm font-medium text-gray-700">Incident Type:</label>
                <select id="filter_type_disc" value={filterTypeId} onChange={e => setFilterTypeId(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                    <option value="">All Types</option>
                    {incidentTypes.map(it => <option key={it.id} value={it.id!}>{it.name}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="filter_status_disc" className="block text-sm font-medium text-gray-700">Status:</label>
                <select id="filter_status_disc" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                    <option value="">All Statuses</option>
                    <option value="Pending Review">Pending Review</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Escalated">Escalated</option>
                </select>
            </div>
            <button onClick={() => fetchIncidents()} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 sm:text-sm">Apply Filters</button>
        </div>
      )}

      {error && !loading && <p className="mb-4 text-red-600 bg-red-100 p-3 rounded-md text-sm md:text-base">{error}</p>}

      {showReportForm ? (
        <ReportIncidentForm
          incidentToEdit={incidentToEdit}
          onSave={handleFormSave}
          onCancel={handleFormCancel}
        />
      ) : showDetailsView && incidentToView ? (
        <IncidentDetailsView 
            incident={incidentToView} 
            onClose={handleDetailsClose}
            onEdit={handleEditIncident}
        />
      ) : (
        <IncidentList
          incidents={incidents}
          onViewDetails={handleViewDetails}
          loading={loading}
          // onDelete={isTenantAdmin ? handleDeleteIncident : undefined} // Optional: Admin delete
        />
      )}
    </div>
  );
};

export default DisciplinePage;
