let authSession = {
  token: '',
  user: null,
};

export function getAuthSession() {
  return authSession;
}

export function setAuthSession(token, user) {
  authSession = {
    token: String(token || ''),
    user: user || null,
  };

  return authSession;
}

export function clearAuthSession() {
  authSession = {
    token: '',
    user: null,
  };
}
