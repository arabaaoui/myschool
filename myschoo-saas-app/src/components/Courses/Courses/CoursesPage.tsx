import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';
import CourseList from './CourseList';
import CourseForm, { Course } from './CourseForm';
import { Subject } from '../Subjects/SubjectForm'; // For fetching subjects
import HelpTooltip from '../../common/HelpTooltip';

const CoursesPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]); // To pass to CourseList for display
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [courseToEdit, setCourseToEdit] = useState<Course | null>(null);

  const fetchCoursesAndSubjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch subjects first (or in parallel)
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('id, name')
        .order('name', { ascending: true });
      if (subjectsError) throw subjectsError;
      setSubjects(subjectsData || []);

      // Fetch courses
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*') // Select all fields for now
        .order('name', { ascending: true });
      if (coursesError) throw coursesError;
      setCourses(coursesData || []);

    } catch (err: any) {
      console.error('Error fetching courses or subjects:', err);
      setError('Failed to load data. ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoursesAndSubjects();
  }, [fetchCoursesAndSubjects]);

  const handleAddClick = () => {
    setCourseToEdit(null);
    setShowForm(true);
  };

  const handleEdit = (course: Course) => {
    setCourseToEdit(course);
    setShowForm(true);
  };

  const handleDelete = async (courseId: string) => {
    if (!window.confirm('Are you sure you want to delete this course? This might fail if course periods are associated with it.')) {
      return;
    }
    setError(null);
    try {
      const { error: deleteError } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);

      if (deleteError) throw deleteError;
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
    } catch (err: any) {
      console.error('Error deleting course:', err);
      setError('Failed to delete course. It might be in use. ' + err.message);
    }
  };

  const handleFormSave = (savedCourse: Course) => {
    if (courseToEdit) {
      setCourses((prev) =>
        prev.map((c) => (c.id === savedCourse.id ? savedCourse : c))
      );
    } else {
      setCourses((prev) => [...prev, savedCourse]);
    }
    // Sort courses alphabetically by name after adding/editing
    setCourses(currentCourses => [...currentCourses].sort((a, b) => a.name.localeCompare(b.name)));
    setShowForm(false);
    setCourseToEdit(null);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setCourseToEdit(null);
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div className="flex items-center">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">Manage Courses</h2>
          <HelpTooltip helpKey="courses_intro" position="right" className="ml-2" />
        </div>
        {!showForm && (
          <button
            onClick={handleAddClick}
            className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 transition ease-in-out duration-150"
          >
            Add New Course
          </button>
        )}
      </div>

      {error && <p className="mb-4 text-red-600 bg-red-100 p-3 rounded-md text-sm md:text-base">{error}</p>}

      {showForm ? (
        <CourseForm
          courseToEdit={courseToEdit}
          onSave={handleFormSave}
          onCancel={handleFormCancel}
        />
      ) : (
        <CourseList
          courses={courses}
          subjects={subjects} // Pass subjects to CourseList
          onEdit={handleEdit}
          onDelete={handleDelete}
          loading={loading}
        />
      )}
    </div>
  );
};

export default CoursesPage;
