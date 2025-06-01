import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import HelpTooltip from '../common/HelpTooltip';
import { Student } from '../Students/StudentForm';
import { DisciplineIncidentType } from '../Settings/DisciplineIncidentTypes/IncidentTypeForm';
import { useAuth, useToasts } from '../../App'; // Import useToasts

export interface DisciplineIncident {
  id?: string;
  tenant_id?: string;
  student_id: string;
  incident_type_id: string;
  incident_date?: string;
  reported_by_user_id?: string | null;
  description_of_incident: string;
  action_taken?: string | null;
  status?: string | null;
}

interface ReportIncidentFormProps {
  incidentToEdit?: DisciplineIncident | null;
  onSave: (incident: DisciplineIncident) => void;
  onCancel: () => void;
}

const ReportIncidentForm: React.FC<ReportIncidentFormProps> = ({ incidentToEdit, onSave, onCancel }) => {
  const { user } = useAuth();
  const toasts = useToasts(); // Use the toasts hook
  const [formData, setFormData] = useState<DisciplineIncident>({
    student_id: '',
    incident_type_id: '',
    incident_date: new Date().toISOString().slice(0, 16),
    reported_by_user_id: user?.id || null,
    description_of_incident: '',
    action_taken: null,
    status: 'Pending Review',
    ...incidentToEdit,
  });

  const [students, setStudents] = useState<Student[]>([]);
  const [incidentTypes, setIncidentTypes] = useState<DisciplineIncidentType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null); // Keep for form-specific error display
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);

  useEffect(() => {
    const fetchDropdownData = async () => {
      setLoadingDropdowns(true);
      try {
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('id, first_name, last_name, student_identifier')
          .order('last_name', { ascending: true });
        if (studentsError) throw studentsError;
        setStudents(studentsData || []);

        const { data: typesData, error: typesError } = await supabase
          .from('discipline_incident_types')
          .select('id, name')
          .eq('is_active', true)
          .order('name', { ascending: true });
        if (typesError) throw typesError;
        setIncidentTypes(typesData || []);

        if (incidentToEdit) {
            setFormData({
                ...incidentToEdit,
                incident_date: incidentToEdit.incident_date ? new Date(incidentToEdit.incident_date).toISOString().slice(0, 16) : new Date().toISOString().slice(0,16),
                reported_by_user_id: incidentToEdit.reported_by_user_id || user?.id || null,
            });
        } else if (studentsData?.length && typesData?.length) {
            // No pre-fill to allow deliberate user choice
        }

      } catch (err: any) {
        toasts.showErrorToast('Failed to load data for form: ' + err.message);
        setError('Failed to load data for form: ' + err.message);
      } finally {
        setLoadingDropdowns(false);
      }
    };
    fetchDropdownData();
  }, [incidentToEdit, user?.id, toasts]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.student_id) { setError('Please select a student.'); setLoading(false); return; }
    if (!formData.incident_type_id) { setError('Please select an incident type.'); setLoading(false); return; }
    if (!formData.incident_date) { setError('Incident date is required.'); setLoading(false); return; }
    if (!formData.description_of_incident.trim()) { setError('Description cannot be empty.'); setLoading(false); return; }

    try {
      let resultIncident: DisciplineIncident;
      const dataToSave = {
        ...formData,
        reported_by_user_id: formData.reported_by_user_id || user?.id,
        incident_date: new Date(formData.incident_date!).toISOString(),
      };

      if (incidentToEdit && incidentToEdit.id) {
        const { data, error: updateError } = await supabase
          .from('discipline_incidents')
          .update(dataToSave)
          .eq('id', incidentToEdit.id)
          .select()
          .single();
        if (updateError) throw updateError;
        resultIncident = data as DisciplineIncident;
        toasts.showSuccessToast('Incident report updated successfully!');
      } else {
        const { id, tenant_id, ...insertData } = dataToSave;
        const { data, error: insertError } = await supabase
          .from('discipline_incidents')
          .insert(insertData)
          .select()
          .single();
        if (insertError) throw insertError;
        resultIncident = data as DisciplineIncident;
        toasts.showSuccessToast('Incident reported successfully!');
      }
      onSave(resultIncident);
    } catch (err: any) {
      console.error('Error saving incident:', err);
      const message = err.message || 'Failed to save incident.';
      setError(message);
      toasts.showErrorToast(message);
    } finally {
      setLoading(false);
    }
  };

  if (loadingDropdowns) {
    return <p className="text-center text-gray-500 py-4">Loading form data...</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-4 sm:p-6 bg-white shadow-md rounded-lg max-w-xl mx-auto">
      <h2 className="text-xl sm:text-2xl font-semibold text-gray-700">
        {incidentToEdit ? 'Edit Discipline Incident' : 'Report New Discipline Incident'}
      </h2>
      {error && <p className="text-red-500 text-sm bg-red-100 p-3 rounded-md">{error}</p>}

      <div>
        <label htmlFor="student_id" className="flex items-center text-sm font-medium text-gray-700">
          Student <span className="text-red-500 ml-1">*</span>
          <HelpTooltip helpKey="disciplineIncidentForm_student" />
        </label>
        <select id="student_id" name="student_id" value={formData.student_id} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
          <option value="">-- Select Student --</option>
          {students.map(s => <option key={s.id} value={s.id!}>{s.last_name}, {s.first_name} ({s.student_identifier || 'ID N/A'})</option>)}
        </select>
      </div>

      <div>
        <label htmlFor="incident_type_id" className="flex items-center text-sm font-medium text-gray-700">
          Incident Type <span className="text-red-500 ml-1">*</span>
          <HelpTooltip helpKey="disciplineIncidentForm_incidentType" />
        </label>
        <select id="incident_type_id" name="incident_type_id" value={formData.incident_type_id} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
          <option value="">-- Select Type --</option>
          {incidentTypes.map(it => <option key={it.id} value={it.id!}>{it.name}</option>)}
        </select>
      </div>

      <div>
        <label htmlFor="incident_date" className="flex items-center text-sm font-medium text-gray-700">
          Incident Date & Time <span className="text-red-500 ml-1">*</span>
          <HelpTooltip helpKey="disciplineIncidentForm_incidentDate" />
        </label>
        <input type="datetime-local" id="incident_date" name="incident_date" value={formData.incident_date || ''} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
      </div>

      <div>
        <label htmlFor="description_of_incident" className="flex items-center text-sm font-medium text-gray-700">
          Description of Incident <span className="text-red-500 ml-1">*</span>
          <HelpTooltip helpKey="disciplineIncidentForm_description" />
        </label>
        <textarea id="description_of_incident" name="description_of_incident" value={formData.description_of_incident} onChange={handleChange} required rows={4} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"></textarea>
      </div>

      <div>
        <label htmlFor="action_taken" className="flex items-center text-sm font-medium text-gray-700">
          Action Taken (Optional)
          <HelpTooltip helpKey="disciplineIncidentForm_actionTaken" />
        </label>
        <textarea id="action_taken" name="action_taken" value={formData.action_taken || ''} onChange={handleChange} rows={2} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"></textarea>
      </div>

      { (user?.app_metadata?.role === 'admin') &&
        <div>
            <label htmlFor="status" className="flex items-center text-sm font-medium text-gray-700">
            Status
            <HelpTooltip helpKey="disciplineIncidentForm_status" />
            </label>
            <select id="status" name="status" value={formData.status || 'Pending Review'} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                <option value="Pending Review">Pending Review</option>
                <option value="Resolved">Resolved</option>
                <option value="Escalated">Escalated</option>
            </select>
        </div>
      }


      <div className="flex flex-col sm:flex-row sm:justify-end sm:space-x-4 pt-2 space-y-2 sm:space-y-0">
        <button type="button" onClick={onCancel} className="w-full sm:w-auto inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          Cancel
        </button>
        <button type="submit" disabled={loading || loadingDropdowns} className="w-full sm:w-auto inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
          {loading ? (incidentToEdit ? 'Saving...' : 'Submitting...') : (incidentToEdit ? 'Save Changes' : 'Submit Incident Report')}
        </button>
      </div>
    </form>
  );
};

export default ReportIncidentForm;
