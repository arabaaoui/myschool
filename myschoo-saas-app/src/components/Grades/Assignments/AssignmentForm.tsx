import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import HelpTooltip from '../../common/HelpTooltip';
import { AssignmentType } from '../../Settings/AssignmentTypes/AssignmentTypeForm'; // Import AssignmentType

export interface Assignment {
  id?: string;
  tenant_id?: string; // Handled by RLS
  course_period_id: string; // Set when creating/editing
  assignment_type_id: string;
  title: string;
  description?: string | null;
  due_date?: string | null; // YYYY-MM-DD
  max_points: number;
}

interface AssignmentFormProps {
  assignmentToEdit?: Assignment | null;
  coursePeriodId: string; // To associate the assignment with the correct class
  onSave: (assignment: Assignment) => void;
  onCancel: () => void;
}

const AssignmentForm: React.FC<AssignmentFormProps> = ({ 
    assignmentToEdit, 
    coursePeriodId, 
    onSave, 
    onCancel 
}) => {
  const [formData, setFormData] = useState<Omit<Assignment, 'id' | 'tenant_id'>>({ // Omit ID and tenant_id for form state
    course_period_id: coursePeriodId,
    assignment_type_id: '',
    title: '',
    description: null,
    due_date: null,
    max_points: 100, // Default max points
    ...(assignmentToEdit ? { // Spread editable fields from assignmentToEdit
        ...assignmentToEdit,
        max_points: Number(assignmentToEdit.max_points) // Ensure max_points is number
    } : {}),
  });

  const [assignmentTypes, setAssignmentTypes] = useState<AssignmentType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingTypes, setLoadingTypes] = useState(true);

  useEffect(() => {
    const fetchAssignmentTypes = async () => {
      setLoadingTypes(true);
      try {
        const { data, error: typesError } = await supabase
          .from('assignment_types')
          .select('id, name, weight')
          .order('sort_order', { ascending: true, nullsLast: true })
          .order('name', { ascending: true });
        if (typesError) throw typesError;
        setAssignmentTypes(data || []);
        if (data && data.length > 0 && !assignmentToEdit?.assignment_type_id) {
          // Pre-select first type if creating new assignment
          // setFormData(prev => ({ ...prev, assignment_type_id: data[0].id! }));
        }
      } catch (err: any) {
        console.error('Error fetching assignment types:', err);
        setError('Failed to load assignment types for dropdown.');
      } finally {
        setLoadingTypes(false);
      }
    };
    fetchAssignmentTypes();
  }, [assignmentToEdit?.assignment_type_id]);

  useEffect(() => {
    // Ensure coursePeriodId is always set from props
    const initialData: Omit<Assignment, 'id' | 'tenant_id'> = {
        course_period_id: coursePeriodId,
        assignment_type_id: assignmentToEdit?.assignment_type_id || (assignmentTypes.length > 0 ? assignmentTypes[0].id! : ''),
        title: assignmentToEdit?.title || '',
        description: assignmentToEdit?.description || null,
        due_date: assignmentToEdit?.due_date ? new Date(assignmentToEdit.due_date).toISOString().split('T')[0] : null,
        max_points: assignmentToEdit ? Number(assignmentToEdit.max_points) : 100,
    };
    setFormData(initialData);

  }, [assignmentToEdit, coursePeriodId, assignmentTypes]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? 0 : parseFloat(value)) : (value || null),
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.title.trim()) { setError('Assignment title cannot be empty.'); setLoading(false); return; }
    if (!formData.assignment_type_id) { setError('Please select an assignment type.'); setLoading(false); return; }
    if (formData.max_points <= 0) { setError('Max points must be greater than 0.'); setLoading(false); return; }

    try {
      let resultAssignment: Assignment;
      const dataToSave = { 
        ...formData,
        max_points: Number(formData.max_points), // Ensure it's a number
        due_date: formData.due_date ? formData.due_date : null, // Ensure null if empty
      };

      if (assignmentToEdit && assignmentToEdit.id) {
        const { data, error: updateError } = await supabase
          .from('assignments')
          .update(dataToSave)
          .eq('id', assignmentToEdit.id)
          .select()
          .single();
        if (updateError) throw updateError;
        resultAssignment = data as Assignment;
      } else {
        // For insert, Supabase handles tenant_id if RLS is set up with default or get_current_tenant_id()
        const { id, tenant_id, ...insertData } = dataToSave; 
        const { data, error: insertError } = await supabase
          .from('assignments')
          .insert(insertData) // course_period_id is already in formData
          .select()
          .single();
        if (insertError) throw insertError;
        resultAssignment = data as Assignment;
      }
      onSave(resultAssignment);
    } catch (err: any) {
      console.error('Error saving assignment:', err);
      setError(err.message || 'Failed to save assignment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-4 sm:p-6 bg-white shadow-md rounded-lg max-w-xl mx-auto">
      <h2 className="text-xl sm:text-2xl font-semibold text-gray-700">
        {assignmentToEdit ? 'Edit Assignment' : 'Add New Assignment'}
      </h2>
      {error && <p className="text-red-500 text-sm bg-red-100 p-3 rounded-md">{error}</p>}

      <div>
        <label htmlFor="title" className="flex items-center text-sm font-medium text-gray-700">
          Title <span className="text-red-500 ml-1">*</span>
          <HelpTooltip helpKey="assignmentForm_title" position="right" className="ml-1.5" />
        </label>
        <input
          type="text"
          name="title"
          id="title"
          value={formData.title}
          onChange={handleChange}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="assignment_type_id" className="flex items-center text-sm font-medium text-gray-700">
          Assignment Type <span className="text-red-500 ml-1">*</span>
           <HelpTooltip helpKey="assignmentForm_assignmentType" position="right" className="ml-1.5" />
        </label>
        {loadingTypes ? <p className="text-sm text-gray-500">Loading types...</p> : (
            <select
            name="assignment_type_id"
            id="assignment_type_id"
            value={formData.assignment_type_id || ''}
            onChange={handleChange}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
            <option value="" disabled>Select an assignment type</option>
            {assignmentTypes.map(type => (
                <option key={type.id} value={type.id!}>{type.name} {type.weight ? `(${(type.weight*100).toFixed(0)}%)` : ''}</option>
            ))}
            </select>
        )}
      </div>
      
      <div>
        <label htmlFor="description" className="flex items-center text-sm font-medium text-gray-700">
          Description
          <HelpTooltip helpKey="assignmentForm_description" position="right" className="ml-1.5" />
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
            <label htmlFor="due_date" className="flex items-center text-sm font-medium text-gray-700">
            Due Date
            <HelpTooltip helpKey="assignmentForm_dueDate" position="right" className="ml-1.5" />
            </label>
            <input
            type="date"
            name="due_date"
            id="due_date"
            value={formData.due_date || ''}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
        </div>
        <div>
            <label htmlFor="max_points" className="flex items-center text-sm font-medium text-gray-700">
            Max Points <span className="text-red-500 ml-1">*</span>
            <HelpTooltip helpKey="assignmentForm_maxPoints" position="right" className="ml-1.5" />
            </label>
            <input
            type="number"
            name="max_points"
            id="max_points"
            value={formData.max_points}
            onChange={handleChange}
            required
            min="0.01" // Or 1 depending on grading scale
            step="0.01" // Or 1
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
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
          disabled={loading || loadingTypes}
          className="w-full sm:w-auto inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? (assignmentToEdit ? 'Saving...' : 'Adding...') : (assignmentToEdit ? 'Save Changes' : 'Add Assignment')}
        </button>
      </div>
    </form>
  );
};

export default AssignmentForm;
