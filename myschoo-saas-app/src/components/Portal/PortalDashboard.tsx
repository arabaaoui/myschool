import React, { useState, useEffect } from 'react';
import { useAuth } from '../../App';
import MyScheduleView from './MyScheduleView';
import MyAttendanceView from './MyAttendanceView';
import MyGradesView from './MyGradesView';
import MyBillingView from './MyBillingView'; // Import MyBillingView
import HelpTooltip from '../common/HelpTooltip';
import { supabase } from '../../supabaseClient';

interface LinkedStudent {
  id: string;
  name: string;
}

type PortalView = 'dashboard' | 'schedule' | 'attendance' | 'grades' | 'billing'; // Added 'billing'

const PortalDashboard: React.FC = () => {
  const { user, isStudent, isParent, linkedStudents: contextLinkedStudents, currentStudentId: contextCurrentStudentId, setCurrentStudentId: contextSetCurrentStudentId } = useAuth();

  const [localLinkedStudents, setLocalLinkedStudents] = useState<LinkedStudent[]>(contextLinkedStudents || []);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(contextCurrentStudentId || null);
  const [currentView, setCurrentView] = useState<PortalView>('dashboard');
  const [loadingStudents, setLoadingStudents] = useState(false);

  useEffect(() => {
    if (isStudent && user?.id) {
        const fetchStudentId = async () => {
            setLoadingStudents(true);
            try {
                const { data: studentData, error } = await supabase
                    .from('students')
                    .select('id, first_name, last_name')
                    .eq('user_profile_id', user.id)
                    .single();
                if (error) throw error;
                if (studentData && contextSetCurrentStudentId) {
                    contextSetCurrentStudentId(studentData.id);
                    setSelectedStudentId(studentData.id);
                    setLocalLinkedStudents([{id: studentData.id, name: `${studentData.first_name} ${studentData.last_name}`}]);
                }
            } catch (err) {
                console.error("Error fetching student ID for student user:", err);
            } finally {
                setLoadingStudents(false);
            }
        };
        fetchStudentId();
    } else if (isParent && user?.id && !contextLinkedStudents?.length) {
      setLoadingStudents(true);
      const fetchStudents = async () => {
        try {
          const { data, error } = await supabase
            .from('parent_student_links')
            .select('students (id, first_name, last_name)')
            .eq('parent_user_id', user.id);

          if (error) throw error;
          const students = data?.map(link => ({
            id: link.students!.id,
            name: `${link.students!.first_name} ${link.students!.last_name}`
          })) || [];
          setLocalLinkedStudents(students);
          if (students.length > 0 && contextSetCurrentStudentId) {
            if (!selectedStudentId || !students.find(s => s.id === selectedStudentId)) {
                contextSetCurrentStudentId(students[0].id);
                setSelectedStudentId(students[0].id);
            }
          }
        } catch (err) {
          console.error("Error fetching linked students:", err);
        } finally {
            setLoadingStudents(false);
        }
      };
      fetchStudents();
    } else if (contextLinkedStudents?.length) {
        setLocalLinkedStudents(contextLinkedStudents);
        if (contextCurrentStudentId) setSelectedStudentId(contextCurrentStudentId);
        else if (contextLinkedStudents.length > 0 && contextSetCurrentStudentId) {
            contextSetCurrentStudentId(contextLinkedStudents[0].id);
            setSelectedStudentId(contextLinkedStudents[0].id);
        }
    }
  }, [user, isStudent, isParent, contextLinkedStudents, contextCurrentStudentId, contextSetCurrentStudentId, selectedStudentId]);


  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentId(studentId);
    if (contextSetCurrentStudentId) {
        contextSetCurrentStudentId(studentId);
    }
    setCurrentView('dashboard');
  };

  const renderView = () => {
    if (!selectedStudentId && isParent && localLinkedStudents.length > 0) {
      return <p className="text-center text-gray-600">Please select a child to view their information.</p>;
    }
    if (!selectedStudentId && !isParent && !isStudent) {
        return <p className="text-center text-gray-600">No student information available.</p>;
    }
    if (loadingStudents && !selectedStudentId) {
        return <p className="text-center text-gray-500 py-4">Loading student data...</p>;
    }
    if (!selectedStudentId && localLinkedStudents.length === 0 && isParent && !loadingStudents){
        return <p className="text-center text-gray-600">No students are currently linked to your account.</p>;
    }


    switch (currentView) {
      case 'schedule':
        return selectedStudentId ? <MyScheduleView studentId={selectedStudentId} /> : null;
      case 'attendance':
        return selectedStudentId ? <MyAttendanceView studentId={selectedStudentId} /> : null;
      case 'grades':
        return selectedStudentId ? <MyGradesView studentId={selectedStudentId} /> : null;
      case 'billing': // Add billing case
        return selectedStudentId ? <MyBillingView studentId={selectedStudentId} /> : null;
      case 'dashboard':
      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {renderCard("My Schedule", "portal_mySchedule", "schedule")}
            {renderCard("My Attendance", "portal_myAttendance", "attendance")}
            {renderCard("My Grades", "portal_myGrades", "grades")}
            {renderCard("My Billing", "portal_myBilling", "billing")}
          </div>
        );
    }
  };

  const renderCard = (title: string, helpKey: string, view: PortalView) => (
    <div className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
      <h2 className="text-xl font-semibold text-indigo-700 mb-2 flex items-center">
        {title}
        <HelpTooltip helpKey={helpKey} position="right" className="ml-2" />
      </h2>
      <button
        onClick={() => {
            if (!selectedStudentId && isParent && localLinkedStudents.length > 0) {
                alert("Please select a child first."); return;
            } else if (!selectedStudentId && !isParent && !isStudent) { // Should not be reachable if studentId is set for student
                alert("No student selected."); return;
            }
            setCurrentView(view);
        }}
        disabled={!selectedStudentId && (isParent && localLinkedStudents.length > 0)}
        className="mt-4 w-full sm:w-auto px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 transition ease-in-out duration-150 disabled:opacity-50"
      >
        View {title}
      </button>
    </div>
  );

  const selectedStudentData = localLinkedStudents.find(s => s.id === selectedStudentId);
  const welcomeName = isStudent ? (profile?.full_name || user?.email) : (selectedStudentData?.name || profile?.full_name || user?.email);


  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
        <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
                {isParent && localLinkedStudents.length > 0 ? "Parent & Student Portal" : "Student Portal"}
            </h1>
            <p className="text-gray-600">Welcome, {welcomeName}!</p>
        </div>
        {isParent && localLinkedStudents.length > 0 && (
          <div className="w-full sm:w-auto">
            <label htmlFor="child_select" className="flex items-center text-sm font-medium text-gray-700">
              Viewing information for:
              <HelpTooltip helpKey="portal_selectChild" position="left" className="ml-1.5" />
            </label>
            <select
              id="child_select"
              value={selectedStudentId || ''}
              onChange={(e) => handleStudentSelect(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              {localLinkedStudents.map(child => (
                <option key={child.id} value={child.id}>{child.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {currentView !== 'dashboard' && (
          <button
            onClick={() => setCurrentView('dashboard')}
            className="mb-6 px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 print:hidden"
          >
            &larr; Back to Portal Dashboard
          </button>
      )}

      {renderView()}
    </div>
  );
};

export default PortalDashboard;
