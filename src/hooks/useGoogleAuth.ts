import { useState, useEffect } from 'react';

interface GoogleCredentialResponse {
  credential?: string;
  clientId?: string;
  select_by?: string;
}

interface UseGoogleAuthProps {
  clientId: string;
  onSuccess: (response: GoogleCredentialResponse) => void;
  onError: () => void;
}

export const useGoogleAuth = ({ clientId, onSuccess, onError }: UseGoogleAuthProps) => {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  useEffect(() => {
    // Prevent loading the script multiple times
    if (document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
      setIsScriptLoaded(true);
      return;
    }

    // Create the script element
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    
    // Callback when script successfully loads
    script.onload = () => {
      setIsScriptLoaded(true);
      
      // Initialize the Google Identity Services instance
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: onSuccess,
        });
      }
    };
    
    script.onerror = () => {
      console.error('Failed to load Google Identity Services script');
      onError();
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup script tag on unmount if needed
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [clientId, onSuccess, onError]);

  const renderGoogleButton = (elementId: string) => {
    if (isScriptLoaded && window.google) {
      window.google.accounts.id.renderButton(
        document.getElementById(elementId) as HTMLElement,
        { theme: 'outline', size: 'large', width: '100%', text: 'continue_with' } // Customize button styling here
      );
    }
  };

  return { isScriptLoaded, renderGoogleButton };
};

// Add typescript declaration for window.google
declare global {
  interface Window {
    google?: any;
  }
}
