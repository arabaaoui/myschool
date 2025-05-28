import React, { useState } from 'react';
import SignUpForm from './SignUpForm';
import LoginForm from './LoginForm';

const AuthPage: React.FC = () => {
  const [showLogin, setShowLogin] = useState(true);

  return (
    <div className="container mx-auto p-4 max-w-sm">
      {showLogin ? (
        <>
          <LoginForm />
          <p className="mt-4 text-center">
            Don't have an account?{' '}
            <button
              onClick={() => setShowLogin(false)}
              className="text-blue-500 hover:underline"
            >
              Sign Up
            </button>
          </p>
        </>
      ) : (
        <>
          <SignUpForm />
          <p className="mt-4 text-center">
            Already have an account?{' '}
            <button
              onClick={() => setShowLogin(true)}
              className="text-blue-500 hover:underline"
            >
              Login
            </button>
          </p>
        </>
      )}
    </div>
  );
};

export default AuthPage;
