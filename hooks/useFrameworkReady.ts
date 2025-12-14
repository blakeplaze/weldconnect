import { useEffect } from 'react';
<<<<<<< HEAD
import { Platform } from 'react-native';
=======
>>>>>>> 79fb8c9f9b70f413c4fced27192deaabf900ebd5

declare global {
  interface Window {
    frameworkReady?: () => void;
  }
}

export function useFrameworkReady() {
  useEffect(() => {
<<<<<<< HEAD
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.frameworkReady?.();
    }
=======
    window.frameworkReady?.();
>>>>>>> 79fb8c9f9b70f413c4fced27192deaabf900ebd5
  });
}
