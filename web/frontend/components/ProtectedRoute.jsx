/**
 * Higher-order component that protects routes requiring authentication
 * Since authentication is handled by backend middleware, this component
 * simply renders children if the user reaches it
 */
export function ProtectedRoute({ children }) {
  // User is authenticated (handled by backend), render the protected content
  return children;
}
