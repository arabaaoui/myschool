import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';
import SelectStudentAndMarkingPeriodForReportCard from './SelectStudentAndMarkingPeriodForReportCard';
import ReportCardView, { ReportCardData } from './ReportCardView';
import HelpTooltip from '../../common/HelpTooltip';
import { useAuth } from '../../../App';

const ReportCardsPage: React.FC = () => {
  const { isTeacher, isTenantAdmin } = useAuth();
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedMarkingPeriodId, setSelectedMarkingPeriodId] = useState<string | null>(null);
  
  const [reportCardData, setReportCardData] = useState<ReportCardData[]>([]);
  const [studentNameForReport, setStudentNameForReport] = useState<string>('');
  const [markingPeriodNameForReport, setMarkingPeriodNameForReport] = useState<string>('');
  const [academicYearNameForReport, setAcademicYearNameForReport] = useState<string>('');
  const [gradeLevelNameForReport, setGradeLevelNameForReport] = useState<string>('');


  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateReport = useCallback(async (studentId: string, markingPeriodId: string) => {
    setSelectedStudentId(studentId);
    setSelectedMarkingPeriodId(markingPeriodId);
    setLoading(true);
    setError(null);
    setReportCardData([]);

    try {
      const { data, error: reportError } = await supabase
        .from('report_card_data_view')
        .select('*')
        .eq('student_id', studentId)
        .eq('marking_period_id', markingPeriodId)
        .order('course_name', { ascending: true });

      if (reportError) throw reportError;
      setReportCardData(data || []);

      if (data && data.length > 0) {
        setStudentNameForReport(data[0].student_name);
        setMarkingPeriodNameForReport(data[0].marking_period_name);
        setAcademicYearNameForReport(data[0].academic_year_name);
        setGradeLevelNameForReport(data[0].grade_level_name || '');

      } else {
        // Try to get student name even if no report data
        const { data: studentData } = await supabase.from('students').select('first_name, last_name').eq('id', studentId).single();
        setStudentNameForReport(studentData ? `${studentData.first_name} ${studentData.last_name}` : 'Selected Student');
        
        const { data: mpData } = await supabase.from('marking_periods').select('name').eq('id', markingPeriodId).single();
        setMarkingPeriodNameForReport(mpData ? mpData.name : 'Selected Period');

        setError('No report card data found for the selected student and marking period.');
      }

    } catch (err: any) {
      console.error('Error generating report card:', err);
      setError('Failed to generate report card: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);
  
  if (!isTeacher && !isTenantAdmin) {
    return <p className="p-4 text-red-500">You do not have permission to view report cards.</p>;
  }

  return (
    <div className="p-4 md:p-6"> {/* Removed container mx-auto to allow full width if needed by ReportsRouter */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4 print:hidden">
        <div className="flex items-center">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">Generate Report Card</h2>
          <HelpTooltip helpKey="reportCards_intro" position="right" className="ml-2" />
        </div>
      </div>

      <SelectStudentAndMarkingPeriodForReportCard onGenerate={handleGenerateReport} />

      {loading && <p className="text-center py-8 text-gray-500">Generating report card...</p>}
      {error && <p className="my-4 text-red-600 bg-red-100 p-3 rounded-md text-sm">{error}</p>}
      
      {!loading && reportCardData.length > 0 && selectedStudentId && selectedMarkingPeriodId && (
        <div className="mt-8">
          <ReportCardView 
            data={reportCardData} 
            studentName={studentNameForReport}
            markingPeriodName={markingPeriodNameForReport}
            academicYearName={academicYearNameForReport}
            gradeLevelName={gradeLevelNameForReport}
          />
        </div>
      )}
    </div>
  );
};

export default ReportCardsPage;
