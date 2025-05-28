import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import HelpTooltip from '../../common/HelpTooltip';
import { AcademicYear } from '../AcademicYears/AcademicYearForm'; // Import AcademicYear type

export interface MarkingPeriod {
  id?: string;
  tenant_id?: string; // Handled by RLS
  academic_year_id: string;
  name: string;
  short_name?: string | null;
  type?: string | null; // e.g., 'semester', 'quarter'
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  parent_marking_period_id?: string | null;
  sort_order?: number | null;
}

interface MarkingPeriodFormProps {
  periodToEdit?: MarkingPeriod | null;
  onSave: (period: MarkingPeriod) => void;
  onCancel: () => void;
}

const MarkingPeriodForm: React.FC<MarkingPeriodFormProps> = ({ periodToEdit, onSave, onCancel }) => {
  const [formData, setFormData] = useState<MarkingPeriod>({
    academic_year_id: '',
    name: '',
    short_name: null,
    type: null,
    start_date: '',
    end_date: '',
    parent_marking_period_id: null,
    sort_order: null,
    ...periodToEdit,
  });

  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [parentPeriodOptions, setParentPeriodOptions] = useState<MarkingPeriod[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);

  // Fetch Academic Years and potential Parent Marking Periods
  useEffect(() => {
    const fetchDropdownData = async () => {
      setLoadingDropdowns(true);
      setError(null);
      try {
        const { data: ayData, error: ayError } = await supabase
          .from('academic_years')
          .select('id, name, start_date, end_date')
          .order('start_date', { ascending: false });
        if (ayError) throw ayError;
        setAcademicYears(ayData || []);

        // Fetch existing marking periods to populate parent options
        // Filter out the period being edited if applicable
        const { data: mpData, error: mpError } = await supabase
          .from('marking_periods')
          .select('id, name, academic_year_id')
          .order('name', { ascending: true });
        if (mpError) throw mpError;
        setParentPeriodOptions(mpData?.filter(mp => mp.id !== periodToEdit?.id) || []);

        if (ayData && ayData.length > 0 && !periodToEdit?.academic_year_id) {
          // Pre-select first academic year if creating a new period
          // setFormData(prev => ({ ...prev, academic_year_id: ayData[0].id }));
        }

      } catch (err: any) {
        console.error('Error fetching dropdown data:', err);
        setError('Failed to load data for dropdowns. ' + err.message);
      } finally {
        setLoadingDropdowns(false);
      }
    };
    fetchDropdownData();
  }, [periodToEdit?.id]); // Fetch only once, or if periodToEdit changes ID

  useEffect(() => {
    if (periodToEdit) {
      setFormData({ 
        ...periodToEdit,
        start_date: periodToEdit.start_date ? new Date(periodToEdit.start_date).toISOString().split('T')[0] : '',
        end_date: periodToEdit.end_date ? new Date(periodToEdit.end_date).toISOString().split('T')[0] : '',
        sort_order: periodToEdit.sort_order === null ? undefined : periodToEdit.sort_order, // Handle null for number input
      });
    } else {
      setFormData({
        academic_year_id: academicYears.length > 0 ? academicYears[0].id : '',
        name: '',
        short_name: null,
        type: null,
        start_date: '',
        end_date: '',
        parent_marking_period_id: null,
        sort_order: null,
      });
    }
  }, [periodToEdit, academicYears]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? null : parseInt(value, 10)) : (value || null),
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.name.trim()) { setError('Marking period name cannot be empty.'); setLoading(false); return; }
    if (!formData.academic_year_id) { setError('Academic year is required.'); setLoading(false); return; }
    if (!formData.start_date) { setError('Start date is required.'); setLoading(false); return; }
    if (!formData.end_date) { setError('End date is required.'); setLoading(false); return; }
    if (new Date(formData.start_date) >= new Date(formData.end_date)) {
      setError('End date must be after the start date.'); setLoading(false); return;
    }
    
    const selectedAcademicYear = academicYears.find(ay => ay.id === formData.academic_year_id);
    if (selectedAcademicYear) {
        if (new Date(formData.start_date) < new Date(selectedAcademicYear.start_date) ||
            new Date(formData.end_date) > new Date(selectedAcademicYear.end_date)) {
            setError('Marking period dates must be within the selected academic year dates.');
            setLoading(false);
            return;
        }
    }


    try {
      let resultPeriod: MarkingPeriod;
      const dataToSave = { 
        ...formData,
        sort_order: formData.sort_order === null ? undefined : Number(formData.sort_order),
        parent_marking_period_id: formData.parent_marking_period_id === '' ? null : formData.parent_marking_period_id,
      };

      if (periodToEdit && periodToEdit.id) {
        const { data, error: updateError } = await supabase
          .from('marking_periods')
          .update(dataToSave)
          .eq('id', periodToEdit.id)
          .select()
          .single();
        if (updateError) throw updateError;
        resultPeriod = data as MarkingPeriod;
      } else {
        const { id, tenant_id, ...insertData } = dataToSave;
        const { data, error: insertError } = await supabase
          .from('marking_periods')
          .insert(insertData)
          .select()
          .single();
        if (insertError) throw insertError;
        resultPeriod = data as MarkingPeriod;
      }
      onSave(resultPeriod);
    } catch (err: any) {
      console.error('Error saving marking period:', err);
      setError(err.message || 'Failed to save marking period.');
    } finally {
      setLoading(false);
    }
  };
  
  if (loadingDropdowns) {
    return <p className="text-center text-gray-500 py-4">Loading form data...</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-4 sm:p-6 bg-white shadow-md rounded-lg max-w-xl mx-auto">
      <h2 className="text-xl sm:text-2xl font-semibold text-gray-700">
        {periodToEdit ? 'Edit Marking Period' : 'Add New Marking Period'}
      </h2>
      {error && <p className="text-red-500 text-sm bg-red-100 p-3 rounded-md">{error}</p>}

      {/* Academic Year Dropdown */}
      <div>
        <label htmlFor="academic_year_id" className="flex items-center text-sm font-medium text-gray-700">
          Academic Year <span className="text-red-500 ml-1">*</span>
          <HelpTooltip helpKey="markingPeriodForm_academicYear" position="right" className="ml-1.5" />
        </label>
        <select
          name="academic_year_id"
          id="academic_year_id"
          value={formData.academic_year_id || ''}
          onChange={handleChange}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        >
          <option value="" disabled>Select an academic year</option>
          {academicYears.map(ay => (
            <option key={ay.id} value={ay.id}>{ay.name}</option>
          ))}
        </select>
      </div>

      {/* Name */}
      <div>
        <label htmlFor="name" className="flex items-center text-sm font-medium text-gray-700">
          Marking Period Name <span className="text-red-500 ml-1">*</span>
          <HelpTooltip helpKey="markingPeriodForm_name" position="right" className="ml-1.5" />
        </label>
        <input
          type="text"
          name="name"
          id="name"
          value={formData.name}
          onChange={handleChange}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="e.g., Semester 1, Q1"
        />
      </div>
      
      {/* Short Name */}
      <div>
        <label htmlFor="short_name" className="flex items-center text-sm font-medium text-gray-700">
          Short Name
          <HelpTooltip helpKey="markingPeriodForm_shortName" position="right" className="ml-1.5" />
        </label>
        <input
          type="text"
          name="short_name"
          id="short_name"
          value={formData.short_name || ''}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="e.g., S1, Q1"
        />
      </div>

      {/* Type */}
      <div>
        <label htmlFor="type" className="flex items-center text-sm font-medium text-gray-700">
          Type
          <HelpTooltip helpKey="markingPeriodForm_type" position="right" className="ml-1.5" />
        </label>
        <input
          type="text"
          name="type"
          id="type"
          value={formData.type || ''}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="e.g., Semester, Quarter, Trimester"
        />
      </div>
      
      {/* Start Date & End Date (side-by-side on larger screens) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 sm:gap-y-6">
        <div>
          <label htmlFor="start_date" className="flex items-center text-sm font-medium text-gray-700">
            Start Date <span className="text-red-500 ml-1">*</span>
            <HelpTooltip helpKey="markingPeriodForm_startDate" position="right" className="ml-1.5" />
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
            <HelpTooltip helpKey="markingPeriodForm_endDate" position="right" className="ml-1.5" />
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
      </div>

      {/* Parent Marking Period Dropdown */}
      <div>
        <label htmlFor="parent_marking_period_id" className="flex items-center text-sm font-medium text-gray-700">
          Parent Marking Period (Optional)
          <HelpTooltip helpKey="markingPeriodForm_parent" position="right" className="ml-1.5" />
        </label>
        <select
          name="parent_marking_period_id"
          id="parent_marking_period_id"
          value={formData.parent_marking_period_id || ''}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        >
          <option value="">None (Top-level Period)</option>
          {parentPeriodOptions
            .filter(opt => opt.academic_year_id === formData.academic_year_id) // Only show parents from the same academic year
            .map(opt => (
            <option key={opt.id} value={opt.id}>{opt.name}</option>
          ))}
        </select>
      </div>

      {/* Sort Order */}
      <div>
        <label htmlFor="sort_order" className="flex items-center text-sm font-medium text-gray-700">
          Sort Order
          <HelpTooltip helpKey="markingPeriodForm_sortOrder" position="right" className="ml-1.5" />
        </label>
        <input
          type="number"
          name="sort_order"
          id="sort_order"
          value={formData.sort_order === null ? '' : formData.sort_order}
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
          disabled={loading || loadingDropdowns}
          className="w-full sm:w-auto inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? (periodToEdit ? 'Saving...' : 'Adding...') : (periodToEdit ? 'Save Changes' : 'Add Marking Period')}
        </button>
      </div>
    </form>
  );
};

export default MarkingPeriodForm;
