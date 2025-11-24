import React, { useState } from "react";

// Ethiopian months
const ETH_MONTHS = [
  "መስከረም", "ጥቅምት", "ኅዳር", "ታኅሣሥ", "ጥር", "የካቲት", "መጋቢት", "ሚያዝያ", "ግንቦት", "ሰኔ", "ሐምሌ", "ነሐሴ", "ጳጉሜን"
];

export default function EthiopianDatePicker({ value, onChange, name, id, hasError, errorMessage }) {
  const [year, setYear] = useState(value?.year || "");
  const [month, setMonth] = useState(value?.month || "");
  const [day, setDay] = useState(value?.day || "");

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

  return (
    <div>
      <div className={`flex gap-2 ${hasError ? 'border border-red-500 rounded p-1' : ''}`}>
        <input
          type="number"
          min="2000"
          max="2099"
          placeholder="ዓመት"
          value={year}
          onChange={handleYearChange}
          className={`w-20 px-2 py-1 border rounded ${hasError ? 'border-red-500' : ''}`}
          name={name ? `${name}Year` : undefined}
          id={id ? `${id}Year` : undefined}
        />
        <select
          value={month}
          onChange={handleMonthChange}
          className={`w-20 px-2 py-1 border rounded ${hasError ? 'border-red-500' : ''}`}
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
          className={`w-16 px-2 py-1 border rounded ${hasError ? 'border-red-500' : ''}`}
          name={name ? `${name}Day` : undefined}
          id={id ? `${id}Day` : undefined}
        />
      </div>
      {hasError && errorMessage && (
        <p className="mt-1 text-sm text-red-600">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
