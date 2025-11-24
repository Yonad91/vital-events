"use client";

import React from "react";
import BirthForm from "./BirthForm";
import MarriageForm from "./MarriageForm";
import DeathForm from "./DeathForm";
import DivorceForm from "./DivorceForm";

// Form Selector Component
const FormSelector = ({ user, setUser, formType, onSubmit, onEdit, editingEvent = null }) => {
  // Route to the appropriate form based on formType
  switch (formType) {
    case "birth":
      return (
        <BirthForm
          user={user}
          setUser={setUser}
          onSubmit={onSubmit}
          onEdit={onEdit}
          editingEvent={editingEvent}
        />
      );
    case "marriage":
      return (
        <MarriageForm
          user={user}
          setUser={setUser}
          onSubmit={onSubmit}
          onEdit={onEdit}
          editingEvent={editingEvent}
        />
      );
    case "death":
      return (
        <DeathForm
          user={user}
          setUser={setUser}
          onSubmit={onSubmit}
          onEdit={onEdit}
          editingEvent={editingEvent}
        />
      );
    case "divorce":
      return (
        <DivorceForm
          user={user}
          setUser={setUser}
          onSubmit={onSubmit}
          onEdit={onEdit}
          editingEvent={editingEvent}
        />
      );
    default:
      return (
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Form Not Found
            </h2>
            <p className="text-gray-600">
              The requested form type "{formType}" is not available.
            </p>
          </div>
        </div>
      );
  }
};

export default FormSelector;
