import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import { useAuth } from '../../../App';
import { UserProfile } from '../../../types';
import HelpTooltip from '../../common/HelpTooltip';

interface StartNewMessageFormProps {
  onNewThreadCreated: (threadId: string) => void; // Callback with the new thread ID
  onCancel: () => void;
}

const StartNewMessageForm: React.FC<StartNewMessageFormProps> = ({ onNewThreadCreated, onCancel }) => {
  const { user, profile } = useAuth();
  const [recipientId, setRecipientId] = useState<string>('');
  const [messageContent, setMessageContent] = useState('');
  const [subject, setSubject] = useState(''); // Optional subject

  const [potentialRecipients, setPotentialRecipients] = useState<UserProfile[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!user?.id || !profile?.tenant_id) return;
      setLoadingUsers(true);
      try {
        const { data, error: usersError } = await supabase
          .from('user_profiles')
          .select('id, full_name, email, role')
          .eq('tenant_id', profile.tenant_id) // Users in the same tenant
          .neq('id', user.id) // Exclude self
          .eq('is_active', true) // Only active users
          .order('full_name', { ascending: true });
        if (usersError) throw usersError;
        setPotentialRecipients(data || []);
      } catch (err: any) {
        setError('Failed to load users: ' + err.message);
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, [user?.id, profile?.tenant_id]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!recipientId || !messageContent.trim() || !user?.id || !profile?.tenant_id) {
      setError("Recipient and message content are required.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // Check if a 2-person thread already exists between these users
      // This requires a more complex query or a plpgsql function.
      // For simplicity, this example will create a new thread each time.
      // A more robust solution would find_or_create_thread.

      // 1. Create the message thread
      const { data: threadData, error: threadError } = await supabase
        .from('message_threads')
        .insert({
            tenant_id: profile.tenant_id,
            subject: subject.trim() === '' ? null : subject.trim(),
            updated_at: new Date().toISOString() // Set initial updated_at
        })
        .select()
        .single();
      if (threadError) throw threadError;
      const newThreadId = threadData.id;

      // 2. Add participants (sender and recipient)
      const participantsData = [
        { thread_id: newThreadId, user_id: user.id, tenant_id: profile.tenant_id },
        { thread_id: newThreadId, user_id: recipientId, tenant_id: profile.tenant_id, unread_count: 1 }, // Recipient gets 1 unread
      ];
      const { error: participantsError } = await supabase
        .from('message_thread_participants')
        .insert(participantsData);
      if (participantsError) throw participantsError;

      // 3. Add the first message
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          thread_id: newThreadId,
          sender_id: user.id,
          content: messageContent.trim(),
          tenant_id: profile.tenant_id,
        });
      if (messageError) throw messageError;

      alert('Message sent and new conversation started!');
      onNewThreadCreated(newThreadId); // Notify parent to switch to this thread
      // Reset form
      setRecipientId('');
      setMessageContent('');
      setSubject('');

    } catch (err: any) {
      console.error('Error starting new message:', err);
      setError(err.message || 'Failed to start new conversation.');
    } finally {
      setLoading(false);
    }
  };

  if (loadingUsers) {
    return <p className="p-4 text-center text-gray-500">Loading potential recipients...</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 sm:p-6 bg-white shadow-lg rounded-lg max-w-xl mx-auto">
      <h2 className="text-xl font-semibold text-gray-800">Start New Conversation</h2>
      {error && <p className="text-red-500 text-sm bg-red-100 p-3 rounded-md">{error}</p>}

      <div>
        <label htmlFor="recipient_id" className="flex items-center text-sm font-medium text-gray-700">
          To: <span className="text-red-500 ml-1">*</span>
          <HelpTooltip helpKey="messaging_selectRecipient" />
        </label>
        <select
            id="recipient_id"
            value={recipientId}
            onChange={(e) => setRecipientId(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        >
          <option value="">-- Select Recipient --</option>
          {potentialRecipients.map(p => (
            <option key={p.id} value={p.id!}>{p.full_name || p.email} ({p.role})</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="subject_message" className="flex items-center text-sm font-medium text-gray-700">
          Subject (Optional)
          <HelpTooltip helpKey="messaging_subject" />
        </label>
        <input
            type="text"
            id="subject_message"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Conversation subject"
        />
      </div>


      <div>
        <label htmlFor="message_content" className="flex items-center text-sm font-medium text-gray-700">
          Message <span className="text-red-500 ml-1">*</span>
           <HelpTooltip helpKey="messaging_content" />
        </label>
        <textarea
            id="message_content"
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            required
            rows={5}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Type your first message..."
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-end sm:space-x-3 pt-2 space-y-2 sm:space-y-0">
        <button type="button" onClick={onCancel} className="w-full sm:w-auto btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={loading || loadingUsers} className="w-full sm:w-auto btn-primary disabled:opacity-50">
          {loading ? 'Sending...' : 'Send Message & Start Conversation'}
        </button>
      </div>
       <style jsx>{`
        .btn-primary {
          display: inline-flex; justify-content: center; align-items: center;
          padding-left: 1rem; padding-right: 1rem; padding-top: 0.5rem; padding-bottom: 0.5rem;
          border-width: 1px; border-color: transparent;
          border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
          font-size: 0.875rem; line-height: 1.25rem; font-weight: 500;
          color: white; background-color: #4f46e5; /* indigo-600 */
        }
        .btn-primary:hover { background-color: #4338ca; /* indigo-700 */ }
        .btn-secondary {
          display: inline-flex; justify-content: center; align-items: center;
          padding-left: 1rem; padding-right: 1rem; padding-top: 0.5rem; padding-bottom: 0.5rem;
          border-width: 1px; border-color: #D1D5DB; /* gray-300 */
          border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
          font-size: 0.875rem; line-height: 1.25rem; font-weight: 500;
          color: #374151; /* gray-700 */ background-color: white;
        }
        .btn-secondary:hover { background-color: #F9FAFB; /* gray-50 */ }
      `}</style>
    </form>
  );
};

export default StartNewMessageForm;
