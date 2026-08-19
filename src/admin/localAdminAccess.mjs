export const LOCAL_ADMIN_SECRET_KEY = 'una-voce-admin-secret';

export function localPasswordModeEnabled(dev) {
  return dev === true;
}

export function readLocalAdminPassword(storage) {
  return storage.getItem(LOCAL_ADMIN_SECRET_KEY) ?? '';
}

export function storeLocalAdminPassword(storage, password) {
  const normalized = password.trim();

  if (normalized) {
    storage.setItem(LOCAL_ADMIN_SECRET_KEY, normalized);
  } else {
    storage.removeItem(LOCAL_ADMIN_SECRET_KEY);
  }
}

export function clearLocalAdminPassword(storage) {
  storage.removeItem(LOCAL_ADMIN_SECRET_KEY);
}

export async function validateLocalAdminPassword({
  dev,
  password,
  fetchImpl = fetch,
  endpoint = '/api/admin/partners',
}) {
  const normalized = password.trim();

  if (!localPasswordModeEnabled(dev) || !normalized) {
    return false;
  }

  try {
    const response = await fetchImpl(endpoint, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'x-admin-secret': normalized,
      },
    });

    return response.ok;
  } catch {
    return false;
  }
}
