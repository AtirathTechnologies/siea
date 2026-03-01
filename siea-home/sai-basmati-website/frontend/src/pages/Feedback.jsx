import { useState, useMemo, useCallback } from "react";
import { db } from "../firebase";
import { ref, push, set } from "firebase/database";
import { useLanguage } from "../contexts/LanguageContext";
import React from "react";

const countryDigitLimits = {
  India: 10,
  "USA/Canada": 10,
  UK: 10,
  UAE: 9,
  "Saudi Arabia": 9,
  Pakistan: 10,
  Bangladesh: 10,
  "Sri Lanka": 9,
  Nepal: 10,
  Afghanistan: 9,
  Other: 15,
};

const countries = Object.keys(countryDigitLimits);

function Feedback() {
  const { t } = useLanguage();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    country: "India",
    requirements: "",
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // ✅ Derived max digits (no useEffect needed)
  const maxPhoneDigits = useMemo(() => {
    return countryDigitLimits[formData.country] || 15;
  }, [formData.country]);

  // ✅ Optimized change handler
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      if (name === "phone") {
        const digits = value.replace(/\D/g, "").slice(0, countryDigitLimits[prev.country]);
        return { ...prev, phone: digits };
      }
      return { ...prev, [name]: value };
    });
  }, []);

  // ✅ Optimized submit
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      if (formData.phone.length !== maxPhoneDigits) {
        alert(`Please enter ${maxPhoneDigits} digit phone number for ${formData.country}`);
        return;
      }

      setLoading(true);
      setSuccess(false);

      try {
        const feedbackRef = push(ref(db, "feedbacks"));
        await set(feedbackRef, {
          ...formData,
          createdAt: new Date().toISOString(),
        });

        setSuccess(true);
        setFormData({
          name: "",
          email: "",
          phone: "",
          country: "India",
          requirements: "",
        });

        setTimeout(() => setSuccess(false), 4000);
      } catch (error) {
        console.error("Error saving feedback:", error);
        alert("Error saving feedback. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [formData, maxPhoneDigits]
  );

  return (
    <div
      className="tw-min-h-screen tw-w-full tw-py-12 sm:tw-py-16 tw-px-4 sm:tw-px-6 tw-flex tw-flex-col tw-justify-center"
    >
      {/* Header */}
      <div className="tw-text-center tw-mb-10 sm:tw-mb-12">
        <h1 className="tw-text-4xl sm:tw-text-5xl tw-font-extrabold tw-text-yellow-400">
          {t("feedback")}
        </h1>
        <p className="tw-mt-3 tw-text-lg sm:tw-text-xl tw-text-yellow-300">
          {t("share_requirements")}
        </p>
      </div>

      <div className="tw-max-w-4xl tw-mx-auto">
        <div className="tw-bg-black/60 tw-backdrop-blur-xl tw-p-8 sm:tw-p-10 tw-rounded-2xl tw-shadow-2xl tw-border tw-border-yellow-500/30">

          <form onSubmit={handleSubmit} className="tw-space-y-6">

            <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-6">

              {/* Name */}
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder={t("full_name_placeholder")}
                className="tw-w-full tw-px-5 tw-py-3 tw-bg-gray-900/80 tw-text-yellow-300 tw-border tw-border-yellow-600 tw-rounded-xl focus:tw-ring-2 focus:tw-ring-yellow-400"
              />

              {/* Email */}
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder={t("email_placeholder")}
                className="tw-w-full tw-px-5 tw-py-3 tw-bg-gray-900/80 tw-text-yellow-300 tw-border tw-border-yellow-600 tw-rounded-xl focus:tw-ring-2 focus:tw-ring-yellow-400"
              />

              {/* Country */}
              <select
                name="country"
                value={formData.country}
                onChange={handleChange}
                className="tw-w-full tw-px-5 tw-py-3 tw-bg-gray-900/80 tw-text-yellow-300 tw-border tw-border-yellow-600 tw-rounded-xl focus:tw-ring-2 focus:tw-ring-yellow-400"
              >
                {countries.map((country) => (
                  <option key={country} value={country}>
                    {country} ({countryDigitLimits[country]} digits)
                  </option>
                ))}
              </select>

              {/* Phone */}
              <input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                maxLength={maxPhoneDigits}
                inputMode="numeric"
                placeholder={`Enter ${maxPhoneDigits} digit phone`}
                className="tw-w-full tw-px-5 tw-py-3 tw-bg-gray-900/80 tw-text-yellow-300 tw-border tw-border-yellow-600 tw-rounded-xl focus:tw-ring-2 focus:tw-ring-yellow-400"
              />

              {/* Requirements */}
              <textarea
                name="requirements"
                value={formData.requirements}
                onChange={handleChange}
                rows={5}
                placeholder={t("requirements_placeholder")}
                className="tw-w-full tw-px-5 tw-py-3 tw-bg-gray-900/80 tw-text-yellow-300 tw-border tw-border-yellow-600 tw-rounded-xl focus:tw-ring-2 focus:tw-ring-yellow-400 md:tw-col-span-2"
              />
            </div>

            <button
              type="submit"
              disabled={loading || formData.phone.length !== maxPhoneDigits}
              className="tw-px-8 tw-py-3 tw-bg-yellow-400 tw-text-black tw-font-bold tw-rounded-xl tw-transition-all hover:tw-scale-105 disabled:tw-opacity-60"
            >
              {loading ? t("submitting") : t("submit_feedback")}
            </button>

            {success && (
              <div className="tw-mt-4 tw-text-green-400 tw-font-semibold">
                {t("feedback_success")}
              </div>
            )}

          </form>
        </div>
      </div>
    </div>
  );
}

export default React.memo(Feedback);