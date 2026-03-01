import React, { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/logo.svg";
import { useLanguage } from "../contexts/LanguageContext";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleReset = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("✅ " + t("reset_email_sent"));

      setTimeout(() => {
        navigate("/login", { state: { resetSent: true } });
      }, 3000);
    } catch (err) {
      console.error(err);

      if (err.code === "auth/user-not-found") {
        setError(
          "❌ " + t("no_account_found")
        );
      } else if (err.code === "auth/invalid-email") {
        setError("❌ " + t("invalid_email_format"));
      } else {
        setError("❌ " + t("failed_to_send_reset"));
      }
    }
  };

  return (
    <div className="mobile-login-container">
      <div className="login-form-box">
        <img src={logo} alt={t("logo_alt_text")} className="login-logo" />

        <h1 className="login-title">{t("forgot_password")}</h1>
        <p className="tw-text-gray-300 tw-mb-4 tw-text-center">
          {t("enter_registered_email")}
        </p>

        <form className="login-form" onSubmit={handleReset}>
          <div className="input-group">
            <label>{t("email")}</label>
            <input
              type="email"
              placeholder={t("enter_registered_email")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="tw-w-full tw-px-4 tw-py-2 tw-rounded-lg tw-text-black tw-bg-white tw-border tw-border-gray-300 focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-yellow-500"
            />
          </div>

          <button type="submit" className="login-btn">
            {t("send_reset_link")}
          </button>
        </form>

        {message && (
          <p className="tw-text-green-400 tw-mt-4 tw-text-center">{message}</p>
        )}
        {error && (
          <p className="tw-text-red-400 tw-mt-4 tw-text-center">{error}</p>
        )}

        <p className="tw-mt-6 tw-text-center tw-text-gray-300">
          {t("remembered_password")}{" "}
          <Link to="/login" className="register-link-text">
            {t("back_to_login")}
          </Link>
        </p>
      </div>
    </div>
  );
}