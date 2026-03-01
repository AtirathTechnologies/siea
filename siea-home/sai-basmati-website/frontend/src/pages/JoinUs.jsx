// src/components/JoinUs.jsx
import React, { useState, useMemo, useRef, useCallback } from "react";
import { useLanguage } from "../contexts/LanguageContext";

/* -------------------- Success Message -------------------- */
const SuccessMessage = () => (
  <div className="tw-fixed tw-top-4 tw-left-1/2 tw-transform -tw-translate-x-1/2 tw-z-50 tw-bg-green-600 tw-text-white tw-px-6 tw-py-4 tw-rounded-2xl tw-shadow-2xl tw-border-2 tw-border-green-400 tw-animate-bounce">
    <div className="tw-flex tw-items-center tw-gap-3">
      <svg className="tw-w-6 tw-h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      <span className="tw-font-bold">Application Submitted Successfully!</span>
    </div>
  </div>
);

/* -------------------- FORM CONFIG -------------------- */
const FORM_CONFIG = {
  vendor: {
    title: "Vendor Registration",
    fields: [
      { name: "name", label: "Full Name", type: "text", required: true, col: 1 },
      { name: "email", label: "Email Address", type: "email", required: true, col: 1 },
      { name: "phone", label: "Phone Number", type: "tel", required: true, col: 1 },
      { name: "company", label: "Company Name", type: "text", required: true, col: 1 },

      { name: "product", label: "Main Products/Specialization", type: "text", required: true, col: 1 },
      { name: "capacity", label: "Production Capacity (Monthly)", type: "text", required: true, col: 1 },

      { name: "address", label: "Factory/Office Address", type: "textarea", required: true, col: 2 },

      { name: "experience", label: "Years in Business", type: "text", required: true, col: 1 },
      { name: "certifications", label: "Certifications (FSSAI, ISO, etc.)", type: "text", col: 1 },
    ],
  },

  distributor: {
    title: "Distributor Registration",
    fields: [
      { name: "name", label: "Full Name", type: "text", required: true, col: 1 },
      { name: "email", label: "Email Address", type: "email", required: true, col: 1 },
      { name: "phone", label: "Phone Number", type: "tel", required: true, col: 1 },
      { name: "company", label: "Company Name", type: "text", required: true, col: 1 },

      { name: "region", label: "Region", type: "text", required: true, col: 1 },
      { name: "businessType", label: "Business Type", type: "text", required: true, col: 1 },

      { name: "annualTurnover", label: "Annual Turnover (INR)", type: "text", required: true, col: 1 },
      { name: "storageCapacity", label: "Storage Capacity (Sq. Ft.)", type: "text", required: true, col: 1 },

      { name: "existingBrands", label: "Currently Distributing Brands", type: "textarea", col: 2 },
    ],
  },

  partner: {
    title: "Business Partner Registration",
    fields: [
      { name: "name", label: "Full Name", type: "text", required: true, col: 1 },
      { name: "email", label: "Email Address", type: "email", required: true, col: 1 },
      { name: "phone", label: "Phone Number", type: "tel", required: true, col: 1 },
      { name: "company", label: "Company/Organization", type: "text", col: 1 },

      { name: "investmentRange", label: "Investment Range", type: "text", required: true, col: 1 },
      { name: "businessModel", label: "Preferred Business Model", type: "text", required: true, col: 1 },

      { name: "background", label: "Business Background/Experience", type: "textarea", required: true, col: 2 },
      { name: "expectations", label: "Expectations from Partnership", type: "textarea", required: true, col: 2 },
    ],
  },

  agent: {
    title: "Sales Agent Registration",
    fields: [
      { name: "name", label: "Full Name", type: "text", required: true, col: 1 },
      { name: "email", label: "Email Address", type: "email", required: true, col: 1 },
      { name: "phone", label: "Phone Number", type: "tel", required: true, col: 1 },
      { name: "location", label: "City/Region", type: "text", required: true, col: 1 },

      { name: "experience", label: "Years of Sales Experience", type: "text", required: true, col: 1 },
      { name: "network", label: "Retail Network Coverage", type: "text", required: true, col: 1 },

      { name: "languages", label: "Languages Known", type: "text", required: true, col: 1 },
      { name: "commissionExpectation", label: "Expected Commission Structure", type: "text", col: 1 },
    ],
  },
};

/* -------------------- Dynamic Form Engine -------------------- */
const DynamicForm = React.forwardRef(({ config, onSubmit }, ref) => {
  const initialState = useMemo(() => {
    const obj = {};
    config.fields.forEach((f) => (obj[f.name] = ""));
    return obj;
  }, [config]);

  const [form, setForm] = useState(initialState);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const cleanValue = name === "phone" ? value.replace(/\D/g, "") : value;
    setForm((prev) => ({ ...prev, [name]: cleanValue }));
  };

  React.useImperativeHandle(ref, () => ({
    submit: () => onSubmit(config.title, form),
    reset: () => setForm(initialState),
  }));

  const inputClass =
    "tw-w-full tw-px-4 tw-py-3 tw-rounded-xl tw-bg-black/60 tw-text-yellow-100 placeholder:tw-text-yellow-500 tw-border-2 tw-border-yellow-600 focus:tw-ring-4 focus:tw-ring-yellow-400";

  return (
    <div className="tw-space-y-6">
      <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-6">
        {config.fields.map((field) => (
          <div key={field.name} className={field.col === 2 ? "md:tw-col-span-2" : ""}>
            {field.type === "textarea" ? (
              <textarea
                name={field.name}
                placeholder={`${field.label}${field.required ? " *" : ""}`}
                value={form[field.name]}
                onChange={handleChange}
                required={field.required}
                rows="3"
                className={inputClass}
              />
            ) : (
              <input
                type={field.type}
                name={field.name}
                placeholder={`${field.label}${field.required ? " *" : ""}`}
                value={form[field.name]}
                onChange={handleChange}
                required={field.required}
                className={inputClass}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
});

/* -------------------- Main Component -------------------- */
const JoinUs = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("vendor");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const formRef = useRef();

  const handleFormSubmit = useCallback(async (type, data) => {
    setLoading(true);

    const message =
      `*${type}*\n\n` +
      Object.entries(data)
        .map(([k, v]) => `• ${k}: ${v}`)
        .join("\n");

    const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER;

    if (!whatsappNumber) {
      console.error("WhatsApp number missing");
      setLoading(false);
      return;
    }

    window.open(
      `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`,
      "_blank"
    );

    setSubmitted(true);
    setLoading(false);
    formRef.current?.reset();
    setTimeout(() => setSubmitted(false), 3000);
  }, []);

  const tabs = useMemo(
    () => [
      { id: "vendor", label: "Become a Vendor", icon: "🏭" },
      { id: "distributor", label: "Become a Distributor", icon: "🚚" },
      { id: "partner", label: "Business Partner", icon: "🤝" },
      { id: "agent", label: "Sales Agent", icon: "👨‍💼" },
    ],
    []
  );

  return (
    <section className="join-us-section tw-py-12 sm:tw-py-16 tw-px-3 sm:tw-px-4 tw-bg-gradient-to-br tw-from-gray-900 tw-to-black tw-min-h-screen">
      <div className="container tw-max-w-6xl tw-mx-auto tw-w-full">

        <div className="tw-text-center tw-mb-12">
          <h1 className="tw-text-3xl lg:tw-text-4xl tw-font-bold tw-text-yellow-400">
            Join Our Network
          </h1>
        </div>

        {submitted && <SuccessMessage />}

        <div className="tw-bg-black/40 tw-backdrop-blur-xl tw-rounded-3xl tw-shadow-2xl tw-border-4 tw-border-yellow-400 tw-overflow-hidden">

          <div className="tw-grid tw-grid-cols-2 lg:tw-grid-cols-4 tw-bg-yellow-900/50 tw-border-b-2 tw-border-yellow-600">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`tw-p-4 tw-font-bold tw-transition-all ${
                  activeTab === tab.id
                    ? "tw-bg-yellow-500 tw-text-black"
                    : "tw-text-yellow-300 hover:tw-bg-yellow-900/70"
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          <div className="tw-p-6">
            <DynamicForm
              ref={formRef}
              config={FORM_CONFIG[activeTab]}
              onSubmit={handleFormSubmit}
            />

            <div className="tw-text-center tw-pt-6">
              <button
                disabled={loading}
                onClick={() => formRef.current?.submit()}
                className="tw-px-10 tw-py-4 tw-bg-gradient-to-r tw-from-yellow-500 tw-to-yellow-600 tw-text-black tw-font-bold tw-rounded-2xl tw-shadow-2xl hover:tw-scale-105 disabled:tw-opacity-50"
              >
                {loading ? "Submitting..." : "Submit Application"}
              </button>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default JoinUs;