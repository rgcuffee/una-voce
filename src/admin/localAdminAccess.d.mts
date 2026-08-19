export const LOCAL_ADMIN_SECRET_KEY: string;

export function localPasswordModeEnabled(dev: boolean): boolean;

export interface LocalAdminStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function readLocalAdminPassword(storage: LocalAdminStorage): string;
export function storeLocalAdminPassword(
  storage: LocalAdminStorage,
  password: string,
): void;
export function clearLocalAdminPassword(storage: LocalAdminStorage): void;

export function validateLocalAdminPassword(options: {
  dev: boolean;
  password: string;
  fetchImpl?: typeof fetch;
  endpoint?: string;
}): Promise<boolean>;
