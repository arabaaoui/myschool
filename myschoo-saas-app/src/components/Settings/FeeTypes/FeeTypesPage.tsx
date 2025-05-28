import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';
import FeeTypeList from './FeeTypeList';
import FeeTypeForm, { FeeType } from './FeeTypeForm';
import HelpTooltip from '../../common/HelpTooltip';
import { useAuth } from '../../../App'; 

const FeeTypesPage: React.FC = () => {
  const { isTenantAdmin } = useAuth();
  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [typeToEdit, setTypeToEdit] = useState<FeeType | null>(null);

  const fetchFeeTypes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('fee_types')
        .select('*')
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;
      setFeeTypes(data || []);
    } catch (err: any) {
      console.error('Error fetching fee types:', err);
      setError('Failed to load fee types. ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isTenantAdmin) {
        fetchFeeTypes();
    } else {
        setLoading(false);
        setError("You do not have permission to manage fee types.");
    }
  }, [fetchFeeTypes, isTenantAdmin]);

  const handleAddClick = () => {
    setTypeToEdit(null);
    setShowForm(true);
  };

  const handleEdit = (type: FeeType) => {
    setTypeToEdit(type);
    setShowForm(true);
  };

  const handleDelete = async (typeId: string) => {
    if (!window.confirm('Are you sure you want to delete this fee type? This might fail if it is in use.')) {
      return;
    }
    setError(null);
    try {
      const { error: deleteError } = await supabase
        .from('fee_types')
        .delete()
        .eq('id', typeId);

      if (deleteError) throw deleteError;
      setFeeTypes((prev) => prev.filter((t) => t.id !== typeId));
    } catch (err: any) {
      console.error('Error deleting fee type:', err);
      setError('Failed to delete fee type. It might be in use. ' + err.message);
    }
  };

  const handleFormSave = (savedType: FeeType) => {
    if (typeToEdit) {
      setFeeTypes((prev) =>
        prev.map((t) => (t.id === savedType.id ? savedType : t))
      );
    } else {
      setFeeTypes((prev) => [...prev, savedType]);
    }
    setFeeTypes(currentTypes => [...currentTypes].sort((a, b) => a.name.localeCompare(b.name)));
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
            <p className="text-red-500">{error || "You do not have permission to manage fee types."}</p>
        </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div className="flex items-center">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">Manage Fee Types</h2>
          <HelpTooltip helpKey="feeTypes_intro" position="right" className="ml-2" />
        </div>
        {!showForm && (
          <button
            onClick={handleAddClick}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition ease-in-out duration-150"
          >
            Add New Fee Type
          </button>
        )}
      </div>

      {error && !showForm && <p className="mb-4 text-red-600 bg-red-100 p-3 rounded-md text-sm md:text-base">{error}</p>}

      {showForm ? (
        <FeeTypeForm
          typeToEdit={typeToEdit}
          onSave={handleFormSave}
          onCancel={handleFormCancel}
        />
      ) : (
        <FeeTypeList
          types={feeTypes}
          onEdit={handleEdit}
          onDelete={handleDelete}
          loading={loading}
        />
      )}
    </div>
  );
};

export default FeeTypesPage;
