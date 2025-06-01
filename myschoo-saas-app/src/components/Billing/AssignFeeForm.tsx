import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import HelpTooltip from '../common/HelpTooltip';
import { Student } from '../Students/StudentForm';
import { FeeType } from '../Settings/FeeTypes/FeeTypeForm';

export interface StudentFee {
  id?: string;
  tenant_id?: string;
  student_id: string;
  fee_type_id: string;
  description_override?: string | null;
  amount: number;
  due_date?: string | null;
  is_paid?: boolean;
  paid_date?: string | null;
}

interface AssignFeeFormProps {
  onFeeAssigned: (fee: StudentFee) => void;
  // studentToAssign?: Student | null; // If pre-selecting a student
}

const AssignFeeForm: React.FC<AssignFeeFormProps> = ({ onFeeAssigned }) => {
  const [studentId, setStudentId] = useState<string>('');
  const [feeTypeId, setFeeTypeId] = useState<string>('');
  const [amount, setAmount] = useState<string>(''); // Store as string for input control
  const [dueDate, setDueDate] = useState<string>('');
  const [descriptionOverride, setDescriptionOverride] = useState<string>('');

  const [students, setStudents] = useState<Student[]>([]);
  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);

  useEffect(() => {
    const fetchDropdownData = async () => {
      setLoadingDropdowns(true);
      setError(null);
      try {
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('id, first_name, last_name, student_identifier')
          .order('last_name', { ascending: true });
        if (studentsError) throw studentsError;
        setStudents(studentsData || []);

        const { data: ftData, error: ftError } = await supabase
          .from('fee_types')
          .select('*')
          .eq('is_active', true)
          .order('name', { ascending: true });
        if (ftError) throw ftError;
        setFeeTypes(ftData || []);

      } catch (err: any) {
        setError('Failed to load students or fee types: ' + err.message);
      } finally {
        setLoadingDropdowns(false);
      }
    };
    fetchDropdownData();
  }, []);

  // Update amount when fee type changes
  useEffect(() => {
    if (feeTypeId) {
      const selectedType = feeTypes.find(ft => ft.id === feeTypeId);
      if (selectedType) {
        setAmount(Number(selectedType.default_amount).toFixed(2));
      }
    } else {
      setAmount('');
    }
  }, [feeTypeId, feeTypes]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!studentId) { setError('Please select a student.'); setLoading(false); return; }
    if (!feeTypeId) { setError('Please select a fee type.'); setLoading(false); return; }
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) { setError('Amount must be a positive number.'); setLoading(false); return; }

    try {
      const newStudentFee: Omit<StudentFee, 'id' | 'tenant_id' | 'is_paid' | 'paid_date'> = {
        student_id: studentId,
        fee_type_id: feeTypeId,
        amount: numericAmount,
        due_date: dueDate || null,
        description_override: descriptionOverride.trim() === '' ? null : descriptionOverride.trim(),
      };

      const { data, error: insertError } = await supabase
        .from('student_fees')
        .insert(newStudentFee)
        .select()
        .single();

      if (insertError) throw insertError;

      onFeeAssigned(data as StudentFee);
      // Reset form
      setStudentId('');
      setFeeTypeId('');
      setAmount('');
      setDueDate('');
      setDescriptionOverride('');
      alert('Fee assigned successfully!');

    } catch (err: any) {
      console.error('Error assigning fee:', err);
      setError(err.message || 'Failed to assign fee.');
    } finally {
      setLoading(false);
    }
  };

  if (loadingDropdowns) {
    return <p className="text-center text-gray-500 py-4">Loading form data...</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-4 sm:p-6 bg-white shadow-md rounded-lg max-w-xl mx-auto">
      <h3 className="text-lg sm:text-xl font-semibold text-gray-700">Assign Fee to Student</h3>
      {error && <p className="text-red-500 text-sm bg-red-100 p-3 rounded-md">{error}</p>}

      <div>
        <label htmlFor="student_id_fee" className="flex items-center text-sm font-medium text-gray-700">
          Student <span className="text-red-500 ml-1">*</span>
          <HelpTooltip helpKey="assignFeeForm_student" />
        </label>
        <select id="student_id_fee" name="student_id" value={studentId} onChange={(e) => setStudentId(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
          <option value="">-- Select Student --</option>
          {students.map(s => <option key={s.id} value={s.id!}>{s.last_name}, {s.first_name} ({s.student_identifier || 'ID N/A'})</option>)}
        </select>
      </div>

      <div>
        <label htmlFor="fee_type_id" className="flex items-center text-sm font-medium text-gray-700">
          Fee Type <span className="text-red-500 ml-1">*</span>
          <HelpTooltip helpKey="assignFeeForm_feeType" />
        </label>
        <select id="fee_type_id" name="fee_type_id" value={feeTypeId} onChange={(e) => setFeeTypeId(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
          <option value="">-- Select Fee Type --</option>
          {feeTypes.map(ft => <option key={ft.id} value={ft.id!}>{ft.name} (Default: {Number(ft.default_amount).toFixed(2)})</option>)}
        </select>
      </div>

      <div>
        <label htmlFor="amount_fee" className="flex items-center text-sm font-medium text-gray-700">
          Amount <span className="text-red-500 ml-1">*</span>
          <HelpTooltip helpKey="assignFeeForm_amount" />
        </label>
        <input type="number" id="amount_fee" name="amount" value={amount} onChange={(e) => setAmount(e.target.value)} required min="0.01" step="0.01" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
      </div>

      <div>
        <label htmlFor="due_date_fee" className="flex items-center text-sm font-medium text-gray-700">
          Due Date (Optional)
          <HelpTooltip helpKey="assignFeeForm_dueDate" />
        </label>
        <input type="date" id="due_date_fee" name="due_date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
      </div>

       <div>
        <label htmlFor="description_override_fee" className="flex items-center text-sm font-medium text-gray-700">
          Description Override (Optional)
          <HelpTooltip helpKey="assignFeeForm_descriptionOverride" />
        </label>
        <textarea id="description_override_fee" name="description_override" value={descriptionOverride} onChange={(e) => setDescriptionOverride(e.target.value)} rows={2} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Specific details for this fee instance"></textarea>
      </div>


      <div className="flex justify-end pt-2">
        <button type="submit" disabled={loading || loadingDropdowns} className="w-full sm:w-auto inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
          {loading ? 'Assigning...' : 'Assign Fee'}
        </button>
      </div>
    </form>
  );
};

export default AssignFeeForm;
