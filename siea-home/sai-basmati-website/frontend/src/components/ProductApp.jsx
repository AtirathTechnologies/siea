import React, { useState, useEffect, useRef } from "react";
import { useLanguage } from '../contexts/LanguageContext';
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";
import Sidebar from '../components/Sidebar';
import ProductsGrid from '../pages/ProductsGrid';
import BuyModal from '../pages/BuyModal';
import ThankYouPopup from '../components/ThankYouPopup';
import BasmatiRSSFeed from "../components/BasmatiRSSFeed";
import ProductDetailsPanel from '../pages/ProductDetailsPanel';
import { useLocation, useNavigate } from "react-router-dom";
import '../Prod.css';

const AppContent = ({ profile, showWarning, searchQuery }) => {
  const { t } = useLanguage();

  const location = useLocation();
  const navigate = useNavigate();

  // Currency State
  const [currency, setCurrency] = useState("INR");
  const [showDropdown, setShowDropdown] = useState(false);

  const [allProducts, setAllProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [filteredCategory, setFilteredCategory] = useState('Basmati Rice');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [isThankYouOpen, setIsThankYouOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showRssFeed, setShowRssFeed] = useState(true);
  const [detailsProduct, setDetailsProduct] = useState(null);
  const productsContainerRef = useRef(null);

  // ---------- AUTO‑REOPEN MODAL AFTER SEAFREIGHT (CIF DESTINATION SELECTION) ----------
  useEffect(() => {
    const checkAndOpenModal = () => {
      const modalData = localStorage.getItem('seaFreightModalData');
      const returnTo = localStorage.getItem('seaFreightReturnTo');
      const normalizedPath = window.location.pathname.replace(/\/$/, '');

      if (modalData && returnTo === normalizedPath) {
        try {
          const data = JSON.parse(modalData);
          // Restore the product (for single‑product orders)
          if (data.product) {
            setSelectedProduct(data.product);
          }
          // Cart orders are handled separately in Cart.jsx
        } catch (error) {
          console.error('Error parsing seaFreightModalData:', error);
        }

        // Open the modal
        setIsBuyModalOpen(true);
        // Clean up modal data – we only need it once
        localStorage.removeItem('seaFreightModalData');
        // seaFreightReturnTo will be removed by BuyModal or Cart when modal opens
      }
    };

    // Run immediately on mount
    checkAndOpenModal();

    // Also listen for storage events (in case the navigation doesn't remount the component)
    const handleStorageChange = (e) => {
      if (e.key === 'seaFreightReturnTo' || e.key === 'seaFreightModalData') {
        checkAndOpenModal();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [location.pathname]); // Re-run when pathname changes

  useEffect(() => {
    if (detailsProduct && productsContainerRef.current) {
      requestAnimationFrame(() => {
        productsContainerRef.current.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      });
    }
  }, [detailsProduct]);

  // Currency Configuration
  const currencies = [
    { code: "INR", symbol: "₹", rate: 1 },
    { code: "USD", symbol: "$", rate: 1 / 83.5 },
    { code: "EUR", symbol: "€", rate: 1 / 90.2 },
    { code: "GBP", symbol: "£", rate: 1 / 108.5 },
  ];

  const currentCurrency = currencies.find(c => c.code === currency) || currencies[0];

  // Helper functions to pass down
  const getConversionRate = () => currentCurrency.rate;
  const getCurrencySymbol = () => currentCurrency.symbol;

  // Fetch products + preserve Firebase key as firebaseId
  useEffect(() => {
    const r = ref(db, "products");
    const unsubscribe = onValue(r, snap => {
      if (snap.exists()) {
        const data = snap.val();
        const list = Object.keys(data).map(key => ({
          ...data[key],
          firebaseId: key
        }));
        setAllProducts(list);
        setFilteredProducts(list);
      } else {
        setAllProducts([]);
        setFilteredProducts([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Handle opening product details from navigation state
  useEffect(() => {
    if (
      location.state?.openDetails &&
      location.state?.productId &&
      allProducts.length > 0
    ) {
      const product = allProducts.find(
        (p) =>
          p.firebaseId === location.state.productId ||
          p.id === location.state.productId
      );

      if (product) {
        setDetailsProduct(product);
        setShowRssFeed(false);
      }
    }
  }, [location.state, allProducts]);

  // Filter products based on category and search query
  useEffect(() => {
    let filtered = allProducts;

    if (filteredCategory !== "All") {
      filtered = filtered.filter(p => p.category === filteredCategory);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();

      filtered = filtered.filter(p =>
        Object.values(p.name || {}).some(v =>
          v?.toLowerCase().includes(q)
        ) ||
        Object.values(p.desc || {}).some(v =>
          v?.toLowerCase().includes(q)
        )
      );
    }

    setFilteredProducts(filtered);
  }, [filteredCategory, searchQuery, allProducts]);

  // Unified handler for "Buy" or "Details" from the product card
  const showBuyQuery = (productId, type = "buy") => {
    const product = allProducts.find(
      p => p.firebaseId === productId || p.id === productId
    );

    if (type === "details") {
      setIsSidebarOpen(false);
      setShowRssFeed(false);
      setDetailsProduct(product);
    } else {
      setSelectedProduct(product);
      setIsBuyModalOpen(true);
    }
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="flex flex-1">
      <div className={showRssFeed ? "" : "tw-hidden"}>
        <BasmatiRSSFeed />
      </div>

      {/* Currency Selector - Top Right */}
      <div className="tw-fixed tw-top-25 sm:tw-top-21 tw-right-4 sm:tw-right-8 tw-z-50">
        <div className="tw-relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="tw-bg-black/60 tw-backdrop-blur-md tw-border tw-border-yellow-400/40 tw-text-yellow-300 tw-px-5 tw-py-2.5 tw-rounded-xl tw-text-sm sm:tw-text-base tw-font-bold tw-transition-all hover:tw-bg-yellow-400 hover:tw-text-black hover:tw-scale-105"
          >
            {currentCurrency.symbol} {currentCurrency.code}
          </button>

          {showDropdown && (
            <div className="tw-absolute tw-right-0 tw-mt-2 tw-w-36 tw-bg-black/90 tw-backdrop-blur-xl tw-border tw-border-yellow-400/30 tw-rounded-xl tw-shadow-2xl tw-z-50 tw-py-2">
              {currencies.map(curr => (
                <button
                  key={curr.code}
                  onClick={() => {
                    setCurrency(curr.code);
                    setShowDropdown(false);
                  }}
                  className="tw-w-full tw-text-left tw-px-5 tw-py-3 tw-text-sm tw-font-medium tw-text-yellow-200 hover:tw-bg-yellow-400/20"
                >
                  {curr.symbol} {curr.code}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 mt-14">
        {/* Sidebar (only visible when no product details are shown) */}
        {!detailsProduct && (
          <div
            className={`fixed top-[60px] bottom-[64px] transition-all duration-300 ${
              detailsProduct ? "tw-hidden" : isSidebarOpen ? "w-64" : "w-0"
            } bg-[#111111] z-40 overflow-hidden`}
          >
            <Sidebar
              filteredCategory={filteredCategory}
              setFilteredCategory={setFilteredCategory}
              isOpen={isSidebarOpen}
              toggleSidebar={toggleSidebar}
            />
          </div>
        )}

        {/* Main content area */}
        <div
          ref={productsContainerRef}
          className={`products-container flex-1 transition-all duration-300 p-4 ${
            detailsProduct
              ? 'details-open'
              : isSidebarOpen
              ? 'sidebar-open'
              : ''
          }`}
        >
          {detailsProduct ? (
            <ProductDetailsPanel
              product={detailsProduct}
              allProducts={allProducts}
              profile={profile}
              onBack={() => {
                if (location.state?.from === "/products") {
                  navigate(-1);
                } else {
                  setDetailsProduct(null);
                  setShowRssFeed(true);
                }
              }}
              onEnquire={() => {
                if (!profile) {
                  showWarning();
                  return;
                }
                setSelectedProduct(detailsProduct);
                setIsBuyModalOpen(true);
              }}
              onViewDetails={(prod) => {
                setDetailsProduct(prod);
              }}
              getConversionRate={getConversionRate}
              getCurrencySymbol={getCurrencySymbol}
            />
          ) : (
            <ProductsGrid
              products={filteredProducts}
              showBuyQuery={showBuyQuery}
              profile={profile}
              showWarning={showWarning}
              currency={currency}
              getConversionRate={getConversionRate}
              getCurrencySymbol={getCurrencySymbol}
            />
          )}
        </div>
      </div>

      {/* BuyModal – used for both single‑product and cart orders */}
      <BuyModal
        isOpen={isBuyModalOpen}
        onClose={() => {
          setIsBuyModalOpen(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
        products={allProducts}
        onSubmit={() => {
          setIsBuyModalOpen(false);
          setIsThankYouOpen(true);
        }}
        profile={profile}
        currency={currency}
        getConversionRate={getConversionRate}
        getCurrencySymbol={getCurrencySymbol}
      />

      <ThankYouPopup
        isOpen={isThankYouOpen}
        onClose={() => setIsThankYouOpen(false)}
      />
    </div>
  );
};

const ProductApp = ({ profile, setProfile, showWarning, searchQuery }) => (
  <AppContent
    profile={profile}
    showWarning={showWarning}
    searchQuery={searchQuery}
  />
);

export default ProductApp;