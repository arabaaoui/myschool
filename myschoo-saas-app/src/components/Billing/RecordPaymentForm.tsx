import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import HelpTooltip from '../common/HelpTooltip';
import { Student } from '../Students/StudentForm';
import { useAuth } from '../../App'; // To get current user ID for recorded_by_user_id

export interface StudentPayment {
  id?: string;
  tenant_id?: string;
  student_id: string;
  payment_date?: string; // TIMESTAMPTZ, will be formatted to datetime-local
  amount_paid: number;
  payment_method?: string | null;
  notes?: string | null;
  recorded_by_user_id?: string | null;
}

interface RecordPaymentFormProps {
  onPaymentRecorded: (payment: StudentPayment) => void;
  // studentToRecordFor?: Student | null; // If pre-selecting a student
}

const RecordPaymentForm: React.FC<RecordPaymentFormProps> = ({ onPaymentRecorded }) => {
  const { user } = useAuth();
  const [studentId, setStudentId] = useState<string>('');
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().slice(0, 16)); // Default to now
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [students, setStudents] = useState<Student[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingStudents, setLoadingStudents] = useState(true);

  useEffect(() => {
    const fetchStudents = async () => {
      setLoadingStudents(true);
      try {
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('id, first_name, last_name, student_identifier')
          .order('last_name', { ascending: true });
        if (studentsError) throw studentsError;
        setStudents(studentsData || []);
      } catch (err: any) {
        setError('Failed to load students: ' + err.message);
      } finally {
        setLoadingStudents(false);
      }
    };
    fetchStudents();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!studentId) { setError('Please select a student.'); setLoading(false); return; }
    const numericAmountPaid = parseFloat(amountPaid);
    if (isNaN(numericAmountPaid) || numericAmountPaid <= 0) { setError('Amount paid must be a positive number.'); setLoading(false); return; }
    if (!paymentDate) { setError('Payment date is required.'); setLoading(false); return; }


    try {
      const newPayment: Omit<StudentPayment, 'id' | 'tenant_id'> = {
        student_id: studentId,
        amount_paid: numericAmountPaid,
        payment_date: new Date(paymentDate).toISOString(),
        payment_method: paymentMethod.trim() === '' ? null : paymentMethod.trim(),
        notes: notes.trim() === '' ? null : notes.trim(),
        recorded_by_user_id: user?.id || null,
      };

      const { data, error: insertError } = await supabase
        .from('student_payments')
        .insert(newPayment)
        .select()
        .single();

      if (insertError) throw insertError;

      onPaymentRecorded(data as StudentPayment);
      // Reset form
      setStudentId('');
      setAmountPaid('');
      setPaymentDate(new Date().toISOString().slice(0, 16));
      setPaymentMethod('');
      setNotes('');
      alert('Payment recorded successfully!');

    } catch (err: any) {
      console.error('Error recording payment:', err);
      setError(err.message || 'Failed to record payment.');
    } finally {
      setLoading(false);
    }
  };

  if (loadingStudents) {
    return <p className="text-center text-gray-500 py-4">Loading student data...</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-4 sm:p-6 bg-white shadow-md rounded-lg max-w-xl mx-auto">
      <h3 className="text-lg sm:text-xl font-semibold text-gray-700">Record Student Payment</h3>
      {error && <p className="text-red-500 text-sm bg-red-100 p-3 rounded-md">{error}</p>}

      <div>
        <label htmlFor="student_id_payment" className="flex items-center text-sm font-medium text-gray-700">
          Student <span className="text-red-500 ml-1">*</span>
           <HelpTooltip helpKey="recordPaymentForm_student" />
        </label>
        <select id="student_id_payment" name="student_id" value={studentId} onChange={(e) => setStudentId(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
          <option value="">-- Select Student --</option>
          {students.map(s => <option key={s.id} value={s.id!}>{s.last_name}, {s.first_name} ({s.student_identifier || 'ID N/A'})</option>)}
        </select>
      </div>

      <div>
        <label htmlFor="amount_paid" className="flex items-center text-sm font-medium text-gray-700">
          Amount Paid <span className="text-red-500 ml-1">*</span>
          <HelpTooltip helpKey="recordPaymentForm_amountPaid" />
        </label>
        <input type="number" id="amount_paid" name="amount_paid" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} required min="0.01" step="0.01" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
      </div>

      <div>
        <label htmlFor="payment_date" className="flex items-center text-sm font-medium text-gray-700">
          Payment Date & Time <span className="text-red-500 ml-1">*</span>
           <HelpTooltip helpKey="recordPaymentForm_paymentDate" />
        </label>
        <input type="datetime-local" id="payment_date" name="payment_date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
      </div>

      <div>
        <label htmlFor="payment_method" className="flex items-center text-sm font-medium text-gray-700">
          Payment Method (Optional)
          <HelpTooltip helpKey="recordPaymentForm_paymentMethod" />
        </label>
        <input type="text" id="payment_method" name="payment_method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="e.g., Cash, Credit Card, Bank Transfer" />
      </div>

       <div>
        <label htmlFor="notes_payment" className="flex items-center text-sm font-medium text-gray-700">
          Notes (Optional)
          <HelpTooltip helpKey="recordPaymentForm_notes" />
        </label>
        <textarea id="notes_payment" name="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="e.g., Transaction ID, Check #"></textarea>
      </div>


      <div className="flex justify-end pt-2">
        <button type="submit" disabled={loading || loadingStudents} className="w-full sm:w-auto inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
          {loading ? 'Recording...' : 'Record Payment'}
        </button>
      </div>
    </form>
  );
};

export default RecordPaymentForm;
