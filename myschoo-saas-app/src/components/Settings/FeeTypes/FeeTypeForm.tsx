import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import HelpTooltip from '../../common/HelpTooltip';

export interface FeeType {
  id?: string;
  tenant_id?: string; // Handled by RLS
  name: string;
  description?: string | null;
  default_amount: number;
  is_active?: boolean;
}

interface FeeTypeFormProps {
  typeToEdit?: FeeType | null;
  onSave: (type: FeeType) => void;
  onCancel: () => void;
}

const FeeTypeForm: React.FC<FeeTypeFormProps> = ({ typeToEdit, onSave, onCancel }) => {
  const [formData, setFormData] = useState<FeeType>({
    name: '',
    description: null,
    default_amount: 0.00,
    is_active: true,
    ...typeToEdit,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeToEdit) {
      setFormData({ 
        ...typeToEdit,
        is_active: typeToEdit.is_active === undefined ? true : typeToEdit.is_active,
        default_amount: Number(typeToEdit.default_amount) // Ensure it's a number
       });
    } else {
      setFormData({ name: '', description: null, default_amount: 0.00, is_active: true });
    }
  }, [typeToEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? parseFloat(value) || 0 : value),
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.name.trim()) { setError('Fee type name cannot be empty.'); setLoading(false); return; }
    if (formData.default_amount <= 0) { setError('Default amount must be greater than zero.'); setLoading(false); return; }


    try {
      let resultType: FeeType;
      const dataToSave = { 
        ...formData,
        default_amount: Number(formData.default_amount),
        description: formData.description?.trim() === '' ? null : formData.description,
      };

      if (typeToEdit && typeToEdit.id) {
        const { data, error: updateError } = await supabase
          .from('fee_types')
          .update(dataToSave)
          .eq('id', typeToEdit.id)
          .select()
          .single();
        if (updateError) throw updateError;
        resultType = data as FeeType;
      } else {
        const { id, tenant_id, ...insertData } = dataToSave;
        const { data, error: insertError } = await supabase
          .from('fee_types')
          .insert(insertData)
          .select()
          .single();
        if (insertError) throw insertError;
        resultType = data as FeeType;
      }
      onSave(resultType);
    } catch (err: any) {
      console.error('Error saving fee type:', err);
      setError(err.message || 'Failed to save fee type.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-4 sm:p-6 bg-white shadow-md rounded-lg max-w-lg mx-auto">
      <h2 className="text-xl sm:text-2xl font-semibold text-gray-700">
        {typeToEdit ? 'Edit Fee Type' : 'Add New Fee Type'}
      </h2>
      {error && <p className="text-red-500 text-sm bg-red-100 p-3 rounded-md">{error}</p>}

      <div>
        <label htmlFor="name" className="flex items-center text-sm font-medium text-gray-700">
          Fee Type Name <span className="text-red-500 ml-1">*</span>
          <HelpTooltip helpKey="feeTypeForm_name" position="right" className="ml-1.5" />
        </label>
        <input
          type="text"
          name="name"
          id="name"
          value={formData.name}
          onChange={handleChange}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="e.g., Annual Tuition, Library Fine"
        />
      </div>

      <div>
        <label htmlFor="description" className="flex items-center text-sm font-medium text-gray-700">
          Description (Optional)
          <HelpTooltip helpKey="feeTypeForm_description" position="right" className="ml-1.5" />
        </label>
        <textarea
          name="description"
          id="description"
          value={formData.description || ''}
          onChange={handleChange}
          rows={3}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="default_amount" className="flex items-center text-sm font-medium text-gray-700">
          Default Amount <span className="text-red-500 ml-1">*</span>
          <HelpTooltip helpKey="feeTypeForm_defaultAmount" position="right" className="ml-1.5" />
        </label>
        <input
          type="number"
          name="default_amount"
          id="default_amount"
          value={formData.default_amount}
          onChange={handleChange}
          required
          min="0.01"
          step="0.01"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>
      
      <div className="flex items-start">
        <div className="flex items-center h-5">
            <input
            id="is_active"
            name="is_active"
            type="checkbox"
            checked={formData.is_active || false}
            onChange={handleChange}
            className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
            />
        </div>
        <div className="ml-3 text-sm">
            <label htmlFor="is_active" className="flex items-center font-medium text-gray-700">
            Active
            <HelpTooltip helpKey="feeTypeForm_isActive" position="right" className="ml-1.5" />
            </label>
            <p className="text-gray-500 text-xs">Inactive types cannot be assigned to students.</p>
        </div>
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
          {loading ? (typeToEdit ? 'Saving...' : 'Adding...') : (typeToEdit ? 'Save Changes' : 'Add Fee Type')}
        </button>
      </div>
    </form>
  );
};

export default FeeTypeForm;
