import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';
import AssignmentTypeList from './AssignmentTypeList';
import AssignmentTypeForm, { AssignmentType } from './AssignmentTypeForm';
import HelpTooltip from '../../common/HelpTooltip';
import { useAuth } from '../../../App'; // To check admin role

const AssignmentTypesPage: React.FC = () => {
  const { isTenantAdmin } = useAuth();
  const [types, setTypes] = useState<AssignmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [typeToEdit, setTypeToEdit] = useState<AssignmentType | null>(null);

  const fetchAssignmentTypes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('assignment_types')
        .select('*')
        .order('sort_order', { ascending: true, nullsLast: true })
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;
      setTypes(data || []);
    } catch (err: any) {
      console.error('Error fetching assignment types:', err);
      setError('Failed to load assignment types. ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isTenantAdmin) {
        fetchAssignmentTypes();
    } else {
        setLoading(false);
        setError("You do not have permission to manage assignment types.");
    }
  }, [fetchAssignmentTypes, isTenantAdmin]);

  const handleAddClick = () => {
    setTypeToEdit(null);
    setShowForm(true);
  };

  const handleEdit = (type: AssignmentType) => {
    setTypeToEdit(type);
    setShowForm(true);
  };

  const handleDelete = async (typeId: string) => {
    if (!window.confirm('Are you sure you want to delete this assignment type? This might fail if it is in use by assignments.')) {
      return;
    }
    setError(null);
    try {
      const { error: deleteError } = await supabase
        .from('assignment_types')
        .delete()
        .eq('id', typeId);

      if (deleteError) throw deleteError;
      setTypes((prev) => prev.filter((t) => t.id !== typeId));
    } catch (err: any) {
      console.error('Error deleting assignment type:', err);
      setError('Failed to delete assignment type. It might be in use. ' + err.message);
    }
  };

  const handleFormSave = (savedType: AssignmentType) => {
    if (typeToEdit) {
      setTypes((prev) =>
        prev.map((t) => (t.id === savedType.id ? savedType : t))
      );
    } else {
      setTypes((prev) => [...prev, savedType]);
    }
    // Re-sort types after adding/editing
    setTypes(currentTypes => [...currentTypes].sort((a, b) => {
        const sortOrderA = a.sort_order ?? Infinity;
        const sortOrderB = b.sort_order ?? Infinity;
        if (sortOrderA !== sortOrderB) {
            return sortOrderA - sortOrderB;
        }
        return a.name.localeCompare(b.name);
    }));
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
            <p className="text-red-500">{error || "You do not have permission to manage assignment types."}</p>
        </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div className="flex items-center">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">Manage Assignment Types</h2>
          <HelpTooltip helpKey="assignmentTypes_intro" position="right" className="ml-2" />
        </div>
        {!showForm && (
          <button
            onClick={handleAddClick}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition ease-in-out duration-150"
          >
            Add New Type
          </button>
        )}
      </div>

      {error && !showForm && <p className="mb-4 text-red-600 bg-red-100 p-3 rounded-md text-sm md:text-base">{error}</p>}

      {showForm ? (
        <AssignmentTypeForm
          typeToEdit={typeToEdit}
          onSave={handleFormSave}
          onCancel={handleFormCancel}
        />
      ) : (
        <AssignmentTypeList
          types={types}
          onEdit={handleEdit}
          onDelete={handleDelete}
          loading={loading}
        />
      )}
    </div>
  );
};

export default AssignmentTypesPage;
