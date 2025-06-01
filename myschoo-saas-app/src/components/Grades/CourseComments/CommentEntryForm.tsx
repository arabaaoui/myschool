import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import HelpTooltip from '../../common/HelpTooltip';
import { useAuth } from '../../../App';

export interface ReportCardCourseComment {
  id?: string;
  tenant_id?: string;
  student_id: string;
  course_period_id: string;
  marking_period_id: string;
  comment?: string | null;
  created_by_user_id?: string | null;
}

interface CommentEntryFormProps {
  studentId: string;
  studentName: string;
  coursePeriodId: string;
  markingPeriodId: string;
  existingComment?: ReportCardCourseComment | null;
  onSave: (comment: ReportCardCourseComment) => void;
  onCancel?: () => void; // Optional: if used in a modal or separate view
}

const CommentEntryForm: React.FC<CommentEntryFormProps> = ({
  studentId,
  studentName,
  coursePeriodId,
  markingPeriodId,
  existingComment,
  onSave,
  onCancel,
}) => {
  const { user } = useAuth();
  const [commentText, setCommentText] = useState<string>(existingComment?.comment || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setCommentText(existingComment?.comment || '');
  }, [existingComment]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user?.id) {
      setError("User not authenticated.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const commentData: Omit<ReportCardCourseComment, 'id' | 'tenant_id' | 'created_at' | 'updated_at'> = {
        student_id: studentId,
        course_period_id: coursePeriodId,
        marking_period_id: markingPeriodId,
        comment: commentText.trim() === '' ? null : commentText.trim(),
        created_by_user_id: user.id, // Will be updated on each save by the current user
      };

      let savedData: ReportCardCourseComment;

      if (existingComment?.id) {
        // Update existing comment
        const { data, error: updateError } = await supabase
          .from('report_card_course_comments')
          .update({ comment: commentData.comment, updated_at: new Date().toISOString(), created_by_user_id: user.id })
          .eq('id', existingComment.id)
          .select()
          .single();
        if (updateError) throw updateError;
        savedData = data as ReportCardCourseComment;
      } else {
        // Insert new comment (or upsert if preferred for simplicity, though unique constraint handles it)
        const { data, error: insertError } = await supabase
          .from('report_card_course_comments')
          .upsert(commentData, {
            onConflict: 'tenant_id, student_id, course_period_id, marking_period_id',
            // ignoreDuplicates: false // Default, will update on conflict
          })
          .select()
          .single();
        if (insertError) throw insertError;
        savedData = data as ReportCardCourseComment;
      }
      onSave(savedData);
      setSuccessMessage('Comment saved successfully!');
    } catch (err: any) {
      console.error('Error saving comment:', err);
      setError(err.message || 'Failed to save comment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 p-4 border border-gray-300 rounded-lg bg-gray-50">
      <h5 className="text-md font-semibold text-gray-700 mb-2">
        Comment for: <span className="text-indigo-600">{studentName}</span>
      </h5>
      {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
      {successMessage && <p className="text-green-600 text-sm mb-2">{successMessage}</p>}

      <textarea
        name="comment"
        value={commentText}
        onChange={(e) => setCommentText(e.target.value)}
        rows={4}
        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        placeholder="Enter comment for report card..."
      />
      <div className="mt-3 flex justify-end space-x-2">
        {onCancel && (
            <button type="button" onClick={onCancel} className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                Cancel
            </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Comment'}
          <HelpTooltip helpKey="courseComments_saveButton" position="top" className="ml-1" />
        </button>
      </div>
    </form>
  );
};

export default CommentEntryForm;
