import { useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import { useState, useEffect } from "react";
import { db } from "../firebase";
import { ref, onValue, get } from "firebase/database";

export default function Products() {
  const navigate = useNavigate();
  const { t, currentLang } = useLanguage();

  const [currency, setCurrency] = useState("INR");
  const [exchangeRates, setExchangeRates] = useState({});
  const [showDropdown, setShowDropdown] = useState(false);
  const [featuredProducts, setFeaturedProducts] = useState([]);

  const goToProd = () => navigate("/Products-All");

  // Currency symbols
  const currencySymbols = {
    USD: "$",
    INR: "₹",
    EUR: "€",
    GBP: "£",
    AED: "د.إ",
  };

  // 🔹 Fetch exchange rates
  useEffect(() => {
    const fetchRates = async () => {
      const r = ref(db, "exchangeRates/rates");
      const snap = await get(r);
      if (snap.exists()) {
        setExchangeRates(snap.val());
      }
    };
    fetchRates();
  }, []);

  // 🔹 Fetch top 4 products
  useEffect(() => {
    const r = ref(db, "products");

    const unsub = onValue(r, (snap) => {
      if (snap.exists()) {
        const data = snap.val();

        let all = [];

        Object.keys(data).forEach((brand) => {
          const brandProducts = data[brand];

          if (Array.isArray(brandProducts)) {
            const formatted = brandProducts
              .filter(Boolean) // remove nulls
              .map((p, index) => ({
                ...p,
                brand: p.brand || brand,
                firebaseId: `${brand}_${index}`,
              }));

            all = [...all, ...formatted];
          }
        });

        // 👉 only first 4
        setFeaturedProducts(
          [...all].sort(() => 0.5 - Math.random()).slice(0, 4)
        );
      } else {
        setFeaturedProducts([]);
      }
    });

    return () => unsub();
  }, []);
  // 🔹 Price Conversion Logic
  const formatPrice = (product) => {
    const symbol = currencySymbols[currency] || "₹";

    // ✅ SIEA (has price)
    if (product.price) {
      const numbers = product.price.toString().match(/[\d,]+/g);
      if (!numbers) return "N/A";

      const min = Number(numbers[0].replace(/,/g, ""));
      const max = numbers[1] ? Number(numbers[1].replace(/,/g, "")) : null;

      if (currency === "INR") {
        return max
          ? `₹${min.toLocaleString()} – ₹${max.toLocaleString()} / qtl`
          : `₹${min.toLocaleString()} / qtl`;
      }

      if (!exchangeRates.INR) return "Loading...";

      const inrPerUsd = exchangeRates.INR;
      const targetRate = exchangeRates[currency];
      if (!targetRate) return "N/A";

      const convert = (val) => Math.round((val / inrPerUsd) * targetRate);

      return max
        ? `${symbol}${convert(min)} – ${symbol}${convert(max)} / qtl`
        : `${symbol}${convert(min)} / qtl`;
    }

    // ✅ AANAK (calculate from grades)
    if (product.grades) {
      let prices = [];

      product.grades.forEach((g) => {
        g.packs?.forEach((p) => {
          prices.push(p.price);
        });
      });

      if (prices.length > 0) {
        const min = Math.min(...prices);
        const max = Math.max(...prices);

        return `${symbol}${min} – ${symbol}${max} per pack`;
      }
    }

    return "Price on request";
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

        <div className="tw-absolute tw-right-0 tw-mt-10 sm:tw-mt-0">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="tw-bg-black/50 tw-border tw-border-yellow-400/40 tw-text-yellow-300 tw-px-4 tw-py-2 tw-rounded-lg tw-font-semibold"
          >
            {currencySymbols[currency]} {currency}
          </button>

          {showDropdown && (
            <div className="tw-absolute tw-right-0 tw-mt-2 tw-w-32 tw-bg-black/80 tw-border tw-border-yellow-400/30 tw-rounded-lg tw-shadow-xl tw-z-50 tw-py-1">
              {Object.keys(exchangeRates).map((code) => (
                <button
                  key={code}
                  onClick={() => {
                    setCurrency(code);
                    setShowDropdown(false);
                  }}
                  className="tw-w-full tw-text-left tw-px-4 tw-py-2 tw-text-sm tw-text-yellow-200 hover:tw-bg-yellow-400/20"
                >
                  {currencySymbols[code]} {code}
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
            className="tw-bg-black/40 tw-border tw-border-yellow-500/20 tw-rounded-2xl tw-shadow-2xl tw-flex tw-flex-col"
          >
            <img
              src={getProductImage(product)}
              alt={getProductTitle(product)}
              className="tw-w-full tw-h-40 tw-object-cover tw-rounded-t-2xl"
              onError={(e) => {
                e.target.src = "./img/default_rice.webp";
              }}
            />

            <div className="tw-p-4 tw-flex tw-flex-col tw-flex-1">
              <h3 className="tw-text-xl tw-font-bold tw-text-yellow-400">
                {getProductTitle(product)}
              </h3>

              <p className="tw-text-sm tw-text-yellow-100 tw-mt-1 tw-flex-1">
                {getProductDesc(product)}
              </p>

              <span className="tw-mt-3 tw-font-extrabold tw-text-yellow-400">
                {formatPrice(product)}
              </span>

              <button
                onClick={() =>
                  navigate("/Products-All", {
                    state: {
                      openDetails: true,
                      productId: product.firebaseId,
                    },
                  })
                }
                className="tw-mt-4 tw-bg-yellow-400 tw-text-black tw-px-4 tw-py-2 tw-rounded-lg tw-font-semibold"
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
          className="tw-bg-black/40 tw-border tw-border-yellow-400/50 tw-text-yellow-300 tw-px-8 tw-py-4 tw-rounded-xl tw-text-lg tw-font-bold"
        >
          {t("view_all_products")}
        </button>
      </div>
    </div>
  );
}