import { useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import { useState, useEffect } from "react";

import { db } from "../firebase";
import { ref, onValue } from "firebase/database";

export default function Products() {
  const navigate = useNavigate();
  const { t, currentLang } = useLanguage();

  const [currency, setCurrency] = useState("INR");
  const [showDropdown, setShowDropdown] = useState(false);
  const [featuredProducts, setFeaturedProducts] = useState([]);

  const goToProd = () => navigate("/Products-All");

  const currencies = [
    { code: "INR", symbol: "₹", rate: 1 },
    { code: "USD", symbol: "$", rate: 1 / 83.5 },
    { code: "EUR", symbol: "€", rate: 1 / 90.2 },
    { code: "GBP", symbol: "£", rate: 1 / 108.5 },
  ];

  const currentCurrency = currencies.find((c) => c.code === currency);

  // 🔹 Fetch top 4 products
  useEffect(() => {
    const r = ref(db, "products");
    const unsub = onValue(r, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const list = Object.keys(data).map((key) => ({
          ...data[key],
          firebaseId: key,
        }));
        setFeaturedProducts(list.slice(0, 4));
      } else {
        setFeaturedProducts([]);
      }
    });
    return () => unsub();
  }, []);

  const parseMinMaxFromString = (priceStr) => {
    if (!priceStr || typeof priceStr !== "string") return null;
    const m = priceStr.match(/[\d,]+/g);
    if (!m || m.length < 2) return null;
    return m.slice(0, 2).map((s) => Number(s.replace(/,/g, "")));
  };

  const formatPrice = (product) => {
    const parsed = parseMinMaxFromString(product.price);
    if (!parsed) return "N/A";
    const [min, max] = parsed;
    const rate = currentCurrency.rate || 1;
    return `${currentCurrency.symbol}${Math.round(
      min * rate
    )} – ${currentCurrency.symbol}${Math.round(max * rate)} / qtl`;
  };

  const fallbackImages = {
    "1121 Basmati": "./img/1121_Golden_Basamati.jpg",
    "1401 Basmati": "./img/1401_Steam_Basamati.jpg",
    "Pusa Basmati": "./img/Pusa_Basmati.jpg",
    "1885 Basmati": "./img/1885_Basmati.jpg",
  };

  const getProductImage = (product) =>
    product.image ||
    fallbackImages[product.name?.en] ||
    "./img/default_rice.jpg";

  const getProductTitle = (product) =>
    product.name?.[currentLang] ||
    product.name?.en ||
    "Premium Basmati Rice";

  const getProductDesc = (product) =>
    product.desc?.[currentLang] ||
    product.desc?.en ||
    t("premium_basmati_1121_desc");

  return (
    <div className="tw-min-h-screen tw-w-full tw-py-8 sm:tw-py-12 tw-px-4 sm:tw-px-8 tw-flex tw-flex-col">
      {/* Title + Currency */}
      <div className="tw-relative tw-flex tw-justify-center tw-items-center tw-mb-8">
        <h1 className="tw-text-3xl sm:tw-text-4xl tw-font-extrabold tw-text-yellow-400">
          {t("products_title")}
        </h1>

        {/* ✅ CURRENCY BUTTON (RESTORED) */}
        <div className="tw-absolute tw-right-0 tw-mt-10 sm:tw-mt-0">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="tw-bg-black/50 tw-backdrop-blur-md tw-border tw-border-yellow-400/40 tw-text-yellow-300 tw-px-4 tw-py-2 tw-rounded-lg tw-font-semibold hover:tw-bg-yellow-400 hover:tw-text-black"
          >
            {currentCurrency.symbol} {currentCurrency.code}
          </button>

          {showDropdown && (
            <div className="tw-absolute tw-right-0 tw-mt-2 tw-w-32 tw-bg-black/80 tw-backdrop-blur-lg tw-border tw-border-yellow-400/30 tw-rounded-lg tw-shadow-xl tw-z-50 tw-py-1">
              {currencies.map((curr) => (
                <button
                  key={curr.code}
                  onClick={() => {
                    setCurrency(curr.code);
                    setShowDropdown(false);
                  }}
                  className="tw-w-full tw-text-left tw-px-4 tw-py-2 tw-text-sm tw-text-yellow-200 hover:tw-bg-yellow-400/20"
                >
                  {curr.symbol} {curr.code}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Product Grid */}
      <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-4 tw-gap-6">
        {featuredProducts.map((product) => (
          <div
            key={product.firebaseId}
            className="tw-bg-black/40 tw-backdrop-blur-xl tw-border tw-border-yellow-500/20 tw-rounded-2xl tw-shadow-2xl tw-flex tw-flex-col hover:tw-scale-105 tw-transition"
          >
            {/* IMAGE */}
            <img
              src={getProductImage(product)}
              alt={getProductTitle(product)}
              className="tw-w-full tw-h-40 tw-object-cover tw-rounded-t-2xl"
              onError={(e) => {
                e.target.src = "./img/default_rice.jpg";
              }}
            />

            <div className="tw-p-4 tw-flex tw-flex-col tw-flex-1">
              <h3 className="tw-text-xl tw-font-bold tw-text-yellow-400">
                {getProductTitle(product)}
              </h3>

              <p className="tw-text-sm tw-text-yellow-100 tw-mt-1 tw-line-clamp-3 tw-flex-1">
                {getProductDesc(product)}
              </p>

              <span className="tw-mt-3 tw-font-extrabold tw-text-yellow-400">
                {formatPrice(product)}
              </span>

              {/* ✅ VIEW DETAILS (ONLY ADDITION) */}
              <button
                onClick={() =>
                  navigate("/Products-All", {
                    state: {
                      openDetails: true,
                      productId: product.firebaseId,
                      from: "/products",
                    },
                  })
                }
                className="tw-mt-4 tw-bg-yellow-400 tw-text-black tw-px-4 tw-py-2 tw-rounded-lg tw-font-semibold hover:tw-bg-yellow-300"
              >
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* View All */}
      <div className="tw-mt-10 tw-text-center">
        <button
          onClick={goToProd}
          className="tw-bg-black/40 tw-backdrop-blur-lg tw-border tw-border-yellow-400/50 tw-text-yellow-300 tw-px-8 tw-py-4 tw-rounded-xl tw-text-lg tw-font-bold hover:tw-bg-yellow-400 hover:tw-text-black"
        >
          {t("view_all_products")}
        </button>
      </div>
    </div>
  );
}
