import React, { useState, useEffect } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { get, ref } from "firebase/database";
import { auth, db } from "../firebase";
import { Link, useNavigate } from "react-router-dom";
import "../Login.css";
import logo from "../assets/logo.svg";
import { useLanguage } from "../contexts/LanguageContext";

export default function Login({ setProfile }) {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);


  const navigate = useNavigate();
  const { t } = useLanguage();

  // Function to fetch admin users from Firebase
  const fetchAdminUsers = async () => {
    try {
      const adminsRef = ref(db, "admins");
      const snapshot = await get(adminsRef);
      
      if (snapshot.exists()) {
        const adminsData = snapshot.val();
        // Convert object to array of admin users
        const adminUsers = Object.entries(adminsData).map(([uid, adminData]) => ({
          uid,
          ...adminData
        }));
        return adminUsers;
      }
      return [];
    } catch (error) {
      console.error("Error fetching admin users:", error);
      return [];
    }
  };

  // Function to fetch regular users from Firebase
  const fetchRegularUsers = async () => {
    try {
      const usersRef = ref(db, "users");
      const snapshot = await get(usersRef);
      
      if (snapshot.exists()) {
        const usersData = snapshot.val();
        return usersData;
      }
      return {};
    } catch (error) {
      console.error("Error fetching regular users:", error);
      return {};
    }
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
      // First, try Firebase authentication
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Check if this user is an admin in Firebase
      const adminRef = ref(db, "admins/" + user.uid);
      const adminSnapshot = await get(adminRef);
      const isFirebaseAdmin = adminSnapshot.exists();

      // Also fetch all admins to check email-based admin status (for reference)
      const allAdmins = await fetchAdminUsers();
      
      // Check if this email exists in admin list (even if Firebase UID doesn't match)
      const emailBasedAdmin = allAdmins.find(admin => 
        admin.email && admin.email.toLowerCase() === email.toLowerCase()
      );

      // Check if user exists in regular users database
      const usersRef = ref(db, "users");
      const snapshot = await get(usersRef);

      let matchedUser = null;
      if (snapshot.exists()) {
        const usersData = snapshot.val();
        // Find user by email in users database
        Object.entries(usersData).forEach(([key, userData]) => {
          if (userData.email && userData.email.toLowerCase() === email.toLowerCase()) {
            matchedUser = { id: key, ...userData };
          }
        });
      }

      let profileData;

      if (matchedUser) {
        // User found in users database
        profileData = {
          uid: user.uid,
          name: matchedUser.fullName || user.displayName || "User",
          email: matchedUser.email || user.email,
          phone: matchedUser.phone || "",
          avatar: matchedUser.avatar || user.photoURL || "https://randomuser.me/api/portraits/men/32.jpg",
          isAdmin: isFirebaseAdmin || !!emailBasedAdmin,
          // Store additional admin info if available
          adminInfo: emailBasedAdmin || null
        };
      } else {
        // User not in users database, create basic profile
        profileData = {
          uid: user.uid,
          name: user.displayName || "User",
          email: user.email,
          phone: "",
          avatar: user.photoURL || "https://randomuser.me/api/portraits/men/32.jpg",
          isAdmin: isFirebaseAdmin || !!emailBasedAdmin,
          adminInfo: emailBasedAdmin || null
        };
      }

      // If user is an admin via email but not via Firebase UID, we should add them to Firebase admins
      if (emailBasedAdmin && !isFirebaseAdmin) {
        console.log("User is admin by email but not in Firebase admins node");
        // You might want to add a function here to sync admin status to Firebase
        // This ensures consistency between email-based and UID-based admin checks
      }

      setProfile(profileData);
      localStorage.setItem("profile", JSON.stringify(profileData));

      if (profileData.isAdmin) {
        localStorage.setItem("isAdmin", "true");
      } else {
        localStorage.removeItem("isAdmin");
      }

      if (rememberMe) {
        localStorage.setItem("rememberMe", "true");
        localStorage.setItem("userEmail", email);
      } else {
        localStorage.removeItem("rememberMe");
        localStorage.removeItem("userEmail");
      }

      // Redirect based on user type
      if (profileData.isAdmin) {
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
          <div className="password-wrapper">
  <input
    type={showPassword ? "text" : "password"}
    name="password"
    placeholder={t("enter_password")}
    value={formData.password}
    onChange={handleChange}
    required
    className="password-input"
  />

  <button
    type="button"
    className="toggle-password"
    onClick={() => setShowPassword(!showPassword)}
  >
    {showPassword ? (
      // Eye Off
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M3 3l18 18M10.58 10.58a2 2 0 002.83 2.83M9.88 5.09A9.77 9.77 0 0112 5c5 0 9 7 9 7a18.9 18.9 0 01-3.23 4.36M6.53 6.53A18.67 18.67 0 003 12s4 7 9 7a9.77 9.77 0 004.91-1.38" />
      </svg>
    ) : (
      // Eye
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    )}
  </button>
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