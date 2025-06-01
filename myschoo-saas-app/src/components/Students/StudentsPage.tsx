import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient'; // Adjust path as necessary
import StudentList from './StudentList';
import StudentForm, { Student } from './StudentForm'; // Re-use the Student interface
import { useAuth } from '../../App'; // Assuming useAuth is exported from App.tsx

interface GradeLevel {
  id: string;
  name: string;
}

const StudentsPage: React.FC = () => {
  const { user } = useAuth(); // Get current user for context if needed

  const [students, setStudents] = useState<Student[]>([]);
  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingGradeLevels, setLoadingGradeLevels] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);

  const fetchStudents = useCallback(async () => {
    setLoadingStudents(true);
    setError(null);
    try {
      // RLS should ensure only students from the user's tenant are fetched.
      const { data, error: studentsError } = await supabase
        .from('students')
        .select('*') // Select all fields for now
        .order('last_name', { ascending: true })
        .order('first_name', { ascending: true });

      if (studentsError) throw studentsError;
      setStudents(data || []);
    } catch (err: any) {
      console.error('Error fetching students:', err);
      setError('Failed to load students. ' + err.message);
    } finally {
      setLoadingStudents(false);
    }
  }, []);

  const fetchGradeLevels = useCallback(async () => {
    setLoadingGradeLevels(true);
    // setError(null); // Don't reset error if students fetch failed
    try {
      // RLS should ensure only grade_levels from the user's tenant are fetched.
      const { data, error: gradeLevelsError } = await supabase
        .from('grade_levels')
        .select('id, name')
        .order('sort_order', { ascending: true });

      if (gradeLevelsError) throw gradeLevelsError;
      setGradeLevels(data || []);
    } catch (err: any) {
      console.error('Error fetching grade levels:', err);
      setError((prevError) => (prevError || '') + ' Failed to load grade levels. ' + err.message);
    } finally {
      setLoadingGradeLevels(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
    fetchGradeLevels();
  }, [fetchStudents, fetchGradeLevels]);

  const handleAddStudentClick = () => {
    setStudentToEdit(null);
    setShowForm(true);
  };

  const handleEditStudent = (student: Student) => {
    setStudentToEdit(student);
    setShowForm(true);
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!window.confirm('Are you sure you want to delete this student?')) {
      return;
    }
    setError(null);
    try {
      const { error: deleteError } = await supabase
        .from('students')
        .delete()
        .eq('id', studentId);

      if (deleteError) throw deleteError;
      setStudents((prevStudents) => prevStudents.filter((s) => s.id !== studentId));
    } catch (err: any) {
      console.error('Error deleting student:', err);
      setError('Failed to delete student. ' + err.message);
    }
  };

  const handleFormSave = (savedStudent: Student) => {
    if (studentToEdit) {
      // Update existing student in the list
      setStudents((prevStudents) =>
        prevStudents.map((s) => (s.id === savedStudent.id ? savedStudent : s))
      );
    } else {
      // Add new student to the list
      setStudents((prevStudents) => [...prevStudents, savedStudent]);
    }
    setShowForm(false);
    setStudentToEdit(null);
    // Optionally, re-fetch all students to ensure data consistency
    // fetchStudents();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setStudentToEdit(null);
  };

  const isLoading = loadingStudents || loadingGradeLevels;

  return (
    // Applied responsive padding: p-4 for small screens, md:p-6 for medium and up.
    <div className="container mx-auto p-4 md:p-6">
      {/* Header section with responsive layout */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Student Management</h1>
        {!showForm && (
          <button
            onClick={handleAddStudentClick}
            // Responsive width: w-full on small screens, sm:w-auto for larger.
            className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 transition ease-in-out duration-150"
          >
            Add New Student
          </button>
        )}
      </div>

      {error && <p className="mb-4 text-red-600 bg-red-100 p-3 rounded-md text-sm md:text-base">{error}</p>}

      {showForm ? (
        <StudentForm
          studentToEdit={studentToEdit}
          onSave={handleFormSave}
          onCancel={handleFormCancel}
          currentUser={user}
        />
      ) : (
        <>
          {isLoading && <p className="text-center text-gray-500 py-4 text-sm md:text-base">Loading data...</p>}
          {!isLoading && !error && (
            <StudentList
              students={students}
              gradeLevels={gradeLevels}
              onEdit={handleEditStudent}
              onDelete={handleDeleteStudent}
            />
          )}
        </>
      )}
    </div>
  );
};

export default StudentsPage;
