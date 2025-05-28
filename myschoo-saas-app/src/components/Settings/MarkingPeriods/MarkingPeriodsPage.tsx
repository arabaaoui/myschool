import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';
import MarkingPeriodList from './MarkingPeriodList';
import MarkingPeriodForm, { MarkingPeriod } from './MarkingPeriodForm';
import { AcademicYear } from '../AcademicYears/AcademicYearForm';
import HelpTooltip from '../../common/HelpTooltip';

const MarkingPeriodsPage: React.FC = () => {
  const [periods, setPeriods] = useState<MarkingPeriod[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [allMarkingPeriods, setAllMarkingPeriods] = useState<MarkingPeriod[]>([]); // For parent name resolution

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [periodToEdit, setPeriodToEdit] = useState<MarkingPeriod | null>(null);

  const fetchPageData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch Academic Years
      const { data: ayData, error: ayError } = await supabase
        .from('academic_years')
        .select('id, name, start_date, end_date') // include dates for validation if needed
        .order('start_date', { ascending: false });
      if (ayError) throw ayError;
      setAcademicYears(ayData || []);

      // Fetch All Marking Periods (for parent name resolution and the list itself)
      const { data: mpData, error: mpError } = await supabase
        .from('marking_periods')
        .select('*')
        .order('academic_year_id') // Or by sort_order, start_date
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('start_date', { ascending: true });
      if (mpError) throw mpError;
      setAllMarkingPeriods(mpData || []); // Used for parent dropdown and list context
      setPeriods(mpData || []); // The main list of periods

    } catch (err: any) {
      console.error('Error fetching marking period page data:', err);
      setError('Failed to load data. ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);

  const handleAddClick = () => {
    setPeriodToEdit(null);
    setShowForm(true);
  };

  const handleEdit = (period: MarkingPeriod) => {
    setPeriodToEdit(period);
    setShowForm(true);
  };

  const handleDelete = async (periodId: string) => {
    if (!window.confirm('Are you sure you want to delete this marking period? This might fail if course periods are associated with it.')) {
      return;
    }
    setError(null);
    try {
      const { error: deleteError } = await supabase
        .from('marking_periods')
        .delete()
        .eq('id', periodId);

      if (deleteError) throw deleteError;
      // Refetch data to ensure list and parent options are consistent
      fetchPageData(); 
    } catch (err: any) {
      console.error('Error deleting marking period:', err);
      setError('Failed to delete marking period. It might be in use. ' + err.message);
    }
  };

  const handleFormSave = (savedPeriod: MarkingPeriod) => {
    // Refetch data to ensure list and parent options are consistent, and sorting is correct
    fetchPageData(); 
    setShowForm(false);
    setPeriodToEdit(null);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setPeriodToEdit(null);
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div className="flex items-center">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">Manage Marking Periods</h2>
          <HelpTooltip helpKey="markingPeriods_intro" position="right" className="ml-2" />
        </div>
        {!showForm && (
          <button
            onClick={handleAddClick}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition ease-in-out duration-150"
          >
            Add New Marking Period
          </button>
        )}
      </div>

      {error && <p className="mb-4 text-red-600 bg-red-100 p-3 rounded-md text-sm md:text-base">{error}</p>}

      {showForm ? (
        <MarkingPeriodForm
          periodToEdit={periodToEdit}
          onSave={handleFormSave}
          onCancel={handleFormCancel}
        />
      ) : (
        <MarkingPeriodList
          periods={periods}
          academicYears={academicYears}
          allMarkingPeriods={allMarkingPeriods} // Pass all for parent name resolution
          onEdit={handleEdit}
          onDelete={handleDelete}
          loading={loading}
        />
      )}
    </div>
  );
};

export default MarkingPeriodsPage;
