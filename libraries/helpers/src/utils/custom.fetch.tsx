'use client';

import {
  createContext,
  FC,
  ReactNode,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  customFetch,
  nonSecuredAuthHeaders,
  Params,
} from './custom.fetch.func';
import { useVariables } from '@gitroom/react/helpers/variable.context';

const FetchProvider = createContext(
  customFetch(
    // @ts-ignore
    {
      baseUrl: '',
      beforeRequest: () => {},
      afterRequest: () => {
        return true;
      },
    } as Params
  )
);

export const FetchWrapperComponent: FC<Params & { children: ReactNode }> = (
  props
) => {
  const { children, ...params } = props;
  const { isSecured } = useVariables();
  // @ts-ignore
  const fetchData = useRef(
    customFetch(params, undefined, undefined, isSecured)
  );
  return (
    // @ts-ignore
    <FetchProvider.Provider value={fetchData.current}>
      {children}
    </FetchProvider.Provider>
  );
};

export const useFetch = () => {
  return useContext(FetchProvider);
};

// How CopilotKit should reach the backend, matching customFetch: cookies with
// credentials normally, the session headers when NOT_SECURED.
export const useCopilotConnection = ():
  | { credentials: RequestCredentials }
  | { headers: Record<string, string> } => {
  const { isSecured } = useVariables();
  return useMemo(
    () =>
      isSecured
        ? { credentials: 'include' as const }
        : { headers: nonSecuredAuthHeaders() },
    [isSecured]
  );
};
