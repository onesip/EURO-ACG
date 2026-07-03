export const isQuotaExceeded = (): boolean => {
  // Disable quota lockout since the project is on the Blaze plan
  localStorage.removeItem('quotaExceededUntil');
  localStorage.removeItem('quotaExceeded');
  return false;
};

export const setQuotaExceeded = (val: boolean) => {
  // No-op: Do not set quota lockouts
  localStorage.removeItem('quotaExceededUntil');
  localStorage.removeItem('quotaExceeded');
};

export const clearQuota = () => {
  localStorage.removeItem('quotaExceededUntil');
  localStorage.removeItem('quotaExceeded');
};
