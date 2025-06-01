import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import HelpTooltip from '../../common/HelpTooltip';

export interface AttendanceCode {
  id?: string;
  tenant_id?: string; // Handled by RLS
  code: string;
  description: string;
  is_present_code?: boolean;
  is_absent_code?: boolean;
  sort_order?: number | null;
}

interface AttendanceCodeFormProps {
  codeToEdit?: AttendanceCode | null;
  onSave: (code: AttendanceCode) => void;
  onCancel: () => void;
}

const AttendanceCodeForm: React.FC<AttendanceCodeFormProps> = ({ codeToEdit, onSave, onCancel }) => {
  const [formData, setFormData] = useState<AttendanceCode>({
    code: '',
    description: '',
    is_present_code: false,
    is_absent_code: false,
    sort_order: null,
    ...codeToEdit,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (codeToEdit) {
      setFormData({
        ...codeToEdit,
        is_present_code: codeToEdit.is_present_code || false,
        is_absent_code: codeToEdit.is_absent_code || false,
        sort_order: codeToEdit.sort_order === null ? undefined : codeToEdit.sort_order,
       });
    } else {
      setFormData({
        code: '',
        description: '',
        is_present_code: false,
        is_absent_code: false,
        sort_order: null,
      });
    }
  }, [codeToEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? (value === '' ? null : parseInt(value, 10)) : value),
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.code.trim()) { setError('Code cannot be empty.'); setLoading(false); return; }
    if (!formData.description.trim()) { setError('Description cannot be empty.'); setLoading(false); return; }

    try {
      let resultCode: AttendanceCode;
      const dataToSave = {
        ...formData,
        sort_order: formData.sort_order === null ? undefined : Number(formData.sort_order)
       };

      if (codeToEdit && codeToEdit.id) {
        const { data, error: updateError } = await supabase
          .from('attendance_codes')
          .update(dataToSave)
          .eq('id', codeToEdit.id)
          .select()
          .single();
        if (updateError) throw updateError;
        resultCode = data as AttendanceCode;
      } else {
        const { id, tenant_id, ...insertData } = dataToSave;
        const { data, error: insertError } = await supabase
          .from('attendance_codes')
          .insert(insertData)
          .select()
          .single();
        if (insertError) throw insertError;
        resultCode = data as AttendanceCode;
      }
      onSave(resultCode);
    } catch (err: any) {
      console.error('Error saving attendance code:', err);
      setError(err.message || 'Failed to save attendance code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-4 sm:p-6 bg-white shadow-md rounded-lg max-w-lg mx-auto">
      <h2 className="text-xl sm:text-2xl font-semibold text-gray-700">
        {codeToEdit ? 'Edit Attendance Code' : 'Add New Attendance Code'}
      </h2>
      {error && <p className="text-red-500 text-sm bg-red-100 p-3 rounded-md">{error}</p>}

      <div>
        <label htmlFor="code" className="flex items-center text-sm font-medium text-gray-700">
          Code <span className="text-red-500 ml-1">*</span>
          <HelpTooltip helpKey="attendanceCodeForm_code" position="right" className="ml-1.5" />
        </label>
        <input
          type="text"
          name="code"
          id="code"
          value={formData.code}
          onChange={handleChange}
          required
          maxLength={5} // Example: P, A, T, AE, L
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="e.g., P, A, T"
        />
      </div>

      <div>
        <label htmlFor="description" className="flex items-center text-sm font-medium text-gray-700">
          Description <span className="text-red-500 ml-1">*</span>
          <HelpTooltip helpKey="attendanceCodeForm_description" position="right" className="ml-1.5" />
        </label>
        <input
          type="text"
          name="description"
          id="description"
          value={formData.description}
          onChange={handleChange}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="e.g., Present, Absent Unexcused"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex items-start">
            <div className="flex items-center h-5">
                <input
                id="is_present_code"
                name="is_present_code"
                type="checkbox"
                checked={formData.is_present_code || false}
                onChange={handleChange}
                className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                />
            </div>
            <div className="ml-3 text-sm">
                <label htmlFor="is_present_code" className="flex items-center font-medium text-gray-700">
                Counts as Present
                <HelpTooltip helpKey="attendanceCodeForm_isPresent" position="right" className="ml-1.5" />
                </label>
            </div>
        </div>
        <div className="flex items-start">
            <div className="flex items-center h-5">
                <input
                id="is_absent_code"
                name="is_absent_code"
                type="checkbox"
                checked={formData.is_absent_code || false}
                onChange={handleChange}
                className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                />
            </div>
            <div className="ml-3 text-sm">
                <label htmlFor="is_absent_code" className="flex items-center font-medium text-gray-700">
                Counts as Absent
                <HelpTooltip helpKey="attendanceCodeForm_isAbsent" position="right" className="ml-1.5" />
                </label>
            </div>
        </div>
      </div>


      <div>
        <label htmlFor="sort_order" className="flex items-center text-sm font-medium text-gray-700">
          Sort Order
          <HelpTooltip helpKey="attendanceCodeForm_sortOrder" position="right" className="ml-1.5" />
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
          {loading ? (codeToEdit ? 'Saving...' : 'Adding...') : (codeToEdit ? 'Save Changes' : 'Add Code')}
        </button>
      </div>
    </form>
  );
};

export default AttendanceCodeForm;
