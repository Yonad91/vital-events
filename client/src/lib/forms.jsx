// Shared form schema to ensure identical forms across dashboards (Amharic-first)

import React from "react";

export const INITIAL_FORM_STATE = {
  type: "birth",
  registrationId: "",
  // ...existing code...
};

export const FORM_CONFIG = {
  // ...existing code...
};

// Ethiopian Date Picker (reusable for forms)
const ETH_MONTHS = [
  "መስከረም", "ጥቅምት", "ኅዳር", "ታኅሣሥ", "ጥር", "የካቲት", "መጋቢት", "ሚያዝያ", "ግንቦት", "ሰኔ", "ሐምሌ", "ነሐሴ", "ጳጉሜን"
];
export function EthiopianDatePicker({ value, onChange, name, id, hasError, errorMessage }) {
  const [year, setYear] = React.useState(value?.year || "");
  const [month, setMonth] = React.useState(value?.month || "");
  const [day, setDay] = React.useState(value?.day || "");

  React.useEffect(() => {
    const nextYear = value?.year || "";
    const nextMonth = value?.month || "";
    const nextDay = value?.day || "";
    setYear(nextYear);
    setMonth(nextMonth);
    setDay(nextDay);
  }, [value?.year, value?.month, value?.day]);

  const handleYearChange = (e) => {
    setYear(e.target.value);
    onChange({ year: e.target.value, month, day });
  };
  const handleMonthChange = (e) => {
    setMonth(e.target.value);
    onChange({ year, month: e.target.value, day });
  };
  const handleDayChange = (e) => {
    setDay(e.target.value);
    onChange({ year, month, day: e.target.value });
  };

  const errorBorderStyle = hasError ? { border: "1px solid #ef4444", borderRadius: "4px" } : {};

  return (
    <div>
      <div style={{ display: "flex", gap: 8, ...errorBorderStyle, padding: hasError ? "4px" : "0" }}>
        <input
          type="number"
          min="1900"
          max="2099"
          placeholder="ዓመት"
          value={year}
          onChange={handleYearChange}
          style={{ 
            width: 60,
            border: hasError ? "1px solid #ef4444" : "1px solid #d1d5db",
            borderRadius: "4px",
            padding: "4px"
          }}
          name={name ? `${name}Year` : undefined}
          id={id ? `${id}Year` : undefined}
        />
        <select
          value={month}
          onChange={handleMonthChange}
          style={{ 
            width: 60,
            border: hasError ? "1px solid #ef4444" : "1px solid #d1d5db",
            borderRadius: "4px",
            padding: "4px"
          }}
          name={name ? `${name}Month` : undefined}
          id={id ? `${id}Month` : undefined}
        >
          <option value="">ወር</option>
          {ETH_MONTHS.map((m, i) => (
            <option key={i + 1} value={i + 1}>{m}</option>
          ))}
        </select>
        <input
          type="number"
          min="1"
          max={month === "13" ? "6" : "30"}
          placeholder="ቀን"
          value={day}
          onChange={handleDayChange}
          style={{ 
            width: 40,
            border: hasError ? "1px solid #ef4444" : "1px solid #d1d5db",
            borderRadius: "4px",
            padding: "4px"
          }}
          name={name ? `${name}Day` : undefined}
          id={id ? `${id}Day` : undefined}
        />
      </div>
      {hasError && errorMessage && (
        <p style={{ marginTop: "4px", fontSize: "12px", color: "#ef4444" }}>
          {errorMessage}
        </p>
      )}
    </div>
  );
}
