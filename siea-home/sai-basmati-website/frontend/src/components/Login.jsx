import React, { useState, useEffect } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { get, ref } from "firebase/database";
import { auth, db } from "../firebase";
import { Link, useNavigate } from "react-router-dom";
import "../Login.css";
import logo from "../assets/logo.png";
import { useLanguage } from "../contexts/LanguageContext";

export default function Login({ setProfile }) {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const navigate = useNavigate();
  const { t } = useLanguage();

  // Default admin credentials
  const defaultAdmins = [
    {
      email: 'admin1@company.com',
      password: 'admin123',
      uid: 'default-admin-1',
      displayName: 'Admin One',
      isAdmin: true,
      isDefaultAdmin: true
    },
    {
      email: 'admin2@company.com',
      password: 'admin456',
      uid: 'default-admin-2',
      displayName: 'Admin Two',
      isAdmin: true,
      isDefaultAdmin: true
    }
  ];

  // Helper function to create safe Firebase paths
  const createSafeUid = (email) => {
    return email
      .replace(/@/g, '-at-')
      .replace(/\./g, '-dot-')
      .replace(/[#.$\[\]]/g, '-');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { email, password } = formData;

    if (!email) {
      setError(t("email_required"));
      setLoading(false);
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError(t("invalid_email"));
      setLoading(false);
      return;
    }
    if (!password) {
      setError(t("password_required"));
      setLoading(false);
      return;
    }

    try {
      // Check if it's a default admin first
      const defaultAdmin = defaultAdmins.find(admin =>
        admin.email === email && admin.password === password
      );

      if (defaultAdmin) {
        // Handle default admin login
        console.log("Default admin login detected:", email);

        const adminProfile = {
          uid: defaultAdmin.uid,
          email: defaultAdmin.email,
          name: defaultAdmin.displayName,
          displayName: defaultAdmin.displayName,
          isAdmin: true,
          isDefaultAdmin: true,
          phone: "",
          avatar: ""
        };

        setProfile(adminProfile);
        localStorage.setItem("profile", JSON.stringify(adminProfile));
        localStorage.setItem("isAdmin", "true");

        if (rememberMe) {
          localStorage.setItem("rememberMe", "true");
          localStorage.setItem("userEmail", email);
        } else {
          localStorage.removeItem("rememberMe");
          localStorage.removeItem("userEmail");
        }

        // Redirect to admin dashboard
        navigate("/admin/dashboard");
        return;
      }

      // Handle Firebase user login (existing code)
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Check if this Firebase user is an admin
      const adminRef = ref(db, "admins/" + user.uid);
      const adminSnapshot = await get(adminRef);
      const isFirebaseAdmin = adminSnapshot.exists();

      const usersRef = ref(db, "users");

      const snapshot = await get(usersRef);

      let matchedUser = null;
      snapshot.forEach(child => {
        if (child.val().uid === user.uid) {
          matchedUser = { id: child.key, ...child.val() };
        }
      });

      let profileData;

      if (snapshot.exists()) {
        const userData = snapshot.val();
        profileData = {
          uid: user.uid,
          name: userData.fullName || user.displayName || "User",
          email: userData.email || user.email,
          phone: userData.phone || "",
          avatar: user.photoURL || "https://randomuser.me/api/portraits/men/32.jpg",
          isAdmin: isFirebaseAdmin
        };
      } else {
        profileData = {
          uid: user.uid,
          name: user.displayName || "User",
          email: user.email,
          phone: "",
          avatar: user.photoURL || "https://randomuser.me/api/portraits/men/32.jpg",
          isAdmin: isFirebaseAdmin
        };
      }

      setProfile(profileData);
      localStorage.setItem("profile", JSON.stringify(profileData));

      if (isFirebaseAdmin) {
        localStorage.setItem("isAdmin", "true");
      }

      if (rememberMe) {
        localStorage.setItem("rememberMe", "true");
        localStorage.setItem("userEmail", email);
      } else {
        localStorage.removeItem("rememberMe");
        localStorage.removeItem("userEmail");
      }

      // Redirect based on user type
      if (isFirebaseAdmin) {
        navigate("/admin/dashboard");
      } else {
        navigate("/");
      }

    } catch (err) {
      console.error("Login error:", err);
      if (err.code === "auth/user-not-found") setError(t("no_account_found"));
      else if (err.code === "auth/wrong-password") setError(t("incorrect_password"));
      else if (err.code === "auth/invalid-email") setError(t("invalid_email"));
      else if (err.code === "auth/too-many-requests")
        setError(t("too_many_attempts"));
      else setError(t("failed_to_login"));
    } finally {
      setLoading(false);
    }
  };

  // Quick login buttons for testing (optional - remove in production)
  const quickAdminLogin = (adminNumber) => {
    const admin = defaultAdmins[adminNumber - 1];
    setFormData({
      email: admin.email,
      password: admin.password
    });
  };

  useEffect(() => {
    const remembered = localStorage.getItem("rememberMe");
    const rememberedEmail = localStorage.getItem("userEmail");

    if (remembered === "true" && rememberedEmail) {
      setFormData((prev) => ({ ...prev, email: rememberedEmail }));
      setRememberMe(true);
    }
  }, []);

  return (
    <div className="mobile-login-container">
      <div className="login-form-box">
        <img src={logo} alt={t("logo_alt_text")} className="login-logo" />
        <h1 className="login-title">{t("login")}</h1>

        {/* Quick Admin Login Buttons (for testing - remove in production) */}
        {/* <div className="quick-admin-buttons" style={{
          marginBottom: '20px',
          textAlign: 'center',
          padding: '10px',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderRadius: '8px'
        }}>
          <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
            Quick Admin Login (Testing)
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => quickAdminLogin(1)}
              style={{
                padding: '6px 12px',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                border: '1px solid #3b82f6',
                borderRadius: '6px',
                color: '#3b82f6',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Admin 1
            </button>
            <button
              type="button"
              onClick={() => quickAdminLogin(2)}
              style={{
                padding: '6px 12px',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                border: '1px solid #3b82f6',
                borderRadius: '6px',
                color: '#3b82f6',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Admin 2
            </button>
          </div>
        </div> */}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label>{t("email")}</label>
            <input
              type="email"
              name="email"
              placeholder={t("enter_email")}
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="input-group">
            <label>{t("password")}</label>
            <input
              type="password"
              name="password"
              placeholder={t("enter_password")}
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          <div className="login-options">
            <label className="remember-me">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={() => setRememberMe(!rememberMe)}
              />
              <span>{t("remember_me")}</span>
            </label>
            <Link to="/forgot-password" className="forgot-password">
              {t("forgot_password")}
            </Link>
          </div>
          <button type="submit" disabled={loading} className="login-btn">
            {loading ? t("logging_in") : t("login")}
          </button>
        </form>
        {error && <p className="error-message">{error}</p>}
        <p className="register-link">
          {t("no_account")}{" "}
          <Link to="/register" className="register-link-text">
            {t("register")}
          </Link>
        </p>
      </div>
    </div>
  );
}