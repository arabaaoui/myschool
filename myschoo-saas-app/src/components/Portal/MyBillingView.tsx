import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import HelpTooltip from '../common/HelpTooltip';
import { useAuth } from '../../App'; // To get currentStudentId
import { StudentFee } from '../Billing/AssignFeeForm'; // Re-use type
import { StudentPayment } from '../Billing/RecordPaymentForm'; // Re-use type

interface DisplayableStudentFeePortal extends StudentFee {
  fee_types?: { name?: string };
}

interface StudentAccountBalancePortal {
  student_id: string;
  student_first_name?: string; // Not strictly needed if name is already known
  student_last_name?: string;  // Not strictly needed
  total_outstanding_fees: number;
  total_paid_fees: number;
  total_payments_received: number;
  current_balance_intuitive: number;
}

interface MyBillingViewProps {
  studentId: string; // Passed from PortalDashboard
}

const MyBillingView: React.FC<MyBillingViewProps> = ({ studentId }) => {
  const [assignedFees, setAssignedFees] = useState<DisplayableStudentFeePortal[]>([]);
  const [payments, setPayments] = useState<StudentPayment[]>([]);
  const [accountBalance, setAccountBalance] = useState<StudentAccountBalancePortal | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBillingData = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    setError(null);
    try {
      // Fetch assigned fees
      const { data: feesData, error: feesError } = await supabase
        .from('student_fees')
        .select('*, fee_types (name)')
        .eq('student_id', studentId)
        .order('due_date', { ascending: true, nullsLast: true });
      if (feesError) throw feesError;
      setAssignedFees(feesData || []);

      // Fetch payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('student_payments')
        .select('*')
        .eq('student_id', studentId)
        .order('payment_date', { ascending: false });
      if (paymentsError) throw paymentsError;
      setPayments(paymentsData || []);

      // Fetch account balance from view
      const { data: balanceData, error: balanceError } = await supabase
        .from('student_account_balances_view')
        .select('*')
        .eq('student_id', studentId)
        .single();
      if (balanceError) throw balanceError;
      setAccountBalance(balanceData);

      if (feesData?.length === 0 && paymentsData?.length === 0 && !balanceData) {
        setError("No billing information available for this student.");
      }

    } catch (err: any) {
      console.error('Error fetching billing data for portal:', err);
      setError('Failed to load billing information: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchBillingData();
  }, [fetchBillingData]);

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString.includes('T') ? dateString : dateString + 'T00:00:00').toLocaleDateString();
  };

  if (loading) {
    return <p className="text-center text-gray-500 py-4">Loading billing information...</p>;
  }
  if (error && !assignedFees.length && !payments.length && !accountBalance) { // Only show main error if no data at all
    return <p className="text-center text-red-500 py-4 bg-red-100 p-3 rounded-md">{error}</p>;
  }


  return (
    <div className="p-4 md:p-6 bg-white shadow-lg rounded-lg">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 flex items-center">
          My Billing Overview
          <HelpTooltip helpKey="portal_myBilling" position="right" className="ml-2" />
        </h2>
      </div>

      {error && <p className="my-4 text-red-500 bg-red-100 p-3 rounded-md text-sm">{error}</p>}

      {/* Account Balance Summary */}
      {accountBalance && (
        <div className="mb-8 p-4 bg-indigo-50 rounded-lg shadow">
          <h3 className="text-md font-semibold text-indigo-700 mb-2">Account Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="font-medium">Total Outstanding:</span> ${Number(accountBalance.total_outstanding_fees).toFixed(2)}</div>
            <div><span className="font-medium">Total Paid Fees:</span> ${Number(accountBalance.total_paid_fees).toFixed(2)}</div>
            <div><span className="font-medium">Total Payments Made:</span> ${Number(accountBalance.total_payments_received).toFixed(2)}</div>
            <div className={`font-bold ${accountBalance.current_balance_intuitive > 0 ? 'text-red-600' : 'text-green-600'}`}>
                <span className="font-medium text-gray-700">Current Balance:</span> ${Number(accountBalance.current_balance_intuitive).toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Assigned Fees Table */}
      <div className="mb-8">
        <h3 className="text-md font-semibold text-gray-700 mb-2">Assigned Fees</h3>
        {assignedFees.length === 0 && !loading && !error ? <p className="text-sm text-gray-500">No fees currently assigned.</p> : (
          <div className="overflow-x-auto border rounded-md">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fee</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payments Table */}
      <div>
        <h3 className="text-md font-semibold text-gray-700 mb-2">Payment History</h3>
        {payments.length === 0 && !loading && !error ? <p className="text-sm text-gray-500">No payments recorded.</p> : (
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
    </div>
  );
};

export default MyBillingView;
