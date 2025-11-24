/**
 * Conditionally join class names.
 * Example:
 *   cn("p-4", isActive && "bg-blue-500") => "p-4 bg-blue-500"
 *
 * @param  {...any} classes
 * @returns {string}
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toISOString().slice(0, 10);
};

export const formatEthiopianDate = (dateStr) => {
  try {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.slice(0, 10).split("-");
    // Dynamic import to avoid circular deps in bundlers
    const { gregToEth } = require("@/lib/ethioDate.js");
    const { y: ey, m: em, d: ed } = gregToEth(Number(y), Number(m), Number(d));
    return `${ey}-${String(em).padStart(2, "0")}-${String(ed).padStart(2, "0")}`;
  } catch {
    return "";
  }
};
