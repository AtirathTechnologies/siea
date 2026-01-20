import React, { useState, useRef, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { ref, set, runTransaction } from "firebase/database";
import { useNavigate } from "react-router-dom";
import { auth, db, deleteUser } from "../firebase";
import { useLanguage } from "../contexts/LanguageContext";
import logo from "../assets/logo.png";
import "../Register.css";

export default function Register() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    countryCode: "+91",
    phoneNumber: "",
    street: "",
    city: "",
    addressState: "",
    addressCountry: "",
    pincode: "",
    avatar: "",
  });

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [phoneErr, setPhoneErr] = useState("");
  const [globalErr, setGlobalErr] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const countryOptions = [
    { code: "+91", label: "+91 (India)", len: 10 },
    { code: "+1", label: "+1 (USA)", len: 10 },
    { code: "+44", label: "+44 (UK)", len: 10 },
    { code: "+971", label: "+971 (UAE)", len: 9 },
    { code: "+61", label: "+61 (AU)", len: 9 },
    { code: "+98", label: "+98 (Iran)", len: 10 },
  ];

  const phoneLen = () => {
    const sel = countryOptions.find(o => o.code === form.countryCode);
    return sel ? sel.len : 10;
  };

  useEffect(() => {
    setForm(p => ({ ...p, phoneNumber: "" }));
    setPhoneErr("");
  }, [form.countryCode]);

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setGlobalErr("Please upload a valid image (JPEG, PNG, GIF, WebP)");
      return;
    }

    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      setGlobalErr(`Image size should be less than 2MB`);
      return;
    }

    setPhotoFile(file);
    setGlobalErr("");

    try {
      const base64 = await convertToBase64(file);
      setPhotoPreview(base64);
      setForm(prev => ({ ...prev, avatar: base64 }));
    } catch (error) {
      console.error("Error converting to Base64:", error);
      setGlobalErr("Error processing image");
    }
  };

  const clearPhoto = () => {
    setPhotoFile(null);
    setPhotoPreview("");
    setForm(prev => ({ ...prev, avatar: "" }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const validatePhone = () => {
    const v = form.phoneNumber.trim();
    if (!/^\d+$/.test(v)) return t("phone_digits_error");
    if (v.length !== phoneLen()) return t("phone_length_error").replace("{length}", phoneLen());
    return null;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setGlobalErr("");
    setPhoneErr("");

    const pErr = validatePhone();
    if (pErr) { setPhoneErr(pErr); return; }

    if (!form.fullName.trim()) return setGlobalErr(t("full_name_required"));
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setGlobalErr(t("email_invalid"));
    if (form.password.length < 6) return setGlobalErr(t("password_min_length"));
    if (form.password !== form.confirmPassword) return setGlobalErr(t("passwords_mismatch"));

    if (!form.street.trim()) return setGlobalErr("Street is required");
    if (!form.city.trim()) return setGlobalErr("City is required");
    if (!form.addressState.trim()) return setGlobalErr("State is required");
    if (!form.addressCountry.trim()) return setGlobalErr("Country is required");
    if (!form.pincode.trim()) return setGlobalErr("Pincode is required");

    if (form.avatar && form.avatar.length > 5 * 1024 * 1024) {
      return setGlobalErr("Image is too large. Please choose a smaller image.");
    }

    const phone = form.countryCode + form.phoneNumber.trim();
    setLoading(true);

    let cred = null;

    try {
      cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await updateProfile(cred.user, { displayName: form.fullName });

      const countRef = ref(db, "counters/userCount");
      const newId = await runTransaction(countRef, (current) => (current || 0) + 1);
      const nextId = newId.snapshot.val();
      const customId = "user-" + nextId;

      const userRef = ref(db, `users/${customId}`);
      await set(userRef, {
        uid: cred.user.uid,
        fullName: form.fullName,
        email: form.email,
        phone,
        street: form.street,
        city: form.city,
        addressState: form.addressState,
        addressCountry: form.addressCountry,
        pincode: form.pincode,
        avatar: form.avatar || "",
        createdAt: new Date().toISOString(),
      });

      // 🔴 FORCE LOGOUT AFTER REGISTER
      await auth.signOut();

      // Clear any stored profile data
      localStorage.removeItem("profile");
      sessionStorage.clear();


      navigate("/login");
    } catch (err) {
      console.error("Registration error →", err);

      if (cred?.user && (err.code === "permission-denied" || err.code.includes("auth/"))) {
        try {
          await deleteUser(cred.user);
        } catch (delErr) {
          console.error("Could not delete orphan user:", delErr);
        }
      }

      let msg = t("registration_failed");
      if (err.code === "auth/email-already-in-use") msg = t("email_already_used");
      else if (err.code === "auth/invalid-email") msg = t("email_invalid");
      else if (err.code === "auth/weak-password") msg = t("password_weak");
      else if (err.code === "permission-denied") msg = "Database permission denied";
      else msg = err.message || msg;

      setGlobalErr(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mobile-container">
      <div className="form-box">
        <img src={logo} alt={t("logo_alt_text")} className="logo" />
        <h1>{t("register_title")}</h1>

        <form className="form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label>{t("full_name")}</label>
            <input
              type="text"
              placeholder={t("full_name_placeholder")}
              value={form.fullName}
              onChange={e => setForm({ ...form, fullName: e.target.value })}
              required
            />
          </div>

          <div className="input-group">
            <label>{t("email")}</label>
            <input
              type="email"
              placeholder={t("email_placeholder")}
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div className="input-group">
            <label>{t("phone")}</label>
            <div className="phone-input">
              <select
                value={form.countryCode}
                onChange={e => setForm({ ...form, countryCode: e.target.value })}
              >
                {countryOptions.map(o => (
                  <option key={o.code} value={o.code}>{o.label}</option>
                ))}
              </select>
              <input
                type="tel"
                placeholder={t("phone_placeholder").replace("{length}", phoneLen())}
                value={form.phoneNumber}
                maxLength={phoneLen()}
                onChange={e => setForm({ ...form, phoneNumber: e.target.value.replace(/\D/g, "") })}
                required
              />
            </div>
            {phoneErr && <p className="error-text">{phoneErr}</p>}
          </div>

          <h3 style={{ marginTop: "20px" }}>{t("address_information")}</h3>

          <div className="input-group">
            <label>Street</label>
            <input
              type="text"
              value={form.street}
              placeholder="Enter Street name"
              onChange={e => setForm({ ...form, street: e.target.value })}
              required
            />
          </div>

          <div className="input-group">
            <label>City</label>
            <input
              type="text"
              value={form.city}
              placeholder="Enter City name"
              onChange={e => setForm({ ...form, city: e.target.value })}
              required
            />
          </div>

          <div className="input-group">
            <label>State</label>
            <input
              type="text"
              value={form.addressState}
              placeholder="Enter State name"
              onChange={e => setForm({ ...form, addressState: e.target.value })}
              required
            />
          </div>

          <div className="input-group">
            <label>Country</label>
            <input
              type="text"
              value={form.addressCountry}
              placeholder="Enter Country name"
              onChange={e => setForm({ ...form, addressCountry: e.target.value })}
              required
            />
          </div>

          <div className="input-group">
            <label>Pincode</label>
            <input
              type="text"
              value={form.pincode}
              placeholder="Enter Pincode"
              onChange={e => setForm({ ...form, pincode: e.target.value })}
              required
            />
          </div>

          <div className="input-group">
            <label>Profile Photo (Optional)</label>

            {!photoFile ? (
              <div className="file-upload-area">
                <button
                  type="button"
                  className="file-upload-btn"
                  onClick={() => fileInputRef.current.click()}
                >
                  Choose Photo
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
              </div>
            ) : (
              <div className="photo-uploaded">
                <div className="photo-preview">
                  <img src={photoPreview} alt="Preview" />
                  <button
                    type="button"
                    className="clear-photo-btn"
                    onClick={clearPhoto}
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}

            <p className="input-hint">Max size: 2MB. Supported: JPEG, PNG, GIF, WebP</p>
          </div>

          <div className="input-group">
            <label>{t("password")}</label>
            <input
              type="password"
              placeholder={t("password_placeholder")}
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          <div className="input-group">
            <label>{t("confirm_password")}</label>
            <input
              type="password"
              placeholder={t("confirm_password_placeholder")}
              value={form.confirmPassword}
              onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
              required
            />
          </div>

          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? t("creating_account") : t("register")}
          </button>
        </form>

        {globalErr && <p className="error-text">{globalErr}</p>}

        <p className="login-link">
          {t("already_have_account")} <a href="/login">{t("login")}</a>
        </p>
      </div>
    </div>
  );
}