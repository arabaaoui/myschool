import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';
import AcademicYearList from './AcademicYearList';
import AcademicYearForm, { AcademicYear } from './AcademicYearForm';
import HelpTooltip from '../../common/HelpTooltip';

const AcademicYearsPage: React.FC = () => {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [yearToEdit, setYearToEdit] = useState<AcademicYear | null>(null);

  const fetchAcademicYears = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('academic_years')
        .select('*')
        .order('start_date', { ascending: false }); // Show newest first

      if (fetchError) throw fetchError;
      setYears(data || []);
    } catch (err: any) {
      console.error('Error fetching academic years:', err);
      setError('Failed to load academic years. ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAcademicYears();
  }, [fetchAcademicYears]);

  const handleAddClick = () => {
    setYearToEdit(null);
    setShowForm(true);
  };

  const handleEdit = (year: AcademicYear) => {
    setYearToEdit(year);
    setShowForm(true);
  };

  const handleDelete = async (yearId: string) => {
    if (!window.confirm('Are you sure you want to delete this academic year? This might fail if marking periods are associated with it.')) {
      return;
    }
    setError(null);
    try {
      const { error: deleteError } = await supabase
        .from('academic_years')
        .delete()
        .eq('id', yearId);

      if (deleteError) throw deleteError;
      setYears((prev) => prev.filter((y) => y.id !== yearId));
    } catch (err: any) {
      console.error('Error deleting academic year:', err);
      setError('Failed to delete academic year. It might be in use. ' + err.message);
    }
  };

  const handleFormSave = (savedYear: AcademicYear) => {
    if (yearToEdit) {
      setYears((prev) =>
        prev.map((y) => (y.id === savedYear.id ? savedYear : y))
      );
    } else {
      setYears((prev) => [savedYear, ...prev]); // Add to the beginning
    }
    // Re-sort by start_date after adding/editing
    setYears(currentYears => [...currentYears].sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()));
    setShowForm(false);
    setYearToEdit(null);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setYearToEdit(null);
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div className="flex items-center">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">Manage Academic Years</h2>
          <HelpTooltip helpKey="academicYears_intro" position="right" className="ml-2" />
        </div>
        {!showForm && (
          <button
            onClick={handleAddClick}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition ease-in-out duration-150"
          >
            Add New Academic Year
          </button>
        )}
      </div>

      {error && <p className="mb-4 text-red-600 bg-red-100 p-3 rounded-md text-sm md:text-base">{error}</p>}

      {showForm ? (
        <AcademicYearForm
          yearToEdit={yearToEdit}
          onSave={handleFormSave}
          onCancel={handleFormCancel}
        />
      ) : (
        <AcademicYearList
          years={years}
          onEdit={handleEdit}
          onDelete={handleDelete}
          loading={loading}
        />
      )}
    </div>
  );
};

export default AcademicYearsPage;
