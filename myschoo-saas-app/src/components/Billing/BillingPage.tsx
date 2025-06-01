import React, { useState } from 'react';
import AssignFeeForm, { StudentFee } from './AssignFeeForm';
import RecordPaymentForm, { StudentPayment } from './RecordPaymentForm';
import StudentAccountView from './StudentAccountView';
import HelpTooltip from '../common/HelpTooltip';
import { useAuth } from '../../App';

type BillingView = 'assignFee' | 'recordPayment' | 'viewAccount';

const BillingPage: React.FC = () => {
  const { isTenantAdmin } = useAuth();
  const [currentView, setCurrentView] = useState<BillingView>('viewAccount');

  // State to refresh StudentAccountView after a fee or payment is made, if needed
  const [refreshKey, setRefreshKey] = useState(0);

  const handleFeeAssigned = (fee: StudentFee) => {
    // Optionally, you could add the new fee to a local list if displaying all fees on this page
    // For now, just refresh the StudentAccountView if it's the current view or next view
    setRefreshKey(prev => prev + 1);
  };

  const handlePaymentRecorded = (payment: StudentPayment) => {
    setRefreshKey(prev => prev + 1);
  };

  if (!isTenantAdmin) {
    return <p className="p-4 text-red-500">You do not have permission to access the billing module.</p>;
  }

  const NavButton: React.FC<{ view: BillingView; label: string; }> = ({ view, label }) => (
    <button
      onClick={() => setCurrentView(view)}
      className={`px-3 py-2 md:px-4 text-sm md:text-base rounded-md font-medium transition-colors
        ${currentView === view ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-indigo-100 hover:text-indigo-700'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div className="flex items-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Billing Management</h1>
          <HelpTooltip helpKey="billing_intro" position="right" className="ml-2" />
        </div>
      </div>

      <div className="mb-6 bg-white shadow-sm rounded-lg p-2 md:p-3">
        <nav className="flex flex-wrap items-center gap-2 md:gap-3" aria-label="Billing Navigation">
          <NavButton view="viewAccount" label="Student Accounts" />
          <NavButton view="assignFee" label="Assign Fee" />
          <NavButton view="recordPayment" label="Record Payment" />
        </nav>
      </div>

      <div className="mt-6">
        {currentView === 'assignFee' && <AssignFeeForm onFeeAssigned={handleFeeAssigned} />}
        {currentView === 'recordPayment' && <RecordPaymentForm onPaymentRecorded={handlePaymentRecorded} />}
        {currentView === 'viewAccount' && <StudentAccountView key={refreshKey} />}
      </div>
    </div>
  );
};

export default BillingPage;
