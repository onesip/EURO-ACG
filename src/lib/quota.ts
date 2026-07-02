export const isQuotaExceeded = (): boolean => {
  const until = localStorage.getItem('quotaExceededUntil');
  if (!until) return false;
  
  const untilTime = parseInt(until, 10);
  if (isNaN(untilTime) || Date.now() > untilTime) {
    localStorage.removeItem('quotaExceededUntil');
    localStorage.removeItem('quotaExceeded'); // Cleanup legacy
    return false;
  }
  return true;
};

export const setQuotaExceeded = (val: boolean) => {
  if (val) {
    const fiveMinutes = 5 * 60 * 1000;
    localStorage.setItem('quotaExceededUntil', (Date.now() + fiveMinutes).toString());
  } else {
    localStorage.removeItem('quotaExceededUntil');
    localStorage.removeItem('quotaExceeded');
  }
};

export const clearQuota = () => {
  localStorage.removeItem('quotaExceededUntil');
  localStorage.removeItem('quotaExceeded');
};
