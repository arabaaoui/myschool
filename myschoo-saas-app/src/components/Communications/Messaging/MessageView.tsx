import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';
import { useAuth } from '../../../App';
import { UserProfile } from '../../../types';
import HelpTooltip from '../../common/HelpTooltip';

export interface Message {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  user_profiles?: Pick<UserProfile, 'full_name' | 'email'>; // Sender's profile
}

interface MessageViewProps {
  threadId: string | null;
  onMessageSent: () => void; // Callback to refresh thread list or parent state
  participants: { id: string; name: string }[]; // For display purposes
}

const MessageView: React.FC<MessageViewProps> = ({ threadId, onMessageSent, participants }) => {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessageContent, setNewMessageContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  useEffect(scrollToBottom, [messages]);


  const fetchMessages = useCallback(async () => {
    if (!threadId) {
      setMessages([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('messages')
        .select(`
          *,
          user_profiles (full_name, email)
        `)
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;
      setMessages(data || []);
      
      // Mark messages as read (basic implementation: update last_read_at on participant record)
      if (user?.id && data && data.length > 0) {
        await supabase
          .from('message_thread_participants')
          .update({ last_read_at: new Date().toISOString(), unread_count: 0 })
          .eq('thread_id', threadId)
          .eq('user_id', user.id);
        // More complex: update message_read_statuses for each message
      }

    } catch (err: any) {
      console.error('Error fetching messages:', err);
      setError('Failed to load messages. ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [threadId, user?.id]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);
  
  // Real-time subscription for new messages (Optional - Basic Implementation)
  useEffect(() => {
    if (!threadId) return;

    const channel = supabase
      .channel(`messages-thread-${threadId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${threadId}` },
        async (payload) => {
          console.log('New message received via realtime:', payload.new);
          // Fetch sender details for the new message
          const newMessage = payload.new as Message;
          if (newMessage.sender_id !== user?.id) { // Avoid re-adding own message if client already did
            const { data: senderProfile, error: profileError } = await supabase
              .from('user_profiles')
              .select('full_name, email')
              .eq('id', newMessage.sender_id)
              .single();
            if (profileError) console.error("Error fetching sender profile for RT message", profileError);
            
            setMessages(prevMessages => [...prevMessages, { ...newMessage, user_profiles: senderProfile || undefined }]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId, user?.id]);


  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newMessageContent.trim() || !user?.id || !threadId) return;

    setSending(true);
    setError(null);
    try {
      const { data: newMessage, error: insertError } = await supabase
        .from('messages')
        .insert({
          thread_id: threadId,
          sender_id: user.id,
          content: newMessageContent.trim(),
          // tenant_id will be set by RLS policy based on sender's profile
        })
        .select(`*, user_profiles(full_name, email)`) // Select sender details too
        .single();

      if (insertError) throw insertError;

      if (newMessage) {
        setMessages(prevMessages => [...prevMessages, newMessage as Message]);
      }
      setNewMessageContent('');
      onMessageSent(); // Notify parent to potentially refresh thread list (e.g., for last message snippet)
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError('Failed to send message. ' + err.message);
    } finally {
      setSending(false);
    }
  };
  
  const getParticipantNames = (): string => {
    return participants.map(p => p.name).join(', ');
  };


  if (!threadId) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-gray-500">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
        <p>Select a conversation to view messages.</p>
      </div>
    );
  }
  
  if (loading) {
    return <div className="p-4 text-center text-gray-500">Loading messages...</div>;
  }
  if (error) {
    return <div className="p-4 text-center text-red-500 bg-red-50 rounded">{error}</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <header className="p-3 sm:p-4 border-b border-gray-200 bg-gray-50 print:hidden">
        <h2 className="font-semibold text-gray-700 truncate">
          Conversation with: {getParticipantNames()}
        </h2>
      </header>
      <div className="flex-grow p-3 sm:p-4 space-y-4 overflow-y-auto">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg shadow ${
                msg.sender_id === user?.id 
                ? 'bg-indigo-500 text-white' 
                : 'bg-gray-200 text-gray-800'
            }`}>
              <p className="text-xs font-semibold mb-0.5">
                {msg.user_profiles?.full_name || msg.user_profiles?.email || (msg.sender_id === user?.id ? (profile?.full_name || 'You') : 'Unknown User')}
              </p>
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              <p className={`text-xs mt-1 ${msg.sender_id === user?.id ? 'text-indigo-200' : 'text-gray-500'} text-right`}>
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSendMessage} className="p-3 sm:p-4 border-t border-gray-200 bg-gray-50 print:hidden">
        <div className="flex items-center space-x-2">
          <textarea
            value={newMessageContent}
            onChange={(e) => setNewMessageContent(e.target.value)}
            placeholder="Type your message..."
            rows={2}
            className="flex-grow p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm resize-none"
            disabled={sending}
          />
          <button 
            type="submit" 
            disabled={sending || !newMessageContent.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 disabled:opacity-50"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MessageView;
