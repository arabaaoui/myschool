import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import HelpTooltip from '../../common/HelpTooltip';
import { Subject } from '../Subjects/SubjectForm'; // Import Subject type

export interface Course {
  id?: string;
  tenant_id?: string; // Should be handled by RLS
  subject_id: string;
  name: string;
  description?: string | null;
  default_credits?: number | null;
}

interface CourseFormProps {
  courseToEdit?: Course | null;
  onSave: (course: Course) => void;
  onCancel: () => void;
}

const CourseForm: React.FC<CourseFormProps> = ({ courseToEdit, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Course>({
    subject_id: '',
    name: '',
    description: null,
    default_credits: null,
    ...courseToEdit,
  });
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  useEffect(() => {
    const fetchSubjects = async () => {
      setLoadingSubjects(true);
      try {
        const { data, error: subjectsError } = await supabase
          .from('subjects')
          .select('id, name')
          .order('name', { ascending: true });
        if (subjectsError) throw subjectsError;
        setSubjects(data || []);
        if (data && data.length > 0 && !courseToEdit?.subject_id) {
          // Pre-select first subject if creating a new course and subjects are loaded
          // setFormData(prev => ({ ...prev, subject_id: data[0].id }));
        }
      } catch (err: any) {
        console.error('Error fetching subjects:', err);
        setError('Failed to load subjects for dropdown.');
      } finally {
        setLoadingSubjects(false);
      }
    };
    fetchSubjects();
  }, [courseToEdit?.subject_id]);

  useEffect(() => {
    if (courseToEdit) {
      setFormData({ ...courseToEdit });
    } else {
      setFormData({
        subject_id: subjects.length > 0 ? subjects[0].id : '', // Default to first subject or empty
        name: '',
        description: null,
        default_credits: null,
      });
    }
  }, [courseToEdit, subjects]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? null : parseFloat(value)) : (value || null),
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.name.trim()) {
      setError('Course name cannot be empty.');
      setLoading(false);
      return;
    }
    if (!formData.subject_id) {
      setError('Please select a subject.');
      setLoading(false);
      return;
    }

    try {
      let resultCourse: Course;
      const dataToSave = {
        ...formData,
        default_credits: formData.default_credits === null ? undefined : Number(formData.default_credits)
      };


      if (courseToEdit && courseToEdit.id) {
        const { data, error: updateError } = await supabase
          .from('courses')
          .update(dataToSave)
          .eq('id', courseToEdit.id)
          .select()
          .single();
        if (updateError) throw updateError;
        resultCourse = data as Course;
      } else {
        const { id, tenant_id, ...insertData } = dataToSave;
        const { data, error: insertError } = await supabase
          .from('courses')
          .insert(insertData)
          .select()
          .single();
        if (insertError) throw insertError;
        resultCourse = data as Course;
      }
      onSave(resultCourse);
    } catch (err: any) {
      console.error('Error saving course:', err);
      setError(err.message || 'Failed to save course.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-4 sm:p-6 bg-white shadow-md rounded-lg max-w-xl mx-auto">
      <h2 className="text-xl sm:text-2xl font-semibold text-gray-700">
        {courseToEdit ? 'Edit Course' : 'Add New Course'}
      </h2>
      {error && <p className="text-red-500 text-sm bg-red-100 p-3 rounded-md">{error}</p>}

      <div>
        <label htmlFor="subject_id" className="flex items-center text-sm font-medium text-gray-700">
          Subject <span className="text-red-500 ml-1">*</span>
          <HelpTooltip helpKey="courseForm_subject" position="right" className="ml-1.5" />
        </label>
        {loadingSubjects ? <p className="text-sm text-gray-500">Loading subjects...</p> : (
            <select
            name="subject_id"
            id="subject_id"
            value={formData.subject_id || ''}
            onChange={handleChange}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
            <option value="" disabled>Select a subject</option>
            {subjects.map(subject => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
            ))}
            </select>
        )}
      </div>

      <div>
        <label htmlFor="name" className="flex items-center text-sm font-medium text-gray-700">
          Course Name <span className="text-red-500 ml-1">*</span>
          <HelpTooltip helpKey="courseForm_name" position="right" className="ml-1.5" />
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
        <label htmlFor="description" className="flex items-center text-sm font-medium text-gray-700">
          Description
          <HelpTooltip helpKey="courseForm_description" position="right" className="ml-1.5" />
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
        <label htmlFor="default_credits" className="flex items-center text-sm font-medium text-gray-700">
          Default Credits
          <HelpTooltip helpKey="courseForm_credits" position="right" className="ml-1.5" />
        </label>
        <input
          type="number"
          name="default_credits"
          id="default_credits"
          value={formData.default_credits === null ? '' : formData.default_credits} // Handle null for number input
          onChange={handleChange}
          step="0.01"
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
          disabled={loading || loadingSubjects}
          className="w-full sm:w-auto inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? (courseToEdit ? 'Saving...' : 'Adding...') : (courseToEdit ? 'Save Changes' : 'Add Course')}
        </button>
      </div>
    </form>
  );
};

export default CourseForm;
