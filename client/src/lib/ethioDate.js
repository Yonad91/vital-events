export function ethToGreg(ethY, ethM, ethD) {
  try {
    const baseEth = new Date(Date.UTC(2007, 8, 12)); // 2000-01-01 EC ≈ 2007-09-12 GC
    const y = Number(ethY), m = Number(ethM), d = Number(ethD);
    if (!y || !m || !d) return "";
    const years = y - 2000;
    const leapDays = Math.floor((years + 3) / 4);
    const days = years * 365 + leapDays + (m - 1) * 30 + (d - 1);
    const gc = new Date(baseEth.getTime() + days * 86400000);
    return gc.toISOString().slice(0, 10);
  } catch { return ""; }
}

export function gregToEth(gY, gM, gD) {
  try {
    const baseEth = new Date(Date.UTC(2007, 8, 12));
    const gc = new Date(Date.UTC(Number(gY), Number(gM) - 1, Number(gD)));
    const days = Math.round((gc - baseEth) / 86400000);
    const years = Math.floor(days / 1461) * 4;
    const remYearsDays = days - years * 365 - Math.floor((years + 3) / 4);
    const y = 2000 + years + Math.floor(remYearsDays / 365);
    const rem = remYearsDays % 365;
    const m = Math.floor(rem / 30) + 1;
    const d = (rem % 30) + 1;
    return { y: String(y), m: String(m), d: String(d) };
  } catch { return { y: "", m: "", d: "" }; }
}

/**
 * Get the current date in Ethiopian calendar format
 * Returns an object with year, month, day as strings
 * Format: { year: "2016", month: "3", day: "15" }
 */
export function getCurrentEthiopianDate() {
  try {
    const now = new Date();
    const gY = now.getFullYear();
    const gM = now.getMonth() + 1; // JavaScript months are 0-indexed
    const gD = now.getDate();
    return gregToEth(gY, gM, gD);
  } catch {
    return { y: "", m: "", d: "" };
  }
}

/**
 * Check if an Ethiopian date is in the future
 * @param {Object} ethDate - Ethiopian date object with year, month, day properties
 * @returns {boolean} - true if the date is in the future, false otherwise
 */
export function isEthiopianDateInFuture(ethDate) {
  try {
    if (!ethDate || !ethDate.year || !ethDate.month || !ethDate.day) {
      return false; // Incomplete date, don't consider it future
    }

    const currentEth = getCurrentEthiopianDate();
    if (!currentEth.y || !currentEth.m || !currentEth.d) {
      return false; // Can't determine current date
    }

    const ethYear = Number(ethDate.year);
    const ethMonth = Number(ethDate.month);
    const ethDay = Number(ethDate.day);
    const currYear = Number(currentEth.y);
    const currMonth = Number(currentEth.m);
    const currDay = Number(currentEth.d);

    if (isNaN(ethYear) || isNaN(ethMonth) || isNaN(ethDay)) {
      return false;
    }

    // Compare dates: year first, then month, then day
    if (ethYear > currYear) return true;
    if (ethYear < currYear) return false;
    if (ethMonth > currMonth) return true;
    if (ethMonth < currMonth) return false;
    if (ethDay > currDay) return true;
    return false; // Same date or past date
  } catch {
    return false;
  }
}