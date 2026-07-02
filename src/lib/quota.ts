export const isQuotaExceeded = () => localStorage.getItem('quotaExceeded') === 'true';
export const setQuotaExceeded = (val: boolean) => localStorage.setItem('quotaExceeded', val.toString());
