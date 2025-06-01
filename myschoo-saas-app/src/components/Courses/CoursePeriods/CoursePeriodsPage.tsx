import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';
import CoursePeriodList from './CoursePeriodList';
import CoursePeriodForm, { CoursePeriod } from './CoursePeriodForm';
import { Course } from '../Courses/CourseForm';
import { UserProfile } from '../../../types';
import HelpTooltip from '../../common/HelpTooltip';

// Placeholder for MarkingPeriod type
interface MarkingPeriod {
  id: string;
  name: string;
}

const CoursePeriodsPage: React.FC = () => {
  const [periods, setPeriods] = useState<CoursePeriod[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [markingPeriods, setMarkingPeriods] = useState<MarkingPeriod[]>([]); // Placeholder

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [periodToEdit, setPeriodToEdit] = useState<CoursePeriod | null>(null);

  const fetchPageData = useCallback(async () => {
    setLoading(true);
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

      // Placeholder for Marking Periods
      const placeholderMPs = [{ id: 'placeholder_mp1', name: 'Semester 1 (Placeholder)' }, { id: 'placeholder_mp2', name: 'Semester 2 (Placeholder)' }];
      setMarkingPeriods(placeholderMPs);

      // Fetch Course Periods
      const { data: periodsData, error: periodsError } = await supabase
        .from('course_periods')
        .select('*') // Select all fields for now
        .order('name', { ascending: true });
      if (periodsError) throw periodsError;
      setPeriods(periodsData || []);

    } catch (err: any) {
      console.error('Error fetching course period page data:', err);
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

  const handleEdit = (period: CoursePeriod) => {
    setPeriodToEdit(period);
    setShowForm(true);
  };

  const handleDelete = async (periodId: string) => {
    if (!window.confirm('Are you sure you want to delete this class/section?')) {
      return;
    }
    setError(null);
    try {
      const { error: deleteError } = await supabase
        .from('course_periods')
        .delete()
        .eq('id', periodId);

      if (deleteError) throw deleteError;
      setPeriods((prev) => prev.filter((p) => p.id !== periodId));
    } catch (err: any) {
      console.error('Error deleting course period:', err);
      setError('Failed to delete class/section. ' + err.message);
    }
  };

  const handleFormSave = (savedPeriod: CoursePeriod) => {
    if (periodToEdit) {
      setPeriods((prev) =>
        prev.map((p) => (p.id === savedPeriod.id ? savedPeriod : p))
      );
    } else {
      setPeriods((prev) => [...prev, savedPeriod]);
    }
     // Sort periods alphabetically by name after adding/editing
    setPeriods(currentPeriods => [...currentPeriods].sort((a, b) => a.name.localeCompare(b.name)));
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
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">Manage Classes/Sections</h2>
          <HelpTooltip helpKey="coursePeriods_intro" position="right" className="ml-2" />
        </div>
        {!showForm && (
          <button
            onClick={handleAddClick}
            className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 transition ease-in-out duration-150"
          >
            Add New Class/Section
          </button>
        )}
      </div>

      {error && <p className="mb-4 text-red-600 bg-red-100 p-3 rounded-md text-sm md:text-base">{error}</p>}

      {showForm ? (
        <CoursePeriodForm
          periodToEdit={periodToEdit}
          onSave={handleFormSave}
          onCancel={handleFormCancel}
        />
      ) : (
        <CoursePeriodList
          periods={periods}
          courses={courses}
          teachers={teachers}
          markingPeriods={markingPeriods}
          onEdit={handleEdit}
          onDelete={handleDelete}
          loading={loading}
        />
      )}
    </div>
  );
};

export default CoursePeriodsPage;
