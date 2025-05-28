import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // const [message, setMessage] = useState<string | null>(null); // Not typically needed for login

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    // setMessage(null);
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else if (data.user) {
      // setMessage('Login successful!'); // Handled by App.tsx redirecting or updating UI
      console.log('Logged in user:', data.user);
      // Access custom claims if available (demonstration for step 6)
      // This is a simplified example. In a real app, you'd likely refresh the session
      // or rely on onAuthStateChange to provide the user object with fresh claims.
      const session = data.session;
      if (session?.access_token) {
        try {
          const jwtPayload = JSON.parse(atob(session.access_token.split('.')[1]));
          console.log('Custom claims from JWT:', {
            tenant_id: jwtPayload.tenant_id,
            role: jwtPayload.role,
            // Supabase adds app_metadata and user_metadata for custom claims set via admin SDK or functions
            app_metadata_tenant_id: jwtPayload.app_metadata?.tenant_id,
            app_metadata_role: jwtPayload.app_metadata?.role,
          });
        } catch (e) {
          console.error('Error decoding JWT or accessing claims:', e);
        }
      }
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <h2 className="text-2xl font-semibold text-center">Login</h2>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {/* {message && <p className="text-green-500 text-sm">{message}</p>} */}
      <div>
        <label
          htmlFor="email-login"
          className="block text-sm font-medium text-gray-700"
        >
          Email
        </label>
        <input
          id="email-login"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>
      <div>
        <label
          htmlFor="password-login"
          className="block text-sm font-medium text-gray-700"
        >
          Password
        </label>
        <input
          id="password-login"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
      >
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
};

export default LoginForm;
