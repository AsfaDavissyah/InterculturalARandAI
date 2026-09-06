const SESSION_STORAGE_KEY = 'engora_auth_session';

function emptySession() {
  return {
    token: '',
    user: null,
  };
}

function readStoredSession() {
  try {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) return emptySession();

    const parsed = JSON.parse(stored);
    if (!parsed?.token || !parsed?.user) return emptySession();

    return {
      token: String(parsed.token),
      user: parsed.user,
    };
  } catch {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    return emptySession();
  }
}

let authSession = readStoredSession();

export function getAuthSession() {
  return authSession;
}

export function setAuthSession(token, user) {
  authSession = {
    token: String(token || ''),
    user: user || null,
  };

  if (authSession.token && authSession.user) {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(authSession));
  } else {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }

  return authSession;
}

export function clearAuthSession() {
  authSession = emptySession();
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
}
