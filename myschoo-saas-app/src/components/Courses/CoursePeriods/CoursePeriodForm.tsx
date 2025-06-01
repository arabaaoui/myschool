import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import HelpTooltip from '../../common/HelpTooltip';
import { Course } from '../Courses/CourseForm';
import { UserProfile } from '../../../types';
import { MarkingPeriod } from '../../Settings/MarkingPeriods/MarkingPeriodForm'; // Import MarkingPeriod type

export interface CoursePeriod {
  id?: string;
  tenant_id?: string;
  course_id: string;
  teacher_id?: string | null;
  marking_period_id: string;
  name: string;
  room?: string | null;
  max_seats?: number | null;
}

interface CoursePeriodFormProps {
  periodToEdit?: CoursePeriod | null;
  onSave: (period: CoursePeriod) => void;
  onCancel: () => void;
}

const CoursePeriodForm: React.FC<CoursePeriodFormProps> = ({ periodToEdit, onSave, onCancel }) => {
  const [formData, setFormData] = useState<CoursePeriod>({
    course_id: '',
    teacher_id: null,
    marking_period_id: '',
    name: '',
    room: null,
    max_seats: null,
    ...periodToEdit,
  });

  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [markingPeriods, setMarkingPeriods] = useState<MarkingPeriod[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);

  useEffect(() => {
    const fetchDropdownData = async () => {
      setLoadingDropdowns(true);
      setError(null);
      try {
        // Fetch Courses
        const { data: coursesData, error: coursesError } = await supabase
          .from('courses')
          .select('id, name')
          .order('name', { ascending: true });
        if (coursesError) throw coursesError;
        setCourses(coursesData || []);

        // Fetch Teachers
        const { data: teachersData, error: teachersError } = await supabase
          .from('user_profiles')
          .select('id, full_name, email')
          .eq('role', 'teacher')
          .order('full_name', { ascending: true });
        if (teachersError) throw teachersError;
        setTeachers(teachersData || []);

        // Fetch Marking Periods
        const { data: mpData, error: mpError } = await supabase
          .from('marking_periods')
          .select('id, name, academic_year_id') // Fetch academic_year_id if needed for sorting/grouping
          .order('start_date', { ascending: true }); // Order by start date or sort_order
        if (mpError) throw mpError;
        setMarkingPeriods(mpData || []);


      } catch (err: any) {
        console.error('Error fetching dropdown data:', err);
        setError('Failed to load data for dropdowns. ' + err.message);
      } finally {
        setLoadingDropdowns(false);
      }
    };
    fetchDropdownData();
  }, []);

  useEffect(() => {
    if (periodToEdit) {
      setFormData({
        ...periodToEdit,
        max_seats: periodToEdit.max_seats === null ? undefined : periodToEdit.max_seats,
       });
    } else {
      setFormData({
        course_id: courses.length > 0 ? courses[0].id : '',
        teacher_id: null,
        marking_period_id: markingPeriods.length > 0 ? markingPeriods[0].id : '',
        name: '',
        room: null,
        max_seats: null,
      });
    }
  }, [periodToEdit, courses, markingPeriods, teachers]);

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

    if (!formData.name.trim()) { setError('Class name cannot be empty.'); setLoading(false); return; }
    if (!formData.course_id) { setError('Please select a course.'); setLoading(false); return; }
    if (!formData.marking_period_id) { setError('Please select a marking period.'); setLoading(false); return; }


    try {
      let resultPeriod: CoursePeriod;
      const dataToSave = {
        ...formData,
        max_seats: formData.max_seats === null ? undefined : Number(formData.max_seats),
        teacher_id: formData.teacher_id === '' ? null : formData.teacher_id,
      };

      if (periodToEdit && periodToEdit.id) {
        const { data, error: updateError } = await supabase
          .from('course_periods')
          .update(dataToSave)
          .eq('id', periodToEdit.id)
          .select()
          .single();
        if (updateError) throw updateError;
        resultPeriod = data as CoursePeriod;
      } else {
        const { id, tenant_id, ...insertData } = dataToSave;
        const { data, error: insertError } = await supabase
          .from('course_periods')
          .insert(insertData)
          .select()
          .single();
        if (insertError) throw insertError;
        resultPeriod = data as CoursePeriod;
      }
      onSave(resultPeriod);
    } catch (err: any)      {
      console.error('Error saving course period:', err);
      setError(err.message || 'Failed to save course period.');
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
        {periodToEdit ? 'Edit Class/Section' : 'Add New Class/Section'}
      </h2>
      {error && <p className="text-red-500 text-sm bg-red-100 p-3 rounded-md">{error}</p>}

      {/* Course Dropdown */}
      <div>
        <label htmlFor="course_id" className="flex items-center text-sm font-medium text-gray-700">
          Course <span className="text-red-500 ml-1">*</span>
          <HelpTooltip helpKey="coursePeriodForm_course" position="right" className="ml-1.5" />
        </label>
        <select
          name="course_id"
          id="course_id"
          value={formData.course_id || ''}
          onChange={handleChange}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        >
          <option value="" disabled>Select a course</option>
          {courses.map(course => (
            <option key={course.id} value={course.id}>{course.name}</option>
          ))}
        </select>
      </div>

      {/* Class Name */}
      <div>
        <label htmlFor="name" className="flex items-center text-sm font-medium text-gray-700">
          Class/Section Name <span className="text-red-500 ml-1">*</span>
          <HelpTooltip helpKey="coursePeriodForm_name" position="right" className="ml-1.5" />
        </label>
        <input
          type="text"
          name="name"
          id="name"
          value={formData.name}
          onChange={handleChange}
          required
          placeholder="e.g., Section A, Period 1"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      {/* Teacher Dropdown */}
      <div>
        <label htmlFor="teacher_id" className="flex items-center text-sm font-medium text-gray-700">
          Teacher
          <HelpTooltip helpKey="coursePeriodForm_teacher" position="right" className="ml-1.5" />
        </label>
        <select
          name="teacher_id"
          id="teacher_id"
          value={formData.teacher_id || ''}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        >
          <option value="">Assign later / No specific teacher</option>
          {teachers.map(teacher => (
            <option key={teacher.id} value={teacher.id}>{teacher.full_name || teacher.email}</option>
          ))}
        </select>
      </div>

      {/* Marking Period Dropdown - Now populated from fetched data */}
      <div>
        <label htmlFor="marking_period_id" className="flex items-center text-sm font-medium text-gray-700">
          Marking Period <span className="text-red-500 ml-1">*</span>
          <HelpTooltip helpKey="coursePeriodForm_markingPeriod" position="right" className="ml-1.5" />
        </label>
        <select
          name="marking_period_id"
          id="marking_period_id"
          value={formData.marking_period_id || ''}
          onChange={handleChange}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        >
          <option value="" disabled>Select a marking period</option>
          {markingPeriods.length === 0 && <option value="" disabled>No marking periods defined</option>}
          {markingPeriods.map(mp => (
            <option key={mp.id} value={mp.id}>{mp.name}</option>
          ))}
        </select>
      </div>

      {/* Room */}
      <div>
        <label htmlFor="room" className="flex items-center text-sm font-medium text-gray-700">
          Room
          <HelpTooltip helpKey="coursePeriodForm_room" position="right" className="ml-1.5" />
        </label>
        <input
          type="text"
          name="room"
          id="room"
          value={formData.room || ''}
          onChange={handleChange}
          placeholder="e.g., Room 101, Gym"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      {/* Max Seats */}
      <div>
        <label htmlFor="max_seats" className="flex items-center text-sm font-medium text-gray-700">
          Max Seats
          <HelpTooltip helpKey="coursePeriodForm_maxSeats" position="right" className="ml-1.5" />
        </label>
        <input
          type="number"
          name="max_seats"
          id="max_seats"
          value={formData.max_seats === null ? '' : formData.max_seats}
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
          {loading ? (periodToEdit ? 'Saving...' : 'Adding...') : (periodToEdit ? 'Save Changes' : 'Add Class/Section')}
        </button>
      </div>
    </form>
  );
};

export default CoursePeriodForm;
