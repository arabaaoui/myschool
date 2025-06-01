import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import HelpTooltip from '../../common/HelpTooltip';

export interface AssignmentType {
  id?: string;
  tenant_id?: string; // Handled by RLS
  name: string;
  weight?: number | null; // e.g., 0.20 for 20%
  sort_order?: number | null;
}

interface AssignmentTypeFormProps {
  typeToEdit?: AssignmentType | null;
  onSave: (type: AssignmentType) => void;
  onCancel: () => void;
}

const AssignmentTypeForm: React.FC<AssignmentTypeFormProps> = ({ typeToEdit, onSave, onCancel }) => {
  const [formData, setFormData] = useState<AssignmentType>({
    name: '',
    weight: null,
    sort_order: null,
    ...typeToEdit,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeToEdit) {
      setFormData({
        ...typeToEdit,
        weight: typeToEdit.weight === null ? undefined : typeToEdit.weight,
        sort_order: typeToEdit.sort_order === null ? undefined : typeToEdit.sort_order,
      });
    } else {
      setFormData({ name: '', weight: null, sort_order: null });
    }
  }, [typeToEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    let processedValue: string | number | null | undefined = value;

    if (type === 'number') {
      if (value === '') {
        processedValue = null;
      } else {
        processedValue = name === 'weight' ? parseFloat(value) : parseInt(value, 10);
        if (name === 'weight' && (isNaN(processedValue as number) || processedValue as number < 0 || processedValue as number > 1)) {
            setError('Weight must be between 0.00 and 1.00 (e.g., 0.2 for 20%).');
        } else if (name === 'weight') {
            setError(null); // Clear error if valid
        }
      }
    }

    setFormData((prev) => ({
        ...prev,
        [name]: processedValue === undefined ? null : processedValue
    }));
  };


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    if (formData.weight !== null && formData.weight !== undefined && (formData.weight < 0 || formData.weight > 1)) {
        setError('Weight must be between 0.00 and 1.00 (e.g., 0.2 for 20%).');
        setLoading(false);
        return;
    }
    setError(null); // Clear previous errors before submission

    if (!formData.name.trim()) { setError('Assignment type name cannot be empty.'); setLoading(false); return; }

    try {
      let resultType: AssignmentType;
      const dataToSave = {
        ...formData,
        weight: formData.weight === undefined ? null : Number(formData.weight),
        sort_order: formData.sort_order === undefined ? null : Number(formData.sort_order),
      };

      if (typeToEdit && typeToEdit.id) {
        const { data, error: updateError } = await supabase
          .from('assignment_types')
          .update(dataToSave)
          .eq('id', typeToEdit.id)
          .select()
          .single();
        if (updateError) throw updateError;
        resultType = data as AssignmentType;
      } else {
        const { id, tenant_id, ...insertData } = dataToSave;
        const { data, error: insertError } = await supabase
          .from('assignment_types')
          .insert(insertData)
          .select()
          .single();
        if (insertError) throw insertError;
        resultType = data as AssignmentType;
      }
      onSave(resultType);
    } catch (err: any) {
      console.error('Error saving assignment type:', err);
      setError(err.message || 'Failed to save assignment type.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-4 sm:p-6 bg-white shadow-md rounded-lg max-w-lg mx-auto">
      <h2 className="text-xl sm:text-2xl font-semibold text-gray-700">
        {typeToEdit ? 'Edit Assignment Type' : 'Add New Assignment Type'}
      </h2>
      {error && <p className="text-red-500 text-sm bg-red-100 p-3 rounded-md">{error}</p>}

      <div>
        <label htmlFor="name" className="flex items-center text-sm font-medium text-gray-700">
          Type Name <span className="text-red-500 ml-1">*</span>
          <HelpTooltip helpKey="assignmentTypeForm_name" position="right" className="ml-1.5" />
        </label>
        <input
          type="text"
          name="name"
          id="name"
          value={formData.name}
          onChange={handleChange}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="e.g., Homework, Quiz, Exam"
        />
      </div>

      <div>
        <label htmlFor="weight" className="flex items-center text-sm font-medium text-gray-700">
          Weight (Optional)
          <HelpTooltip helpKey="assignmentTypeForm_weight" position="right" className="ml-1.5" />
        </label>
        <input
          type="number"
          name="weight"
          id="weight"
          value={formData.weight === null || formData.weight === undefined ? '' : formData.weight}
          onChange={handleChange}
          step="0.01"
          min="0"
          max="1"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="e.g., 0.20 for 20%"
        />
      </div>

      <div>
        <label htmlFor="sort_order" className="flex items-center text-sm font-medium text-gray-700">
          Sort Order (Optional)
          <HelpTooltip helpKey="assignmentTypeForm_sortOrder" position="right" className="ml-1.5" />
        </label>
        <input
          type="number"
          name="sort_order"
          id="sort_order"
          value={formData.sort_order === null || formData.sort_order === undefined ? '' : formData.sort_order}
          onChange={handleChange}
          min="0"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-end sm:space-x-4 pt-2 space-y-2 sm:space-y-0">
        <button
          type="button"
          onClick={onCancel}
          className="w-full sm:w-auto inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? (typeToEdit ? 'Saving...' : 'Adding...') : (typeToEdit ? 'Save Changes' : 'Add Type')}
        </button>
      </div>
    </form>
  );
};

export default AssignmentTypeForm;
