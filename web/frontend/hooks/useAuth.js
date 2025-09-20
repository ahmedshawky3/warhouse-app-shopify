import { useState, useEffect } from 'react';

/**
 * Custom hook to handle authentication state
 * Checks if user is authenticated by making a test API call
 */
export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setError(null);
        
        // Try to make an authenticated API call to verify session
        const response = await fetch("/api/products", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          setIsAuthenticated(true);
        } else if (response.status === 401 || response.status === 403) {
          // Not authenticated, redirect to OAuth
          const urlParams = new URLSearchParams(window.location.search);
          const shop = urlParams.get('shop') || '';
          window.location.href = `/api/auth?shop=${shop}`;
          return;
        } else {
          // Other error
          setError(`Authentication check failed: ${response.status}`);
          console.error('Authentication check failed:', response.status);
        }
      } catch (error) {
        console.error('Authentication check error:', error);
        setError(error.message);
        
        // Network error, might be OAuth redirect needed
        const urlParams = new URLSearchParams(window.location.search);
        const shop = urlParams.get('shop');
        if (shop) {
          window.location.href = `/api/auth?shop=${shop}`;
          return;
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const logout = () => {
    setIsAuthenticated(false);
    // Redirect to OAuth to get new session
    const urlParams = new URLSearchParams(window.location.search);
    const shop = urlParams.get('shop') || '';
    window.location.href = `/api/auth?shop=${shop}`;
  };

  return {
    isAuthenticated,
    isLoading,
    error,
    logout
  };
}
