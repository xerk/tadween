'use client';

import { useSearchParams } from 'next/navigation';
import { FC, useCallback, useEffect } from 'react';
const ReturnUrlComponent: FC = () => {
  const params = useSearchParams();
  const url = params.get('returnUrl');
  useEffect(() => {
    if (url?.indexOf?.('http')! > -1) {
      localStorage.setItem('returnUrl', url!);
    }
  }, [url]);
  return null;
};
export const useReturnUrl = () => {
  return {
    getAndClear: useCallback(() => {
      const data = localStorage.getItem('returnUrl');
      localStorage.removeItem('returnUrl');
      // only ever back into this app, never to another site
      try {
        return data &&
          new URL(data, window.location.origin).origin ===
            window.location.origin
          ? data
          : null;
      } catch (e) {
        return null;
      }
    }, []),
  };
};
export default ReturnUrlComponent;
