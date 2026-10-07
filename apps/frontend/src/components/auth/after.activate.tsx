'use client';

import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import useCookie from 'react-use-cookie';
import { AuthHeading } from '@gitroom/frontend/components/tadween/auth/auth.parts';
export const AfterActivate = () => {
  const fetch = useFetch();
  const params = useParams();
  const [showLoader, setShowLoader] = useState(true);
  const run = useRef(false);
  const t = useT();
  const [datafast_visitor_id] = useCookie('datafast_visitor_id');

  useEffect(() => {
    if (!run.current) {
      run.current = true;
      loadCode();
    }
  }, []);
  const loadCode = useCallback(async () => {
    if (params.code) {
      const response = await fetch(`/auth/activate`, {
        method: 'POST',
        body: JSON.stringify({
          code: params.code,
          datafast_visitor_id,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.headers.get('onboarding')) {
        return;
      }
      const { can } = await response.json();
      if (!can) {
        setShowLoader(false);
      }
    }
  }, []);
  return (
    <>
      {showLoader ? (
        <div className="tdw-auth-spinner">
          <LoadingComponent />
        </div>
      ) : (
        <>
          <AuthHeading
            title={t('tdw_auth_already_active_title', 'You are all set')}
            subtitle={t(
              'tdw_auth_already_active_subtitle',
              'This account is already activated. Sign in to continue.'
            )}
          />
          <Link href="/auth/login" className="pz-btn pz-btn-primary tdw-auth-submit">
            {t('go_to_login', 'Go to Login')}
          </Link>
        </>
      )}
    </>
  );
};
