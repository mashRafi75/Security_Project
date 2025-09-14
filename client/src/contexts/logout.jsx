import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';

/**
 * Custom hook for handling logout functionality
 * @returns {Function} logout function
 */
export const useLogout = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  /**
   * Handles the logout process
   * @param {Function} [cleanup] Optional cleanup function to run before logout
   * @returns {Promise<{success: boolean, error?: string}>} Result object
   */
  const handleLogout = async (cleanup) => {
    try {
      // Run cleanup if provided (for video session cleanup)
      if (cleanup && typeof cleanup === 'function') {
        cleanup();
      }

      // Perform logout
      await logout();
      
      // Redirect to login page
      navigate('/login');
      
      return { success: true };
    } catch (error) {
      console.error('Logout failed:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to logout. Please try again.' 
      };
    }
  };

  return handleLogout;
};