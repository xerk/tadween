export interface Params {
  baseUrl: string;
  beforeRequest?: (url: string, options: RequestInit) => Promise<RequestInit>;
  afterRequest?: (
    url: string,
    options: RequestInit,
    response: Response
  ) => Promise<boolean>;
}
// With NOT_SECURED the session lives in readable cookies and travels in
// headers instead of credentialed requests (the backend's CORS doesn't allow
// credentials then).
const nonSecuredCookie = (name: string) =>
  typeof document === 'undefined'
    ? null
    : document.cookie
        .split(';')
        .find((p) => p.includes(`${name}=`))
        ?.split('=')[1];

// The same session headers, for clients that don't go through customFetch.
export const nonSecuredAuthHeaders = (): Record<string, string> => {
  const auth = nonSecuredCookie('auth');
  const showorg = nonSecuredCookie('showorg');
  const impersonate = nonSecuredCookie('impersonate');
  return {
    ...(auth ? { auth } : {}),
    ...(showorg ? { showorg } : {}),
    ...(impersonate ? { impersonate } : {}),
  };
};

export const customFetch = (
  params: Params,
  auth?: string,
  showorg?: string,
  secured: boolean = true
) => {
  return async function newFetch(url: string, options: RequestInit = {}) {
    const loggedAuth =
      typeof window === 'undefined'
        ? undefined
        : new URL(window.location.href).searchParams.get('loggedAuth');
    const newRequestObject = await params?.beforeRequest?.(url, options);
    const authNonSecuredCookie = nonSecuredCookie('auth');
    const authNonSecuredOrg = nonSecuredCookie('showorg');
    const authNonSecuredImpersonate = nonSecuredCookie('impersonate');

    const fetchRequest = await fetch(params.baseUrl + url, {
      ...(secured ? { credentials: 'include' } : {}),
      ...(newRequestObject || options),
      headers: {
        ...(showorg
          ? { showorg }
          : authNonSecuredOrg
          ? { showorg: authNonSecuredOrg }
          : {}),
        ...(options.body instanceof FormData
          ? {}
          : { 'Content-Type': 'application/json' }),
        Accept: 'application/json',
        ...(loggedAuth ? { auth: loggedAuth } : {}),
        ...options?.headers,
        ...(auth
          ? { auth }
          : authNonSecuredCookie
          ? { auth: authNonSecuredCookie }
          : {}),
        ...(authNonSecuredImpersonate
          ? { impersonate: authNonSecuredImpersonate }
          : {}),
      },
      // @ts-ignore
      ...(!options.next && options.cache !== 'force-cache'
        ? { cache: options.cache || 'no-store' }
        : {}),
    });

    if (
      !params?.afterRequest ||
      (await params?.afterRequest?.(url, options, fetchRequest))
    ) {
      return fetchRequest;
    }

    // @ts-ignore
    return new Promise((res) => {}) as Response;
  };
};

export const fetchBackend = customFetch({
  get baseUrl() {
    return process.env.BACKEND_URL!;
  },
});
