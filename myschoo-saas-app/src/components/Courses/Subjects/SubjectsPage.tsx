import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';
import SubjectList from './SubjectList';
import SubjectForm, { Subject } from './SubjectForm';
import HelpTooltip from '../../common/HelpTooltip';

const SubjectsPage: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [subjectToEdit, setSubjectToEdit] = useState<Subject | null>(null);

  const fetchSubjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('subjects')
        .select('*')
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;
      setSubjects(data || []);
    } catch (err: any) {
      console.error('Error fetching subjects:', err);
      setError('Failed to load subjects. ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  const handleAddClick = () => {
    setSubjectToEdit(null);
    setShowForm(true);
  };

  const handleEdit = (subject: Subject) => {
    setSubjectToEdit(subject);
    setShowForm(true);
  };

  const handleDelete = async (subjectId: string) => {
    if (!window.confirm('Are you sure you want to delete this subject? This might fail if courses are associated with it.')) {
      return;
    }
    setError(null);
    try {
      const { error: deleteError } = await supabase
        .from('subjects')
        .delete()
        .eq('id', subjectId);

      if (deleteError) throw deleteError;
      setSubjects((prev) => prev.filter((s) => s.id !== subjectId));
    } catch (err: any) {
      console.error('Error deleting subject:', err);
      setError('Failed to delete subject. It might be in use. ' + err.message);
    }
  };

  const handleFormSave = (savedSubject: Subject) => {
    if (subjectToEdit) {
      setSubjects((prev) =>
        prev.map((s) => (s.id === savedSubject.id ? savedSubject : s))
      );
    } else {
      setSubjects((prev) => [...prev, savedSubject]);
    }
    // Sort subjects alphabetically by name after adding/editing
    setSubjects(currentSubjects => [...currentSubjects].sort((a, b) => a.name.localeCompare(b.name)));
    setShowForm(false);
    setSubjectToEdit(null);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setSubjectToEdit(null);
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div className="flex items-center">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">Manage Subjects</h2>
          <HelpTooltip helpKey="subjects_intro" position="right" className="ml-2" />
        </div>
        {!showForm && (
          <button
            onClick={handleAddClick}
            className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 transition ease-in-out duration-150"
          >
            Add New Subject
          </button>
        )}
      </div>

      {error && <p className="mb-4 text-red-600 bg-red-100 p-3 rounded-md text-sm md:text-base">{error}</p>}

      {showForm ? (
        <SubjectForm
          subjectToEdit={subjectToEdit}
          onSave={handleFormSave}
          onCancel={handleFormCancel}
        />
      ) : (
        <SubjectList
          subjects={subjects}
          onEdit={handleEdit}
          onDelete={handleDelete}
          loading={loading}
        />
      )}
    </div>
  );
};

export default SubjectsPage;
