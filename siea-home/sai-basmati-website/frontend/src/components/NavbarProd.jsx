import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useCart } from '../contexts/CartContext.jsx';
import Logo from '../assets/logo.png';

const NavbarProd = ({ searchProducts, showProductsPage, showProfilePanel, profile }) => {
  const { t } = useLanguage();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const menuRef = useRef(null);
  const hamburgerRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';
  const isTransport = location.pathname === '/transport';
  const isSeaFreight = location.pathname === '/sea-freight';

  const toggleNav = () => {
    setIsNavOpen(!isNavOpen);
    if (!isNavOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  };

  const { cartCount } = useCart();

  const handleGoHome = () => {
    if (!isHome) navigate('/');
    if (isNavOpen) {
      setIsNavOpen(false);
      document.body.style.overflow = 'auto';
    }
  };

  const handleGoTransport = () => {
    if (!isTransport) navigate('/transport');
    if (isNavOpen) {
      setIsNavOpen(false);
      document.body.style.overflow = 'auto';
    }
  };

  const handleGoSeaFreight = () => {
    if (!isSeaFreight) navigate('/sea-freight');
    if (isNavOpen) {
      setIsNavOpen(false);
      document.body.style.overflow = 'auto';
    }
  };

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isNavOpen &&
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        hamburgerRef.current &&
        !hamburgerRef.current.contains(event.target)
      ) {
        toggleNav();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isNavOpen]);

  // Auto-close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && isNavOpen) {
        setIsNavOpen(false);
        document.body.style.overflow = 'auto';
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isNavOpen]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  // Get display name (same logic as Navbar.jsx)
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

  // Get avatar initial (same logic as Navbar.jsx)
  const getAvatarInitial = () => {
    const name = getDisplayName();
    return name ? name.charAt(0).toUpperCase() : "?";
  };

  return (
    <nav className="navbar">
      <div className="navbar-logo-title" onClick={handleGoHome}>
        <img src={Logo} alt="Logo" className="navbar-logo" />
        <h1 className="navbar-title">SIEA</h1>
      </div>

      <div className="navbar-right">
        <div className="search-container">
          <input
            id="searchInput"
            type="text"
            placeholder={`${t('products')}...`}
            className="search-input"
            onChange={(e) => searchProducts(e.target.value)}
          />
        </div>

        <button
          ref={hamburgerRef}
          className="hamburger-btn"
          onClick={toggleNav}
          aria-label="Toggle menu"
          aria-expanded={isNavOpen}
        >
          <span className="hamburger-icon">
            <span className={`hamburger-line ${isNavOpen ? 'open' : ''}`}></span>
            <span className={`hamburger-line ${isNavOpen ? 'open' : ''}`}></span>
            <span className={`hamburger-line ${isNavOpen ? 'open' : ''}`}></span>
          </span>
        </button>
      </div>

      <div className={`navbar-backdrop ${isNavOpen ? 'open' : ''}`} onClick={toggleNav}></div>

      <div ref={menuRef} className={`navbar-menu ${isNavOpen ? 'open' : ''}`}>
        <button
          className={`nav-btn ${isHome ? 'active' : ''}`}
          onClick={handleGoHome}
          aria-current={isHome ? 'page' : undefined}
        >
          <span className="icon">&#8962;</span>
          <span>{t('home')}</span>
        </button>

        <button className="nav-btn" onClick={showProductsPage}>
          <span>{t('products')}</span>
        </button>

        <button
          className={`nav-btn ${isTransport ? 'active' : ''}`}
          onClick={handleGoTransport}
          aria-current={isTransport ? 'page' : undefined}
        >
          <span className="icon">&#128666;</span>
          <span>{t('transport')}</span>
        </button>

        <button
          className={`nav-btn ${isSeaFreight ? 'active' : ''}`}
          onClick={handleGoSeaFreight}
          aria-current={isSeaFreight ? 'page' : undefined}
          style={{ whiteSpace: 'nowrap' }}
        >
          <span className="icon">&#128674;</span>
          <span>{t('ocean_freight')}</span>
        </button>

        {/* Add this cart button in the desktop section */}
        <button
          onClick={() => navigate('/cart')}
          className="tw-relative tw-bg-transparent tw-border tw-border-yellow-400 tw-text-yellow-400 tw-p-2 tw-rounded-lg tw-flex tw-items-center tw-justify-center tw-w-10 tw-h-10 hover:tw-bg-yellow-400/20 tw-transition"
          aria-label="Shopping Cart"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="tw-w-6 tw-h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>

          {cartCount > 0 && (
            <span className="tw-absolute -tw-top-2 -tw-right-2 tw-bg-red-500 tw-text-white tw-text-xs tw-font-bold tw-rounded-full tw-w-5 tw-h-5 tw-flex tw-items-center tw-justify-center">
              {cartCount}
            </span>
          )}
        </button>

        <button
          className="tw-flex tw-items-center tw-gap-3 tw-px-4 tw-py-2 tw-rounded-lg tw-bg-gray-800/50 hover:tw-bg-gray-700 tw-transition tw-duration-200 tw-font-medium tw-text-white"
          onClick={showProfilePanel}
        >
          <div className="tw-w-6 tw-h-6 tw-rounded-full tw-overflow-hidden tw-shadow-md tw-ring-2 tw-ring-yellow-500">
            {profile?.avatar ? (
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
      </div>
    </nav>
  );
};

export default NavbarProd;