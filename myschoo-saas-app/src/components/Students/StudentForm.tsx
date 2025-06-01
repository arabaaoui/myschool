import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient'; // Adjust path as necessary
import GradeLevelSelect from './GradeLevelSelect'; // Adjust path as necessary
import { User } from '@supabase/supabase-js';
import HelpTooltip from '../common/HelpTooltip'; // Import HelpTooltip

// Define the student type, mirroring the backend structure
export interface Student {
  id?: string; // UUID, present for existing students
  tenant_id?: string; // UUID, should be set automatically by RLS or backend
  user_profile_id?: string | null; // UUID, optional
  student_identifier?: string | null;
  first_name: string;
  last_name: string;
  date_of_birth?: string | null; // ISO date string (YYYY-MM-DD)
  gender?: string | null;
  ethnicity?: string | null;
  current_grade_level_id: string | null; // UUID
  enrollment_date?: string | null; // ISO date string (YYYY-MM-DD)
  notes?: string | null;
}

interface StudentFormProps {
  studentToEdit?: Student | null;
  onSave: (student: Student) => void;
  onCancel: () => void;
  currentUser: User | null;
}

const StudentForm: React.FC<StudentFormProps> = ({
  studentToEdit,
  onSave,
  onCancel,
  currentUser,
}) => {
  const [formData, setFormData] = useState<Student>({
    first_name: '',
    last_name: '',
    date_of_birth: null,
    gender: null,
    ethnicity: null,
    current_grade_level_id: null,
    student_identifier: null,
    enrollment_date: null,
    notes: null,
    ...studentToEdit,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (studentToEdit) {
      setFormData({ ...studentToEdit });
    } else {
      setFormData({
        first_name: '',
        last_name: '',
        date_of_birth: null,
        gender: null,
        ethnicity: null,
        current_grade_level_id: null,
        student_identifier: null,
        enrollment_date: null,
        notes: null,
      });
    }
  }, [studentToEdit]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value || null }));
  };

  const handleGradeLevelChange = (gradeLevelId: string) => {
    setFormData((prev) => ({ ...prev, current_grade_level_id: gradeLevelId }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.current_grade_level_id) {
        setError("Please select a grade level.");
        setLoading(false);
        return;
    }

    try {
      let resultStudent: Student;
      const studentDataForSupabase = { ...formData };

      if (studentToEdit && studentToEdit.id) {
        const { data, error: updateError } = await supabase
          .from('students')
          .update(studentDataForSupabase)
          .eq('id', studentToEdit.id)
          .select()
          .single();
        if (updateError) throw updateError;
        resultStudent = data as Student;
      } else {
        const { id, ...insertData } = studentDataForSupabase;
        const { data, error: insertError } = await supabase
          .from('students')
          .insert(insertData)
          .select()
          .single();
        if (insertError) throw insertError;
        resultStudent = data as Student;
      }
      onSave(resultStudent);
    } catch (err: any) {
      console.error('Error saving student:', err);
      setError(err.message || 'Failed to save student. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-4 sm:p-6 bg-white shadow-md rounded-lg max-w-3xl mx-auto">
      <h2 className="text-xl sm:text-2xl font-semibold text-gray-700">
        {studentToEdit ? 'Edit Student' : 'Add New Student'}
      </h2>
      {error && <p className="text-red-500 text-sm bg-red-100 p-3 rounded">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 sm:gap-y-6">
        {/* First Name */}
        <div>
          <label htmlFor="first_name" className="flex items-center text-sm font-medium text-gray-700">
            First Name <span className="text-red-500 ml-1">*</span>
            <HelpTooltip helpKey="studentForm_firstName" position="right" className="ml-1.5" />
          </label>
          <input
            type="text"
            name="first_name"
            id="first_name"
            value={formData.first_name || ''}
            onChange={handleChange}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        {/* Last Name */}
        <div>
          <label htmlFor="last_name" className="flex items-center text-sm font-medium text-gray-700">
            Last Name <span className="text-red-500 ml-1">*</span>
            <HelpTooltip helpKey="studentForm_lastName" position="right" className="ml-1.5" />
          </label>
          <input
            type="text"
            name="last_name"
            id="last_name"
            value={formData.last_name || ''}
            onChange={handleChange}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        {/* Date of Birth */}
        <div>
          <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700">
            Date of Birth
          </label>
          <input
            type="date"
            name="date_of_birth"
            id="date_of_birth"
            value={formData.date_of_birth || ''}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        {/* Gender */}
        <div>
          <label htmlFor="gender" className="block text-sm font-medium text-gray-700">
            Gender
          </label>
          <select
            name="gender"
            id="gender"
            value={formData.gender || ''}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Non-binary">Non-binary</option>
            <option value="Other">Other</option>
            <option value="Prefer not to say">Prefer not to say</option>
          </select>
        </div>

        {/* Ethnicity */}
        <div>
          <label htmlFor="ethnicity" className="block text-sm font-medium text-gray-700">
            Ethnicity
          </label>
          <input
            type="text"
            name="ethnicity"
            id="ethnicity"
            value={formData.ethnicity || ''}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="e.g., Asian, Hispanic, Black, White, etc."
          />
        </div>

        {/* Grade Level */}
        <div>
          <label htmlFor="current_grade_level_id" className="flex items-center text-sm font-medium text-gray-700">
            Grade Level <span className="text-red-500 ml-1">*</span>
            <HelpTooltip helpKey="studentForm_gradeLevel" position="right" className="ml-1.5" />
          </label>
          <GradeLevelSelect
            selectedGradeLevelId={formData.current_grade_level_id}
            onChange={handleGradeLevelChange}
          />
        </div>

        {/* Student Identifier */}
        <div>
          <label htmlFor="student_identifier" className="flex items-center text-sm font-medium text-gray-700">
            Student ID / Identifier
            <HelpTooltip helpKey="studentForm_studentIdentifier" position="right" className="ml-1.5" />
          </label>
          <input
            type="text"
            name="student_identifier"
            id="student_identifier"
            value={formData.student_identifier || ''}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        {/* Enrollment Date */}
        <div>
          <label htmlFor="enrollment_date" className="flex items-center text-sm font-medium text-gray-700">
            Enrollment Date
            <HelpTooltip helpKey="studentForm_enrollmentDate" position="right" className="ml-1.5" />
          </label>
          <input
            type="date"
            name="enrollment_date"
            id="enrollment_date"
            value={formData.enrollment_date || ''}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
      </div>

      <div className="md:col-span-2">
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
          Notes
        </label>
        <textarea
          name="notes"
          id="notes"
          value={formData.notes || ''}
          onChange={handleChange}
          rows={3}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-end sm:space-x-4 pt-4 space-y-2 sm:space-y-0">
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
          {loading ? (studentToEdit ? 'Saving...' : 'Adding...') : (studentToEdit ? 'Save Changes' : 'Add Student')}
        </button>
      </div>
    </form>
  );
};

export default StudentForm;
