// src/components/Navbar.jsx
import React, { useState, useEffect, useRef } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import logoUrl from "../assets/logo.png";
import { useLanguage } from "../contexts/LanguageContext";
import { otherServices } from "../data/services";

export default function Navbar({ profile, handleLogout, onProfileClick = () => { } }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const servicesTimeoutRef = useRef(null);

  // Get service options from your data
  const serviceOptions = Object.keys(otherServices);

  useEffect(() => {
    setMenuOpen(false);
    setIsServicesOpen(false);
    return () => {
      if (servicesTimeoutRef.current) {
        clearTimeout(servicesTimeoutRef.current);
      }
    };
  }, [location]);

  const closeMenu = () => setMenuOpen(false);

  const handleMouseEnterServices = () => {
    if (servicesTimeoutRef.current) {
      clearTimeout(servicesTimeoutRef.current);
    }
    setIsServicesOpen(true);
  };

  const handleMouseLeaveServices = () => {
    servicesTimeoutRef.current = setTimeout(() => {
      setIsServicesOpen(false);
    }, 200);
  };

  const handleServiceSelect = (service) => {
    closeMenu();
    setIsServicesOpen(false);
    
    // Navigate to service page with selected service
    navigate(`/service?service=${encodeURIComponent(service)}`, {
      state: { selectedService: service }
    });
  };

  const handleSectionNavigation = (sectionId, isFooter = false) => {
    closeMenu();
    setIsServicesOpen(false);
    if (location.pathname === "/") {
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          const scrollTo = isFooter ? document.body.scrollHeight : element.offsetTop - 80;
          window.scrollTo({ top: scrollTo, behavior: "smooth" });
        }
      }, 100);
    } else {
      window.location.href = `/#${sectionId}`;
    }
  };

  // Get proper display name
  const getDisplayName = () => {
    if (!profile) return "";

    if (profile.isDefaultAdmin) {
      return profile.displayName || profile.email?.split("@")[0] || "Admin";
    }

    return (
      profile.fullName ||
      profile.displayName ||
      profile.email?.split("@")[0] ||
      "User"
    );
  };

  // Get avatar initial letter
  const getAvatarInitial = () => {
    const name = getDisplayName();
    return name ? name.charAt(0).toUpperCase() : "?";
  };

  return (
    <nav className="tw-sticky tw-top-0 tw-z-50 tw-py-3 tw-backdrop-blur-md tw-bg-black/20 tw-shadow-lg">
      <div className="tw-flex tw-justify-between tw-items-center tw-w-full tw-px-4 lg:tw-px-6">
        <NavLink to="/" className="tw-flex tw-items-center tw-gap-2 tw-no-underline" onClick={closeMenu}>
          <img src={logoUrl} alt="Sai Import Exports & Agro" width="36" height="36" className="tw-block" />
          <span className="tw-font-bold tw-text-yellow-400 tw-text-lg">{t("brand")}</span>
        </NavLink>

        <button
          type="button"
          aria-label="Toggle navigation menu"
          className="tw-text-yellow-400 hover:tw-text-yellow-300 tw-transition tw-duration-150 lg:tw-hidden tw-p-2 focus:tw-outline-none"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="tw-text-yellow-400">
            {menuOpen ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>

        <div
          className={`${menuOpen ? "tw-flex" : "tw-hidden"}
            } tw-flex-col lg:tw-flex lg:tw-flex-row tw-w-full lg:tw-w-auto 
          tw-bg-black/50 tw-backdrop-blur-md tw-rounded-xl
          tw-pt-4 lg:tw-pt-0 tw-gap-6 lg:tw-gap-8 
          tw-items-start lg:tw-items-center 
          tw-absolute lg:tw-relative tw-left-0 tw-right-0 tw-top-16 lg:tw-top-auto 
          tw-z-40 tw-px-6 lg:tw-px-0 tw-shadow-lg lg:tw-shadow-none`}
        >
          <ul className="tw-flex tw-flex-col lg:tw-flex-row tw-gap-6 tw-w-full lg:tw-w-auto">
            <li>
              <NavLink end to="/" className={({ isActive }) => `tw-block tw-py-1 tw-text-yellow-400 hover:tw-text-yellow-300 hover:tw-underline tw-transition tw-duration-150 ${isActive ? "tw-text-white tw-font-medium" : ""}`} onClick={closeMenu}>
                {t("home")}
              </NavLink>
            </li>

            <li>
              <NavLink to="/about" className="tw-block tw-py-1 tw-text-yellow-400 hover:tw-text-yellow-300 hover:tw-underline tw-transition tw-duration-150" onClick={closeMenu}>
                {t("about_us")}
              </NavLink>
            </li>

            <li>
              <NavLink to="/products" className="tw-block tw-py-1 tw-text-yellow-400 hover:tw-text-yellow-300 hover:tw-underline tw-transition tw-duration-150" onClick={closeMenu}>
                {t("products")}
              </NavLink>
            </li>

            <li>
              <NavLink to="/market-rates" className="tw-block tw-py-1 tw-text-yellow-400 hover:tw-text-yellow-300 hover:tw-underline tw-transition tw-duration-150" onClick={closeMenu}>
                {t("market_rates")}
              </NavLink>
            </li>

            {/* Services Dropdown - Hover Based */}
            <li 
              className="tw-relative"
              onMouseEnter={handleMouseEnterServices}
              onMouseLeave={handleMouseLeaveServices}
            >
              <NavLink
                to="/service"
                className={({ isActive }) => `tw-flex tw-items-center tw-gap-1 tw-py-1 tw-text-yellow-400 hover:tw-text-yellow-300 hover:tw-underline tw-transition tw-duration-150 tw-font-medium ${isActive ? "tw-text-white" : ""}`}
              >
                {t("services")}
                <div className={`tw-transition-transform tw-duration-200 ${isServicesOpen ? "tw-rotate-180" : ""}`}>
                  <svg className="tw-w-4 tw-h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </NavLink>
              
              {/* Simple Dropdown Menu - No boxes, just simple list */}
              {isServicesOpen && (
                <div 
                  className="tw-absolute tw-left-0 tw-top-full tw-mt-2 tw-min-w-48 tw-bg-gray-900 tw-rounded-lg tw-shadow-xl tw-z-50"
                  onMouseEnter={() => {
                    if (servicesTimeoutRef.current) {
                      clearTimeout(servicesTimeoutRef.current);
                    }
                    setIsServicesOpen(true);
                  }}
                  onMouseLeave={handleMouseLeaveServices}
                >
                  <div className="tw-py-2">
                    {serviceOptions.map((serviceOpt, idx) => (
                      <button
                        key={`${serviceOpt}-${idx}`}
                        onClick={() => handleServiceSelect(serviceOpt)}
                        className="tw-block tw-w-full tw-text-left tw-px-4 tw-py-3 tw-text-yellow-400 hover:tw-bg-gray-800 tw-transition tw-duration-150 tw-border-t tw-border-gray-700 first:tw-border-t-0"
                      >
                        {serviceOpt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </li>

            {/* Sample Courier Service as separate link */}
            <li>
              <NavLink to="/sample-courier" className="tw-block tw-py-1 tw-text-yellow-400 hover:tw-text-yellow-300 hover:tw-underline tw-transition tw-duration-150" onClick={closeMenu}>
                {t("request_rice_samples")}
              </NavLink>
            </li>

            <li>
              <NavLink to="/join-us" className="tw-block tw-py-1 tw-text-yellow-400 hover:tw-text-yellow-300 hover:tw-underline tw-transition tw-duration-150" onClick={closeMenu}>
                {t("join_us")}
              </NavLink>
            </li>

            <li>
              <NavLink to="/blog" className="tw-block tw-py-1 tw-text-yellow-400 hover:tw-text-yellow-300 hover:tw-underline tw-transition tw-duration-150" onClick={closeMenu}>
                {t("blog")}
              </NavLink>
            </li>

            <li>
              <NavLink to="/contact" className="tw-block tw-py-1 tw-text-yellow-400 hover:tw-text-yellow-300 hover:tw-underline tw-transition tw-duration-150" onClick={closeMenu}>
                {t("contact")}
              </NavLink>
            </li>

            {profile ? (
              <li>
                <button
                  onClick={() => {
                    closeMenu();
                    onProfileClick();
                  }}
                  className="tw-flex tw-items-center tw-gap-3 tw-px-4 tw-py-2 tw-rounded-lg tw-bg-gray-800/50 hover:tw-bg-gray-700 tw-transition tw-duration-200 tw-font-medium tw-text-white"
                >
                  <div className="tw-w-6 tw-h-6 tw-rounded-full tw-overflow-hidden tw-shadow-md tw-ring-2 tw-ring-yellow-500">
                    {profile.avatar ? (
                      <img
                        src={profile.avatar}
                        alt="Profile"
                        className="tw-w-full tw-h-full tw-object-cover"
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.parentNode.style.background = "linear-gradient(to bottom right, #22c55e, #3b82f6)";
                          e.target.parentNode.innerHTML += `<span class="tw-flex tw-items-center tw-justify-center tw-w-full tw-h-full tw-text-white tw-font-bold tw-text-sm">${getAvatarInitial()}</span>`;
                        }}
                      />
                    ) : (
                      <div className="tw-w-full tw-h-full tw-bg-gradient-to-br tw-from-green-500 tw-to-blue-500 tw-flex tw-items-center tw-justify-center tw-text-sm tw-font-bold">
                        {getAvatarInitial()}
                      </div>
                    )}
                  </div>
                  
                  {/* Dropdown Arrow */}
                  <svg className="tw-w-4 tw-h-4 tw-text-yellow-400 tw-hidden sm:tw-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </li>
            ) : (
              <>
                <li>
                  <NavLink to="/login" className="tw-block tw-w-full lg:tw-w-auto tw-bg-yellow-400 tw-text-black tw-px-6 tw-py-2 tw-rounded tw-font-medium hover:tw-bg-yellow-300 tw-transition tw-duration-150" onClick={closeMenu}>
                    {t("login")}
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/register" className="tw-block tw-w-full lg:tw-w-auto tw-bg-yellow-400 tw-text-black tw-px-6 tw-py-2 tw-rounded tw-font-medium hover:tw-bg-yellow-300 tw-transition tw-duration-150" onClick={closeMenu}>
                    {t("register")}
                  </NavLink>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}