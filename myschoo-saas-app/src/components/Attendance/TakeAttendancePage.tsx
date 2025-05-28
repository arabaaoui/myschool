import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import SelectCoursePeriodForAttendance from './SelectCoursePeriodForAttendance';
import AttendanceSheet, { AttendanceRecord, StudentEnrollmentWithStudent } from './AttendanceSheet';
import { AttendanceCode } from '../Settings/AttendanceCodes/AttendanceCodeForm';
import HelpTooltip from '../common/HelpTooltip';
import { useAuth } from '../../App'; // To check teacher role

const TakeAttendancePage: React.FC = () => {
  const { user } = useAuth(); // Get current user
  const [selectedCoursePeriodId, setSelectedCoursePeriodId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  
  const [enrolledStudents, setEnrolledStudents] = useState<StudentEnrollmentWithStudent[]>([]);
  const [attendanceCodes, setAttendanceCodes] = useState<AttendanceCode[]>([]);
  const [existingRecords, setExistingRecords] = useState<AttendanceRecord[]>([]);
  
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check if the current user is a teacher
  const isCurrentUserTeacher = user?.app_metadata?.role === 'teacher' || user?.app_metadata?.role === 'admin';


  // Fetch attendance codes once
  useEffect(() => {
    const fetchCodes = async () => {
      try {
        const { data, error } = await supabase
          .from('attendance_codes')
          .select('*')
          .order('sort_order', { ascending: true, nullsLast: true })
          .order('code', { ascending: true });
        if (error) throw error;
        setAttendanceCodes(data || []);
      } catch (err: any) {
        setError('Failed to load attendance codes. ' + err.message);
      }
    };
    fetchCodes();
  }, []);

  const fetchAttendanceSheetData = useCallback(async (coursePeriodId: string, date: string) => {
    setLoadingSheet(true);
    setError(null);
    setSuccessMessage(null);
    try {
      // Fetch enrolled students for the course period
      // Ensure withdrawal_date is considered if applicable (students withdrawn before 'date' should not appear)
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from('student_enrollments')
        .select(`
          id, 
          student_id,
          course_period_id,
          enrollment_date,
          withdrawal_date,
          students (id, first_name, last_name, student_identifier)
        `)
        .eq('course_period_id', coursePeriodId)
        .lte('enrollment_date', date) // Enrolled on or before the attendance date
        .or(`withdrawal_date.is.null,withdrawal_date.gt.${date}`); // Not withdrawn, or withdrawn after the attendance date
        
      if (enrollmentsError) throw enrollmentsError;
      // Ensure students data is correctly typed/accessed
      const validEnrollments = (enrollmentsData || []).filter(e => e.students).map(e => e as StudentEnrollmentWithStudent)
      setEnrolledStudents(validEnrollments);

      // Fetch existing attendance records for these students on this date
      const studentEnrollmentIds = (enrollmentsData || []).map(e => e.id);
      if (studentEnrollmentIds.length > 0) {
        const { data: recordsData, error: recordsError } = await supabase
          .from('attendance_records')
          .select('*')
          .in('student_enrollment_id', studentEnrollmentIds)
          .eq('attendance_date', date);
        if (recordsError) throw recordsError;
        setExistingRecords(recordsData || []);
      } else {
        setExistingRecords([]);
      }

    } catch (err: any) {
      console.error('Error fetching attendance sheet data:', err);
      setError('Failed to load attendance sheet. ' + err.message);
      setEnrolledStudents([]); // Clear students on error
      setExistingRecords([]);
    } finally {
      setLoadingSheet(false);
    }
  }, []);


  const handleSelection = (coursePeriodId: string, date: string) => {
    setSelectedCoursePeriodId(coursePeriodId);
    setSelectedDate(date);
    fetchAttendanceSheetData(coursePeriodId, date);
  };

  const handleSaveAttendance = async (recordsToSave: Omit<AttendanceRecord, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>[]) => {
    setLoadingSheet(true); // Indicate saving
    setError(null);
    setSuccessMessage(null);
    try {
      // Upsert logic: Insert new records, update existing ones based on unique constraint (student_enrollment_id, attendance_date)
      const { error: saveError } = await supabase
        .from('attendance_records')
        .upsert(recordsToSave, { 
            onConflict: 'student_enrollment_id, attendance_date',
            // ignoreDuplicates: false, // default is false, so it will update
         });

      if (saveError) throw saveError;
      setSuccessMessage('Attendance saved successfully!');
      // Refetch data to show updated records (Supabase returning array might not be reliable for all fields on upsert)
      if (selectedCoursePeriodId && selectedDate) {
        fetchAttendanceSheetData(selectedCoursePeriodId, selectedDate);
      }
    } catch (err: any) {
      console.error('Error saving attendance:', err);
      setError('Failed to save attendance. ' + err.message);
    } finally {
      setLoadingSheet(false);
    }
  };
  
  if (!isCurrentUserTeacher) {
      return (
          <div className="p-4 md:p-6">
              <p className="text-red-500">You do not have permission to take attendance. This module is for teachers.</p>
          </div>
      );
  }


  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div className="flex items-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Take Attendance</h1>
          <HelpTooltip helpKey="takeAttendance_intro" position="right" className="ml-2" />
        </div>
      </div>

      {/* Display general errors here, above selection or sheet */}
      {error && !loadingSheet && <p className="my-4 text-red-600 bg-red-100 p-3 rounded-md text-sm md:text-base">{error}</p>}
      {successMessage && <p className="my-4 text-green-600 bg-green-100 p-3 rounded-md text-sm md:text-base">{successMessage}</p>}


      <SelectCoursePeriodForAttendance onSelection={handleSelection} />

      {loadingSheet && <p className="text-center text-gray-500 py-8">Loading attendance sheet...</p>}

      {!loadingSheet && selectedCoursePeriodId && selectedDate && attendanceCodes.length > 0 && (
        <AttendanceSheet
          coursePeriodId={selectedCoursePeriodId}
          attendanceDate={selectedDate}
          enrolledStudents={enrolledStudents}
          attendanceCodes={attendanceCodes}
          existingRecords={existingRecords}
          onSaveAttendance={handleSaveAttendance}
        />
      )}
      {!loadingSheet && selectedCoursePeriodId && selectedDate && attendanceCodes.length === 0 && !error && (
        <p className="text-center text-orange-500 py-4">Attendance codes not loaded. Cannot display attendance sheet.</p>
      )}
    </div>
  );
};

export default TakeAttendancePage;
