(function () {
  const SESSION_KEY = 'zandwich-user-session';
  const DEFAULT_BUDGET_KEY = 'zandwich-default-budget';
  const form = document.getElementById('auth-form');
  const modeSelect = document.getElementById('auth-mode');
  const usernameInput = document.getElementById('auth-username');
  const passwordInput = document.getElementById('auth-password');
  const submitButton = document.getElementById('auth-submit');
  const logoutButton = document.getElementById('auth-logout');
  const messageEl = document.getElementById('auth-message');
  const accountEmpty = document.getElementById('account-empty');
  const accountSummary = document.getElementById('account-summary');
  const accountUsername = document.getElementById('account-username');
  const accountRole = document.getElementById('account-role');
  const accountDetails = document.getElementById('account-details');
  const budgetInput = document.getElementById('profile-budget-input');
  const budgetSaveButton = document.getElementById('profile-budget-save');
  const budgetMessage = document.getElementById('profile-budget-message');

  if (!form) return;

  function readSession() {
    try {
      const raw = window.localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.error('Could not read session:', error);
      return null;
    }
  }

  function writeSession(user) {
    try {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Could not save session:', error);
    }
  }

  function clearSession() {
    try {
      window.localStorage.removeItem(SESSION_KEY);
    } catch (error) {
      console.error('Could not clear session:', error);
    }
  }

  function readPreferredBudget() {
    try {
      const raw = window.localStorage.getItem(DEFAULT_BUDGET_KEY);
      if (!raw) return null;
      const value = Number(raw);
      return Number.isFinite(value) && value >= 0 ? value : null;
    } catch (error) {
      console.error('Could not read preferred budget:', error);
      return null;
    }
  }

  function writePreferredBudget(value) {
    try {
      window.localStorage.setItem(DEFAULT_BUDGET_KEY, String(value));
    } catch (error) {
      console.error('Could not save preferred budget:', error);
    }
  }

  function setBudgetMessage(text, isError = false) {
    if (!budgetMessage) return;
    budgetMessage.textContent = text;
    budgetMessage.classList.toggle('auth-message-error', Boolean(isError));
  }

  function renderBudgetInput(user) {
    if (!budgetInput) return;
    const preferred = readPreferredBudget();
    const fallback = Number(user?.budget || 0);
    const value = preferred != null ? preferred : (Number.isFinite(fallback) && fallback >= 0 ? fallback : 0);
    budgetInput.value = Number(value).toFixed(2);
  }

  function setMessage(text, isError = false) {
    if (!messageEl) return;
    messageEl.textContent = text;
    messageEl.classList.toggle('auth-message-error', Boolean(isError));
  }

  function setMode(mode) {
    const nextMode = mode === 'register' ? 'register' : 'login';
    if (modeSelect) modeSelect.value = nextMode;
    if (submitButton) submitButton.textContent = nextMode === 'register' ? 'Sign Up' : 'Log In';
    if (logoutButton) logoutButton.classList.toggle('is-hidden', nextMode === 'register');
  }

  function renderAccount(user) {
    const signedIn = Boolean(user && user.username);
    if (accountEmpty) accountEmpty.classList.toggle('is-hidden', signedIn);
    if (accountSummary) accountSummary.classList.toggle('is-hidden', !signedIn);
    if (logoutButton) logoutButton.classList.toggle('is-hidden', !signedIn);

    if (!signedIn) {
      if (accountUsername) accountUsername.textContent = 'Guest';
      if (accountRole) accountRole.textContent = 'No role yet';
      if (accountDetails) accountDetails.textContent = 'Log in or sign up to save your account session on this device.';
      return;
    }

    if (accountUsername) accountUsername.textContent = user.username || 'Guest';
    if (accountRole) accountRole.textContent = (user.role || 'customer').toUpperCase();
    if (accountDetails) {
      const preferredBudget = readPreferredBudget();
      const budget = Number(preferredBudget != null ? preferredBudget : user.budget || 0).toFixed(2);
      const addresses = Array.isArray(user.addresses) ? user.addresses.length : 0;
      const orders = Array.isArray(user.orders) ? user.orders.length : 0;
      accountDetails.textContent = `Budget: R${budget} · Addresses: ${addresses} · Orders: ${orders}`;
    }

    renderBudgetInput(user);
  }

  function getInitialMode() {
    try {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get('mode');
      return mode === 'register' ? 'register' : 'login';
    } catch (error) {
      return 'login';
    }
  }

  function savePreferredBudget() {
    if (!budgetInput) return;
    const value = Number(String(budgetInput.value || '').trim());
    if (!Number.isFinite(value) || value < 0) {
      setBudgetMessage('Enter a valid budget amount (0 or higher).', true);
      return;
    }

    const rounded = Number(value.toFixed(2));
    writePreferredBudget(rounded);
    budgetInput.value = rounded.toFixed(2);

    const session = readSession();
    if (session && session.username) {
      const next = { ...session, budget: rounded };
      writeSession(next);
      renderAccount(next);
    }

    setBudgetMessage(`Default budget saved: R${rounded.toFixed(2)}`);
  }

  async function submitAuth(event) {
    event.preventDefault();

    const username = String(usernameInput?.value || '').trim();
    const password = String(passwordInput?.value || '').trim();
    const mode = modeSelect?.value === 'register' ? 'register' : 'login';

    if (!username || !password) {
      setMessage('Enter both a username and password.', true);
      return;
    }

    const endpoint = mode === 'register' ? 'users/register' : 'users/login';
    setMessage(mode === 'register' ? 'Creating your account...' : 'Checking your details...');

    try {
      const response = window.ZAndwichApi?.requestJson
        ? await window.ZAndwichApi.requestJson(endpoint, {
            method: 'POST',
            body: JSON.stringify({ username, password })
          })
        : await fetch(`http://localhost:3000/api/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
          }).then(async res => {
            const payload = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(payload.message || 'Request failed');
            return payload;
          });

      const user = response.user || null;
      if (!user) throw new Error('No user data returned');

      writeSession(user);
      renderAccount(user);
      setMessage(mode === 'register' ? 'Account created. You are signed in.' : 'Login successful.');
      setMode('login');
      passwordInput.value = '';
    } catch (error) {
      console.error(error);
      setMessage(error.message || 'Authentication failed.', true);
    }
  }

  function logout() {
    clearSession();
    renderAccount(null);
    setMessage('Logged out.');
  }

  const savedUser = readSession();
  renderAccount(savedUser);
  renderBudgetInput(savedUser);
  setMode(getInitialMode());
  if (savedUser) setMessage(`Signed in as ${savedUser.username}.`);

  form.addEventListener('submit', submitAuth);
  modeSelect?.addEventListener('change', () => {
    setMode(modeSelect.value);
    setMessage('');
  });
  logoutButton?.addEventListener('click', logout);
  budgetSaveButton?.addEventListener('click', savePreferredBudget);
  budgetInput?.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      savePreferredBudget();
    }
  });
})();
