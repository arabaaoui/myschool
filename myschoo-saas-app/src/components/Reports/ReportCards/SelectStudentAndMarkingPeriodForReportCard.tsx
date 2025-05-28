import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import HelpTooltip from '../../common/HelpTooltip';
import { Student } from '../../Students/StudentForm';
import { MarkingPeriod } from '../../Settings/MarkingPeriods/MarkingPeriodForm';

interface SelectStudentAndMarkingPeriodForReportCardProps {
  onGenerate: (studentId: string, markingPeriodId: string) => void;
}

const SelectStudentAndMarkingPeriodForReportCard: React.FC<SelectStudentAndMarkingPeriodForReportCardProps> = ({ onGenerate }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [markingPeriods, setMarkingPeriods] = useState<MarkingPeriod[]>([]);
  
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedMarkingPeriodId, setSelectedMarkingPeriodId] = useState<string>('');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('id, first_name, last_name, student_identifier')
          .order('last_name', { ascending: true });
        if (studentsError) throw studentsError;
        setStudents(studentsData || []);

        const { data: mpData, error: mpError } = await supabase
          .from('marking_periods')
          .select('id, name, academic_year_id') // Include academic_year_id if needed for context/ordering
          .order('start_date', { ascending: false }); // Show most recent first
        if (mpError) throw mpError;
        setMarkingPeriods(mpData || []);

      } catch (err: any) {
        setError('Failed to load students or marking periods: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedMarkingPeriodId) {
      alert("Please select both a student and a marking period.");
      return;
    }
    onGenerate(selectedStudentId, selectedMarkingPeriodId);
  };

  if (loading) {
    return <p className="text-center text-gray-500 py-4">Loading selection options...</p>;
  }
  if (error) {
    return <p className="text-center text-red-500 py-4 bg-red-50 p-2 rounded">{error}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-gray-50 rounded-lg shadow print:hidden">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div>
          <label htmlFor="student_select_rc" className="flex items-center text-sm font-medium text-gray-700">
            Select Student <span className="text-red-500 ml-1">*</span>
            <HelpTooltip helpKey="reportCard_selectStudent" />
          </label>
          <select
            id="student_select_rc"
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="">-- Select Student --</option>
            {students.map(s => <option key={s.id} value={s.id!}>{s.last_name}, {s.first_name} ({s.student_identifier || 'ID N/A'})</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="marking_period_select_rc" className="flex items-center text-sm font-medium text-gray-700">
            Select Marking Period <span className="text-red-500 ml-1">*</span>
            <HelpTooltip helpKey="reportCard_selectMarkingPeriod" />
          </label>
          <select
            id="marking_period_select_rc"
            value={selectedMarkingPeriodId}
            onChange={(e) => setSelectedMarkingPeriodId(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="">-- Select Marking Period --</option>
            {markingPeriods.map(mp => <option key={mp.id} value={mp.id!}>{mp.name}</option>)}
          </select>
        </div>
        <button
          type="submit"
          disabled={!selectedStudentId || !selectedMarkingPeriodId || loading}
          className="w-full md:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          Generate Report Card
          <HelpTooltip helpKey="reportCard_generateButton" />
        </button>
      </div>
    </form>
  );
};

export default SelectStudentAndMarkingPeriodForReportCard;
