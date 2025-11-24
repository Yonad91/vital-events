"use client";

import React, { useEffect, useMemo, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { apiFetch } from "@/lib/api";
import { ETH_GEO } from "@/lib/geo";
import { EthiopianDatePicker } from "../../lib/forms.jsx";
import { ethToGreg } from "@/lib/ethioDate.js";
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

// UI Components
const Card = ({ children, className }) => (
  <div className={`bg-white shadow-md rounded-lg ${className}`}>{children}</div>
);

const CardHeader = ({ children, className }) => (
  <div className={`p-4 border-b ${className}`}>{children}</div>
);

const CardTitle = ({ children, className }) => (
  <h2 className={`text-xl font-semibold ${className}`}>{children}</h2>
);

const CardContent = ({ children, className }) => (
  <div className={`p-4 ${className}`}>{children}</div>
);

const Button = ({ 
  children, 
  onClick, 
  type = "button", 
  className,
  isLoading = false,
  disabled = false
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled || isLoading}
    className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 
      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 
      transition duration-150 ease-in-out 
      ${isLoading ? 'opacity-75 cursor-not-allowed' : ''} 
      ${disabled ? 'opacity-50 cursor-not-allowed' : ''} 
      ${className}`}
  >
    {isLoading ? (
      <span className="flex items-center justify-center gap-2">
        <Loader2 className="animate-spin h-4 w-4" />
        Processing...
      </span>
    ) : (
      children
    )}
  </button>
);

const Input = ({ 
  name, 
  label, 
  control, 
  errors, 
  className, 
  disabled = false,
  ...props 
}) => {
  const error = errors?.[name];
  
  return (
    <div className="w-full mb-4">
      {label && (
        <label 
          htmlFor={name}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <input
            {...field}
            id={name}
            className={`w-full px-3 py-2 border rounded-md text-sm 
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              ${error ? 'border-red-500' : 'border-gray-300'} 
              ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}
              ${className}`}
            disabled={disabled}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={`${name}-error`}
            {...props}
          />
        )}
      />
      {error && (
        <p 
          id={`${name}-error`} 
          className="mt-1 text-sm text-red-600"
          role="alert"
        >
          {error.message}
        </p>
      )}
    </div>
  );
};

const Select = ({ 
  name, 
  label, 
  control, 
  errors, 
  options = [], 
  className, 
  disabled = false,
  ...props 
}) => {
  const error = errors?.[name];
  
  return (
    <div className="w-full mb-4">
      {label && (
        <label 
          htmlFor={name}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <select
            {...field}
            id={name}
            className={`w-full px-3 py-2 border rounded-md text-sm 
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              ${error ? 'border-red-500' : 'border-gray-300'} 
              ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}
              ${className}`}
            disabled={disabled}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={`${name}-error`}
            {...props}
          >
            <option value="">Select {label?.toLowerCase() || 'an option'}</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}
      />
      {error && (
        <p 
          id={`${name}-error`} 
          className="mt-1 text-sm text-red-600"
          role="alert"
        >
          {error.message}
        </p>
      )}
    </div>
  );
};

// Validation Schema
const createBirthFormSchema = (lang) => {
  const isAmharic = lang === 'am';
  const nameRegex = /^[\p{L} .'-]+$/u;
  const amharicRegex = /^[\u1200-\u137F\u1380-\u139F\u2D80-\u2DDF\s]+$/;
  const englishRegex = /^[A-Za-z\s]+$/;
  const idNumberRegex = /^[0-9]+$/;
  
  const baseSchema = {
    // Child Information
    childFirstName: yup
      .string()
      .required(isAmharic ? 'የመጀመሪያ ስም ያስፈልጋል' : 'First name is required')
      .matches(englishRegex, isAmharic ? 'እባክዎ በእንግሊዝኛ ያስገቡ' : 'Must be in English'),
      
    childFirstNameAm: yup
      .string()
      .required(isAmharic ? 'የመጀመሪያ ስም (አማርኛ) ያስፈልጋል' : 'First name (Amharic) is required')
      .matches(amharicRegex, isAmharic ? 'እባክዎ በአማርኛ ያስገቡ' : 'Must be in Amharic'),
    
    childSex: yup
      .string()
      .required(isAmharic ? 'ጾታ ይምረጡ' : 'Please select a gender'),
      
    childBirthDate: yup
      .date()
      .required(isAmharic ? 'የተወለዱበት ቀን ያስገቡ' : 'Birth date is required')
      .max(new Date(), isAmharic ? 'የወደፊት ቀን መሆን አይችልም' : 'Cannot be a future date'),
    
    // Mother's Information
    motherFirstName: yup
      .string()
      .required(isAmharic ? 'የእናት ስም ያስፈልጋል' : "Mother's first name is required")
      .matches(englishRegex, isAmharic ? 'እባክዎ በእንግሊዝኛ ያስገቡ' : 'Must be in English'),
      
    motherFirstNameAm: yup
      .string()
      .required(isAmharic ? 'የእናት ስም (አማርኛ) ያስፈልጋል' : "Mother's first name (Amharic) is required")
      .matches(amharicRegex, isAmharic ? 'እባክዎ በአማርኛ ያስገቡ' : 'Must be in Amharic'),
    
    // Registration Information
    registrationNumber: yup
      .string()
      .required(isAmharic ? 'የምዝገባ ቁጥር ያስፈልጋል' : 'Registration number is required'),
      
    registrationDate: yup
      .date()
      .required(isAmharic ? 'የምዝገባ ቀን ያስገቡ' : 'Registration date is required')
      .max(new Date(), isAmharic ? 'የወደፊት ቀን መሆን አይችልም' : 'Cannot be a future date'),
  };

  return yup.object().shape(baseSchema);
};

// Birth Form Component
const EnhancedBirthForm = ({ user, onSubmit, onEdit, editingEvent = null }) => {
  const [lang, setLang] = React.useState("am");
  const [isGeneratingId, setIsGeneratingId] = React.useState(false);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = React.useState(false);
  
  // Initialize form with default values or editing event data
  const defaultValues = useMemo(() => ({
    type: "birth",
    // ... other default values
    ...(editingEvent?.data || {}),
  }), [editingEvent]);

  // Initialize react-hook-form
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
    watch,
    setValue,
    setError,
    clearErrors,
  } = useForm({
    resolver: yupResolver(createBirthFormSchema(lang)),
    defaultValues,
    mode: 'onChange', // Validate on change for better UX
  });

  // Watch form values
  const formValues = watch();

  // Location dropdowns - using ETH_GEO data
  const regionOptions = useMemo(() => 
    Object.keys(ETH_GEO).map(region => ({ 
      value: region, 
      label: region 
    })), 
    []
  );
  
  const zoneOptions = useMemo(() => {
    if (!formValues.region) return [];
    const zones = ETH_GEO[formValues.region]?.zones ? Object.keys(ETH_GEO[formValues.region].zones) : [];
    return zones.map(zone => ({ 
      value: zone, 
      label: zone 
    }));
  }, [formValues.region]);
  
  const woredaOptions = useMemo(() => {
    if (!formValues.region || !formValues.zone) return [];
    const woredas = ETH_GEO[formValues.region]?.zones?.[formValues.zone]?.woredas || [];
    const toLabel = (item) => (typeof item === "string" ? item : (lang === "en" ? item.en : item.am));
    const toValue = (item) => (typeof item === "string" ? item : (item.en || item.am || String(item)));
    
    return woredas.map(woreda => ({ 
      value: toValue(woreda), 
      label: toLabel(woreda) 
    }));
  }, [formValues.region, formValues.zone, lang]);

  // Generate registration ID
  const generateRegistrationId = useCallback(async () => {
    if (formValues.registrationId) return;
    
    setIsGeneratingId(true);
    try {
      const res = await apiFetch("/users/registration-id", {
        method: "POST",
        token: user?.token,
      });
      
      if (res?.registrationId) {
        setValue("registrationId", res.registrationId);
        toast.success("Registration ID generated successfully");
      }
    } catch (error) {
      console.error("Generate registration ID error:", error);
      toast.error("Failed to generate registration ID");
    } finally {
      setIsGeneratingId(false);
    }
  }, [formValues.registrationId, setValue, user?.token]);

  // Handle form submission
  const onSubmitForm = async (data) => {
    try {
      // Additional validation can be added here
      
      // Show loading state
      const loadingToast = toast.loading("Submitting form...");
      
      // Call the onSubmit prop with form data
      const result = await onSubmit(data);
      
      // Show success message
      toast.success("Form submitted successfully!");
      
      // Reset form if needed
      if (!editingEvent) {
        reset();
      }
      
      return result;
    } catch (error) {
      console.error("Form submission error:", error);
      
      // Show error message
      toast.error(
        error?.response?.data?.message || 
        "Failed to submit form. Please try again."
      );
      
      // Handle form-level errors
      if (error?.response?.data?.errors) {
        error.response.data.errors.forEach(({ field, message }) => {
          setError(field, {
            type: 'manual',
            message: message,
          });
        });
      }
      
      throw error;
    }
  };

  // Handle form errors
  const onError = (errors) => {
    console.log('Form errors:', errors);
    
    // Scroll to first error
    const firstError = Object.keys(errors)[0];
    if (firstError) {
      const element = document.querySelector(`[name="${firstError}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.focus();
      }
    }
    
    toast.error("Please check the form for errors");
  };

  return (
    <form onSubmit={handleSubmit(onSubmitForm, onError)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {lang === 'am' ? 'የህፃን መረጃ' : 'Child Information'}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Child First Name (English) */}
          <Input
            name="childFirstName"
            label={lang === 'am' ? 'የመጀመሪያ ስም (እንግሊዝኛ)' : 'First Name (English)'}
            control={control}
            errors={errors}
            required
          />
          
          {/* Child First Name (Amharic) */}
          <Input
            name="childFirstNameAm"
            label={lang === 'am' ? 'የመጀመሪያ ስም (አማርኛ)' : 'First Name (Amharic)'}
            control={control}
            errors={errors}
            required
          />
          
          {/* Child Sex */}
          <Select
            name="childSex"
            label={lang === 'am' ? 'ጾታ' : 'Sex'}
            control={control}
            errors={errors}
            options={[
              { value: 'male', label: lang === 'am' ? 'ወንድ' : 'Male' },
              { value: 'female', label: lang === 'am' ? 'ሴት' : 'Female' },
            ]}
            required
          />
          
          {/* Birth Date */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {lang === 'am' ? 'የተወለዱበት ቀን' : 'Date of Birth'}
              <span className="text-red-500 ml-1">*</span>
            </label>
            <Controller
              name="childBirthDate"
              control={control}
              render={({ field }) => (
                <EthiopianDatePicker
                  value={field.value}
                  onChange={(date) => field.onChange(date)}
                  className={`w-full ${errors.childBirthDate ? 'border-red-500' : ''}`}
                />
              )}
            />
            {errors.childBirthDate && (
              <p className="mt-1 text-sm text-red-600">
                {errors.childBirthDate.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Mother's Information */}
      <Card>
        <CardHeader>
          <CardTitle>
            {lang === 'am' ? 'የእናት መረጃ' : "Mother's Information"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            name="motherFirstName"
            label={lang === 'am' ? 'የእናት ስም (እንግሊዝኛ)' : "Mother's First Name (English)"}
            control={control}
            errors={errors}
            required
          />
          
          <Input
            name="motherFirstNameAm"
            label={lang === 'am' ? 'የእናት ስም (አማርኛ)' : "Mother's First Name (Amharic)"}
            control={control}
            errors={errors}
            required
          />
          
          {/* Add more mother's information fields as needed */}
        </CardContent>
      </Card>
      
      {/* Registration Information */}
      <Card>
        <CardHeader>
          <CardTitle>
            {lang === 'am' ? 'የምዝገባ መረጃ' : 'Registration Information'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Input
                name="registrationNumber"
                label={lang === 'am' ? 'የምዝገባ ቁጥር' : 'Registration Number'}
                control={control}
                errors={errors}
                required
              />
            </div>
            <div>
              <Button
                type="button"
                onClick={generateRegistrationId}
                isLoading={isGeneratingId}
                disabled={!!formValues.registrationId}
                className="whitespace-nowrap"
              >
                {formValues.registrationId 
                  ? (lang === 'am' ? 'ተመዝግቧል' : 'Generated')
                  : (lang === 'am' ? 'ቁጥር ይፍጠሩ' : 'Generate Number')}
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {lang === 'am' ? 'የምዝገባ ቀን' : 'Registration Date'}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <Controller
                name="registrationDate"
                control={control}
                render={({ field }) => (
                  <EthiopianDatePicker
                    value={field.value}
                    onChange={(date) => field.onChange(date)}
                    className={`w-full ${errors.registrationDate ? 'border-red-500' : ''}`}
                  />
                )}
              />
              {errors.registrationDate && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.registrationDate.message}
                </p>
              )}
            </div>
            
            {/* Add more registration fields as needed */}
          </div>
        </CardContent>
      </Card>
      
      {/* Form Actions */}
      <div className="flex justify-end space-x-4 mt-6">
        <Button
          type="button"
          onClick={() => window.history.back()}
          className="bg-gray-300 text-gray-800 hover:bg-gray-400"
          disabled={isSubmitting}
        >
          {lang === 'am' ? 'ተመለስ' : 'Back'}
        </Button>
        
        <Button
          type="submit"
          isLoading={isSubmitting}
          disabled={!isDirty || isSubmitting}
        >
          {editingEvent 
            ? (lang === 'am' ? 'አዘምን' : 'Update')
            : (lang === 'am' ? 'ይመዝግቡ' : 'Submit')}
        </Button>
      </div>
    </form>
  );
};

export default EnhancedBirthForm;
