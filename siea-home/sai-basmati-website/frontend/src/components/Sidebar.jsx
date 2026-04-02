import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const Sidebar = ({ filteredCategory, setFilteredCategory, isOpen, toggleSidebar }) => {
  const { t } = useLanguage();

  const handleCategoryClick = (value) => {
    setFilteredCategory(value);
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        className={`sidebar-toggle-btn ${isOpen ? 'open' : ''}`}
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
      >
        {isOpen ? '✕' : '=>'}
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="sidebar-backdrop open"
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`sidebar glass ${isOpen ? 'open' : ''}`}
        aria-label="Product categories"
      >
        <nav className="sidebar-nav">

          {/* Categories */}
          <h3 className="sidebar-title">{t('categories')}</h3>

          <button
            className={`category-btn ${filteredCategory === 'Basmati Rice' ? 'active' : ''}`}
            onClick={() => handleCategoryClick('Basmati Rice')}
          >
            {t('basmati_rice')}
          </button>

          <button
            className={`category-btn ${filteredCategory === 'Non Basmati Rice' ? 'active' : ''}`}
            onClick={() => handleCategoryClick('Non Basmati Rice')}
          >
            {t('non_basmati_rice')}
          </button>

          {/* Brands Section */}
          <h3 className="sidebar-title" style={{ marginTop: "20px" }}>
            Our Brands
          </h3>

          <button
            className={`category-btn ${filteredCategory === 'AANAK' ? 'active' : ''}`}
            onClick={() => handleCategoryClick('AANAK')}
          >
            AANAK
          </button>

        </nav>
      </aside>
    </>
  );
};

export default Sidebar;