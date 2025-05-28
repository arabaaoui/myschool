import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import HelpTooltip from '../common/HelpTooltip';
import { Student } from '../Students/StudentForm';
import { StudentFee } from './AssignFeeForm';
import { StudentPayment } from './RecordPaymentForm';
import { FeeType } from '../Settings/FeeTypes/FeeTypeForm';

interface StudentAccountBalance {
  student_id: string;
  student_first_name: string;
  student_last_name: string;
  total_outstanding_fees: number;
  total_paid_fees: number;
  total_payments_received: number;
  current_balance_intuitive: number; // Using this for display
}

interface DisplayableStudentFee extends StudentFee {
    fee_types?: { name?: string };
}

const StudentAccountView: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  
  const [assignedFees, setAssignedFees] = useState<DisplayableStudentFee[]>([]);
  const [payments, setPayments] = useState<StudentPayment[]>([]);
  const [accountBalance, setAccountBalance] = useState<StudentAccountBalance | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch students for dropdown
  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      try {
        const { data, error: studentsError } = await supabase
          .from('students')
          .select('id, first_name, last_name, student_identifier')
          .order('last_name', { ascending: true });
        if (studentsError) throw studentsError;
        setStudents(data || []);
      } catch (err: any) {
        setError('Failed to load students: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  const fetchStudentAccountData = useCallback(async () => {
    if (!selectedStudentId) {
      setAssignedFees([]);
      setPayments([]);
      setAccountBalance(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Fetch assigned fees with fee type name
      const { data: feesData, error: feesError } = await supabase
        .from('student_fees')
        .select('*, fee_types (name)')
        .eq('student_id', selectedStudentId)
        .order('due_date', { ascending: true, nullsLast: true });
      if (feesError) throw feesError;
      setAssignedFees(feesData || []);

      // Fetch payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('student_payments')
        .select('*')
        .eq('student_id', selectedStudentId)
        .order('payment_date', { ascending: false });
      if (paymentsError) throw paymentsError;
      setPayments(paymentsData || []);

      // Fetch account balance from view
      const { data: balanceData, error: balanceError } = await supabase
        .from('student_account_balances_view')
        .select('*')
        .eq('student_id', selectedStudentId)
        .single();
      if (balanceError) throw balanceError;
      setAccountBalance(balanceData);

    } catch (err: any) {
      console.error('Error fetching student account data:', err);
      setError('Failed to load account details: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedStudentId]);

  useEffect(() => {
    fetchStudentAccountData();
  }, [fetchStudentAccountData]);

  const handleToggleFeePaidStatus = async (feeId: string, currentIsPaid: boolean) => {
    setLoading(true);
    setError(null);
    try {
        const newPaidStatus = !currentIsPaid;
        const { data, error: updateError } = await supabase
            .from('student_fees')
            .update({ 
                is_paid: newPaidStatus, 
                paid_date: newPaidStatus ? new Date().toISOString().split('T')[0] : null,
                updated_at: new Date().toISOString()
            })
            .eq('id', feeId)
            .select()
            .single();

        if (updateError) throw updateError;
        
        // Refresh data after update
        fetchStudentAccountData(); 
        alert(`Fee status updated successfully.`);

    } catch (err: any) {
        console.error('Error updating fee status:', err);
        setError('Failed to update fee status: ' + err.message);
    } finally {
        setLoading(false);
    }
  };
  
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString.includes('T') ? dateString : dateString + 'T00:00:00').toLocaleDateString();
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 bg-white shadow-md rounded-lg max-w-4xl mx-auto">
      <h3 className="text-lg sm:text-xl font-semibold text-gray-700 flex items-center">
        Student Account View
        <HelpTooltip helpKey="studentAccountView_intro" position="right" className="ml-2"/>
      </h3>
      
      <div>
        <label htmlFor="student_select_account" className="flex items-center text-sm font-medium text-gray-700">
          Select Student <span className="text-red-500 ml-1">*</span>
          <HelpTooltip helpKey="studentAccountView_selectStudent" />
        </label>
        <select 
          id="student_select_account" 
          value={selectedStudentId} 
          onChange={(e) => setSelectedStudentId(e.target.value)}
          className="mt-1 block w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        >
          <option value="">-- Select Student --</option>
          {students.map(s => <option key={s.id} value={s.id!}>{s.last_name}, {s.first_name} ({s.student_identifier || 'ID N/A'})</option>)}
        </select>
      </div>

      {loading && <p className="text-center text-gray-500 py-4">Loading account details...</p>}
      {error && <p className="text-red-500 text-sm bg-red-100 p-3 rounded-md">{error}</p>}

      {selectedStudentId && !loading && !error && (
        <>
          {/* Account Balance Summary */}
          {accountBalance && (
            <div className="my-6 p-4 bg-indigo-50 rounded-lg shadow">
              <h4 className="text-md font-semibold text-indigo-700 mb-2">Account Summary <HelpTooltip helpKey="studentAccountView_balanceInfo" /></h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><span className="font-medium">Total Outstanding:</span> ${Number(accountBalance.total_outstanding_fees).toFixed(2)}</div>
                <div><span className="font-medium">Total Paid Fees:</span> ${Number(accountBalance.total_paid_fees).toFixed(2)}</div>
                <div><span className="font-medium">Total Payments Received:</span> ${Number(accountBalance.total_payments_received).toFixed(2)}</div>
                <div className={`font-bold ${accountBalance.current_balance_intuitive > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    <span className="font-medium text-gray-700">Current Balance:</span> ${Number(accountBalance.current_balance_intuitive).toFixed(2)}
                </div>
              </div>
            </div>
          )}

          {/* Assigned Fees Table */}
          <div className="mt-6">
            <h4 className="text-md font-semibold text-gray-700 mb-2">Assigned Fees <HelpTooltip helpKey="studentAccountView_feesTableTitle" /></h4>
            {assignedFees.length === 0 ? <p className="text-sm text-gray-500">No fees assigned to this student.</p> : (
              <div className="overflow-x-auto border rounded-md">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fee Type</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {assignedFees.map(fee => (
                      <tr key={fee.id}>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">
                            {fee.fee_types?.name || 'N/A'}
                            {fee.description_override && <p className="text-xs text-gray-500 italic truncate max-w-xs hover:whitespace-normal">{fee.description_override}</p>}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">${Number(fee.amount).toFixed(2)}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">{formatDate(fee.due_date)}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">
                          <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${fee.is_paid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {fee.is_paid ? `Paid (${formatDate(fee.paid_date)})` : 'Unpaid'}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">
                          <button 
                            onClick={() => handleToggleFeePaidStatus(fee.id!, fee.is_paid || false)}
                            className={`text-xs px-2 py-1 rounded ${fee.is_paid ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}
                            title={fee.is_paid ? 'Mark as Unpaid' : 'Mark as Paid'}
                          >
                            {fee.is_paid ? 'Mark Unpaid' : 'Mark Paid'}
                          </button>
                           <HelpTooltip helpKey={fee.is_paid ? "studentAccountView_markAsUnpaidButton" : "studentAccountView_markAsPaidButton"} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Payments Table */}
          <div className="mt-8">
            <h4 className="text-md font-semibold text-gray-700 mb-2">Recorded Payments <HelpTooltip helpKey="studentAccountView_paymentsTableTitle" /></h4>
            {payments.length === 0 ? <p className="text-sm text-gray-500">No payments recorded for this student.</p> : (
              <div className="overflow-x-auto border rounded-md">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount Paid</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {payments.map(payment => (
                      <tr key={payment.id}>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">{formatDate(payment.payment_date)}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">${Number(payment.amount_paid).toFixed(2)}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">{payment.payment_method || 'N/A'}</td>
                        <td className="px-3 py-2 whitespace-normal break-words text-sm max-w-xs truncate hover:whitespace-normal">{payment.notes || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default StudentAccountView;
