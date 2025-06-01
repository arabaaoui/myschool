import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import HelpTooltip from '../../common/HelpTooltip';

export interface Subject {
  id?: string;
  tenant_id?: string; // Should be handled by RLS
  name: string;
  code?: string | null;
}

interface SubjectFormProps {
  subjectToEdit?: Subject | null;
  onSave: (subject: Subject) => void;
  onCancel: () => void;
}

const SubjectForm: React.FC<SubjectFormProps> = ({ subjectToEdit, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Subject>({
    name: '',
    code: null,
    ...subjectToEdit,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (subjectToEdit) {
      setFormData({ ...subjectToEdit });
    } else {
      setFormData({ name: '', code: null });
    }
  }, [subjectToEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value || null }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.name.trim()) {
      setError('Subject name cannot be empty.');
      setLoading(false);
      return;
    }

    try {
      let resultSubject: Subject;
      const dataToSave = { ...formData };

      if (subjectToEdit && subjectToEdit.id) {
        const { data, error: updateError } = await supabase
          .from('subjects')
          .update(dataToSave)
          .eq('id', subjectToEdit.id)
          .select()
          .single();
        if (updateError) throw updateError;
        resultSubject = data as Subject;
      } else {
        // tenant_id will be set by RLS policy or database default if get_current_tenant_id() is available
        const { id, tenant_id, ...insertData } = dataToSave;
        const { data, error: insertError } = await supabase
          .from('subjects')
          .insert(insertData)
          .select()
          .single();
        if (insertError) throw insertError;
        resultSubject = data as Subject;
      }
      onSave(resultSubject);
    } catch (err: any) {
      console.error('Error saving subject:', err);
      setError(err.message || 'Failed to save subject.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-4 sm:p-6 bg-white shadow-md rounded-lg max-w-lg mx-auto">
      <h2 className="text-xl sm:text-2xl font-semibold text-gray-700">
        {subjectToEdit ? 'Edit Subject' : 'Add New Subject'}
      </h2>
      {error && <p className="text-red-500 text-sm bg-red-100 p-3 rounded-md">{error}</p>}

      <div>
        <label htmlFor="name" className="flex items-center text-sm font-medium text-gray-700">
          Subject Name <span className="text-red-500 ml-1">*</span>
          <HelpTooltip helpKey="subjectForm_name" position="right" className="ml-1.5" />
        </label>
        <input
          type="text"
          name="name"
          id="name"
          value={formData.name}
          onChange={handleChange}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="code" className="flex items-center text-sm font-medium text-gray-700">
          Subject Code
          <HelpTooltip helpKey="subjectForm_code" position="right" className="ml-1.5" />
        </label>
        <input
          type="text"
          name="code"
          id="code"
          value={formData.code || ''}
          onChange={handleChange}
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
          {loading ? (subjectToEdit ? 'Saving...' : 'Adding...') : (subjectToEdit ? 'Save Changes' : 'Add Subject')}
        </button>
      </div>
    </form>
  );
};

export default SubjectForm;
