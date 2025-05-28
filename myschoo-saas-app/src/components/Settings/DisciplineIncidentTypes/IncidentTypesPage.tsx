import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';
import IncidentTypeList from './IncidentTypeList';
import IncidentTypeForm, { DisciplineIncidentType } from './IncidentTypeForm';
import HelpTooltip from '../../common/HelpTooltip';
import { useAuth } from '../../../App'; // To check admin role

const IncidentTypesPage: React.FC = () => {
  const { isTenantAdmin } = useAuth();
  const [incidentTypes, setIncidentTypes] = useState<DisciplineIncidentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [typeToEdit, setTypeToEdit] = useState<DisciplineIncidentType | null>(null);

  const fetchIncidentTypes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('discipline_incident_types')
        .select('*')
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;
      setIncidentTypes(data || []);
    } catch (err: any) {
      console.error('Error fetching incident types:', err);
      setError('Failed to load incident types. ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isTenantAdmin) {
        fetchIncidentTypes();
    } else {
        setLoading(false);
        setError("You do not have permission to manage discipline incident types.");
    }
  }, [fetchIncidentTypes, isTenantAdmin]);

  const handleAddClick = () => {
    setTypeToEdit(null);
    setShowForm(true);
  };

  const handleEdit = (type: DisciplineIncidentType) => {
    setTypeToEdit(type);
    setShowForm(true);
  };

  const handleDelete = async (typeId: string) => {
    if (!window.confirm('Are you sure you want to delete this incident type? This might fail if incidents are associated with it.')) {
      return;
    }
    setError(null);
    try {
      const { error: deleteError } = await supabase
        .from('discipline_incident_types')
        .delete()
        .eq('id', typeId);

      if (deleteError) throw deleteError;
      setIncidentTypes((prev) => prev.filter((t) => t.id !== typeId));
    } catch (err: any) {
      console.error('Error deleting incident type:', err);
      setError('Failed to delete incident type. It might be in use. ' + err.message);
    }
  };

  const handleFormSave = (savedType: DisciplineIncidentType) => {
    if (typeToEdit) {
      setIncidentTypes((prev) =>
        prev.map((t) => (t.id === savedType.id ? savedType : t))
      );
    } else {
      setIncidentTypes((prev) => [...prev, savedType]);
    }
    // Re-sort types alphabetically by name after adding/editing
    setIncidentTypes(currentTypes => [...currentTypes].sort((a, b) => a.name.localeCompare(b.name)));
    setShowForm(false);
    setTypeToEdit(null);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setTypeToEdit(null);
  };
  
  if (!isTenantAdmin && !loading) {
    return (
        <div className="p-4 md:p-6">
            <p className="text-red-500">{error || "You do not have permission to manage discipline incident types."}</p>
        </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div className="flex items-center">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">Manage Discipline Incident Types</h2>
          <HelpTooltip helpKey="disciplineIncidentTypes_intro" position="right" className="ml-2" />
        </div>
        {!showForm && (
          <button
            onClick={handleAddClick}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition ease-in-out duration-150"
          >
            Add New Incident Type
          </button>
        )}
      </div>

      {error && !showForm && <p className="mb-4 text-red-600 bg-red-100 p-3 rounded-md text-sm md:text-base">{error}</p>}

      {showForm ? (
        <IncidentTypeForm
          typeToEdit={typeToEdit}
          onSave={handleFormSave}
          onCancel={handleFormCancel}
        />
      ) : (
        <IncidentTypeList
          types={incidentTypes}
          onEdit={handleEdit}
          onDelete={handleDelete}
          loading={loading}
        />
      )}
    </div>
  );
};

export default IncidentTypesPage;
