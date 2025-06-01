import React from 'react';
import { MarkingPeriod } from './MarkingPeriodForm';
import { AcademicYear } from '../AcademicYears/AcademicYearForm';
import HelpTooltip from '../../common/HelpTooltip';

interface MarkingPeriodListProps {
  periods: MarkingPeriod[];
  academicYears: AcademicYear[];
  allMarkingPeriods: MarkingPeriod[]; // For resolving parent period names
  onEdit: (period: MarkingPeriod) => void;
  onDelete: (periodId: string) => void;
  loading?: boolean;
  error?: string | null;
}

const MarkingPeriodList: React.FC<MarkingPeriodListProps> = ({
  periods,
  academicYears,
  allMarkingPeriods,
  onEdit,
  onDelete,
  loading,
  error,
}) => {
  const getAcademicYearName = (academicYearId: string) => {
    const ay = academicYears.find(ay => ay.id === academicYearId);
    return ay ? ay.name : 'Unknown Academic Year';
  };

  const getParentPeriodName = (parentId?: string | null) => {
    if (!parentId) return 'N/A';
    const parent = allMarkingPeriods.find(mp => mp.id === parentId);
    return parent ? parent.name : 'Unknown Parent';
  };

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };


  if (loading) {
    return <p className="text-center text-gray-500 py-4 text-sm md:text-base">Loading marking periods...</p>;
  }

  if (error) {
    return <p className="text-center text-red-500 py-4 bg-red-100 rounded text-sm md:text-base">{error}</p>;
  }

  if (periods.length === 0) {
    return <p className="text-center text-gray-500 py-4 text-sm md:text-base">No marking periods found. Add one to get started!</p>;
  }

  return (
    <div className="overflow-x-auto bg-white shadow-md rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name / Short Name</th>
            <th scope="col" className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Academic Year</th>
            <th scope="col" className="hidden md:table-cell px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates (Start - End)</th>
            <th scope="col" className="hidden lg:table-cell px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type / Parent</th>
            <th scope="col" className="relative px-4 py-2 sm:px-6 sm:py-3"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {periods.map((period) => (
            <tr key={period.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{period.name}</div>
                <div className="text-xs text-gray-500">{period.short_name || 'N/A'}</div>
              </td>
              <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-normal break-words text-sm text-gray-500">
                {getAcademicYearName(period.academic_year_id)}
              </td>
              <td className="hidden md:table-cell px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDate(period.start_date)} - {formatDate(period.end_date)}
              </td>
              <td className="hidden lg:table-cell px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-500">
                <div>Type: {period.type || 'N/A'}</div>
                <div>Parent: {getParentPeriodName(period.parent_marking_period_id)}</div>
              </td>
              <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end space-x-1">
                  <button
                    onClick={() => onEdit(period)}
                    className="text-indigo-600 hover:text-indigo-900 p-1"
                    title="Edit Marking Period"
                  >
                    Edit
                  </button>
                  <HelpTooltip helpKey="markingPeriodList_editButton" position="left" className="inline-flex" />
                </div>
                <div className="flex items-center justify-end space-x-1 mt-1">
                  <button
                    onClick={() => period.id && onDelete(period.id)}
                    className="text-red-600 hover:text-red-900 p-1"
                    title="Delete Marking Period"
                    disabled={!period.id}
                  >
                    Delete
                  </button>
                  <HelpTooltip helpKey="markingPeriodList_deleteButton" position="left" className="inline-flex" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MarkingPeriodList;
