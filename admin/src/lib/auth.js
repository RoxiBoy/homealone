const TOKEN_KEY = 'homealone.admin.token';
const USER_KEY = 'homealone.admin.user';

export function storeAdminSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getStoredAdminSession() {
  const token = localStorage.getItem(TOKEN_KEY);
  const rawUser = localStorage.getItem(USER_KEY);

  if (!token || !rawUser) {
    return { token: null, user: null };
  }

  try {
    return {
      token,
      user: JSON.parse(rawUser),
    };
  } catch {
    clearStoredAdminSession();
    return { token: null, user: null };
  }
}

export function clearStoredAdminSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
