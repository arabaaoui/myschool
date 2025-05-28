import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import HelpTooltip from '../../common/HelpTooltip';

export interface AcademicYear {
  id?: string;
  tenant_id?: string; // Handled by RLS
  name: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
}

interface AcademicYearFormProps {
  yearToEdit?: AcademicYear | null;
  onSave: (year: AcademicYear) => void;
  onCancel: () => void;
}

const AcademicYearForm: React.FC<AcademicYearFormProps> = ({ yearToEdit, onSave, onCancel }) => {
  const [formData, setFormData] = useState<AcademicYear>({
    name: '',
    start_date: '',
    end_date: '',
    ...yearToEdit,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (yearToEdit) {
      setFormData({ 
        ...yearToEdit,
        // Ensure dates are in YYYY-MM-DD format for the input type="date"
        start_date: yearToEdit.start_date ? new Date(yearToEdit.start_date).toISOString().split('T')[0] : '',
        end_date: yearToEdit.end_date ? new Date(yearToEdit.end_date).toISOString().split('T')[0] : '',
      });
    } else {
      setFormData({ name: '', start_date: '', end_date: '' });
    }
  }, [yearToEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.name.trim()) { setError('Academic year name cannot be empty.'); setLoading(false); return; }
    if (!formData.start_date) { setError('Start date is required.'); setLoading(false); return; }
    if (!formData.end_date) { setError('End date is required.'); setLoading(false); return; }
    if (new Date(formData.start_date) >= new Date(formData.end_date)) {
      setError('End date must be after the start date.');
      setLoading(false);
      return;
    }

    try {
      let resultYear: AcademicYear;
      const dataToSave = { ...formData };

      if (yearToEdit && yearToEdit.id) {
        const { data, error: updateError } = await supabase
          .from('academic_years')
          .update(dataToSave)
          .eq('id', yearToEdit.id)
          .select()
          .single();
        if (updateError) throw updateError;
        resultYear = data as AcademicYear;
      } else {
        const { id, tenant_id, ...insertData } = dataToSave;
        const { data, error: insertError } = await supabase
          .from('academic_years')
          .insert(insertData)
          .select()
          .single();
        if (insertError) throw insertError;
        resultYear = data as AcademicYear;
      }
      onSave(resultYear);
    } catch (err: any) {
      console.error('Error saving academic year:', err);
      setError(err.message || 'Failed to save academic year.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-4 sm:p-6 bg-white shadow-md rounded-lg max-w-lg mx-auto">
      <h2 className="text-xl sm:text-2xl font-semibold text-gray-700">
        {yearToEdit ? 'Edit Academic Year' : 'Add New Academic Year'}
      </h2>
      {error && <p className="text-red-500 text-sm bg-red-100 p-3 rounded-md">{error}</p>}

      <div>
        <label htmlFor="name" className="flex items-center text-sm font-medium text-gray-700">
          Academic Year Name <span className="text-red-500 ml-1">*</span>
          <HelpTooltip helpKey="academicYearForm_name" position="right" className="ml-1.5" />
        </label>
        <input
          type="text"
          name="name"
          id="name"
          value={formData.name}
          onChange={handleChange}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="e.g., 2023-2024 School Year"
        />
      </div>

      <div>
        <label htmlFor="start_date" className="flex items-center text-sm font-medium text-gray-700">
          Start Date <span className="text-red-500 ml-1">*</span>
          <HelpTooltip helpKey="academicYearForm_startDate" position="right" className="ml-1.5" />
        </label>
        <input
          type="date"
          name="start_date"
          id="start_date"
          value={formData.start_date}
          onChange={handleChange}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>
      
      <div>
        <label htmlFor="end_date" className="flex items-center text-sm font-medium text-gray-700">
          End Date <span className="text-red-500 ml-1">*</span>
          <HelpTooltip helpKey="academicYearForm_endDate" position="right" className="ml-1.5" />
        </label>
        <input
          type="date"
          name="end_date"
          id="end_date"
          value={formData.end_date}
          onChange={handleChange}
          required
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
          {loading ? (yearToEdit ? 'Saving...' : 'Adding...') : (yearToEdit ? 'Save Changes' : 'Add Academic Year')}
        </button>
      </div>
    </form>
  );
};

export default AcademicYearForm;
