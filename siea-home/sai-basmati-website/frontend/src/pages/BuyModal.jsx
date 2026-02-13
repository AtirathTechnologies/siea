// BuyModal.jsx - COMPLETE with intelligent transport mode filtering, correct bill display,
// and domestic (India) handling: no port fields, no CIF option, but transport cost is calculated
// as a fixed amount PER BAG (Road ₹300/bag, Rail ₹250/bag, Air ₹350/bag).
// International fallback rates: Sea ₹800/ton, Air ₹1500/ton (per ton, as standard).

import React, { useState, useEffect, useRef } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import ThankYouPopup from "../components/ThankYouPopup";
import { submitQuote } from "../firebase";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";
import { useNavigate } from "react-router-dom";

// Fixed origin port – Mundra
const ORIGIN_PORT = "Mundra";

// Transport modes by destination type
const INTERNATIONAL_MODES = ["Sea Freight", "Air Freight"];
const DOMESTIC_MODES = ["Air Freight", "Roadways", "Rail Freight"]; // Sea Freight removed for India

// Freight rates
const DOMESTIC_FREIGHT_RATES_PER_BAG = {
  "Roadways": 300,
  "Rail Freight": 250,
  "Air Freight": 350,
};

const INTERNATIONAL_FALLBACK_RATES_PER_TON = {
  "Sea Freight": 800,
  "Air Freight": 1500,
};

const BuyModal = ({
  isOpen,
  onClose,
  product,
  profile,
  isCartOrder = false,
  cartItems = [],
  cartTotal = 0,
  onSubmitCartOrder = null,
}) => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  // ---------- Core order fields ----------
  const [grade, setGrade] = useState("");
  const [packing, setPacking] = useState("");
  const [quantity, setQuantity] = useState("");
  const [cif, setCif] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [customLogo, setCustomLogo] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [numberOfBags, setNumberOfBags] = useState(1); // single product only

  // ---------- Product grade & price ----------
  const [grades, setGrades] = useState([]);
  const [liveGradePricePerKg, setLiveGradePricePerKg] = useState(0); // INR

  // ---------- Customer information ----------
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [showThankYou, setShowThankYou] = useState(false);

  // ---------- Address ----------
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [addressCountry, setAddressCountry] = useState("");
  const [pincode, setPincode] = useState("");

  // ---------- Determine if destination is domestic (India) ----------
  const isDomestic = addressCountry?.toLowerCase() === "india";

  // ---------- Price breakdown (ALL stored in INR) ----------
  const [gradePriceINR, setGradePriceINR] = useState(0);     // per quintal
  const [packingPriceINR, setPackingPriceINR] = useState(0); // total
  const [quantityPriceINR, setQuantityPriceINR] = useState(0);
  const [logoPriceINR, setLogoPriceINR] = useState(0);
  const [freightPriceINR, setFreightPriceINR] = useState(0); // shipping cost
  const [totalPriceINR, setTotalPriceINR] = useState(0);

  // ---------- Exchange rates – stored as INR per foreign currency ----------
  const [exchangeRates, setExchangeRates] = useState({
    INR: 1,
    USD: 87.98,
    EUR: 102.33,
    GBP: 117.64,
  });

  // ---------- CIF destination & rates (only for international) ----------
  const [selectedDestination, setSelectedDestination] = useState(() => {
    const saved = localStorage.getItem("selectedCifDestination");
    return saved ? JSON.parse(saved) : null;
  });
  const [cifRatesData, setCifRatesData] = useState([]);
  const [cifPriceUSD, setCifPriceUSD] = useState(0);          // CIF rate in USD per MT (adjusted)
  const [cifPriceConverted, setCifPriceConverted] = useState(0); // displayed in selected currency

  // ---------- Transport mode state – selected directly in modal ----------
  const [transportMode, setTransportMode] = useState("Sea Freight");

  // ---------- When address country becomes India, clear destination, set CIF = No, and set default transport mode ----------
  useEffect(() => {
    if (isDomestic) {
      setSelectedDestination(null);
      setCif("No");
      // Default to first domestic mode (Air Freight) if current mode is Sea
      if (transportMode === "Sea Freight") {
        setTransportMode(DOMESTIC_MODES[0]);
      }
    }
  }, [isDomestic]);

  // ---------- Determine available modes based on destination country ----------
  const getAvailableModes = () => {
    if (!selectedDestination) return INTERNATIONAL_MODES;
    const country = selectedDestination.country?.toLowerCase();
    return country === "india" ? DOMESTIC_MODES : INTERNATIONAL_MODES;
  };

  const availableModes = getAvailableModes();

  // ---------- When destination changes, ensure selected mode is valid ----------
  useEffect(() => {
    if (selectedDestination?.mode) {
      // Prefer mode saved with destination
      setTransportMode(selectedDestination.mode);
    } else if (!availableModes.includes(transportMode)) {
      // If current mode not available, set default
      setTransportMode(availableModes[0] || "Sea Freight");
    }
  }, [selectedDestination]);

  // ---------- Refs ----------
  const canvasRef = useRef(null);

  // ---------- Constants ----------
  const countryOptions = [
    { value: "+91", flag: "India", name: "India", length: 10 },
    { value: "+1", flag: "USA", name: "USA", length: 10 },
    { value: "+44", flag: "UK", name: "UK", length: 10 },
    { value: "+971", flag: "UAE", name: "UAE", length: 9 },
    { value: "+61", flag: "Australia", name: "Australia", length: 9 },
    { value: "+98", flag: "Iran", name: "Iran", length: 10 },
  ];

  const quantityOptions = ["5kg", "10kg", "25kg", "50kg", "100kg", "1ton"];

  const currencyOptions = [
    { value: "INR", symbol: "₹" },
    { value: "USD", symbol: "$" },
    { value: "EUR", symbol: "€" },
    { value: "GBP", symbol: "£" },
  ];

  const packingPriceMap = {
    "PP (Polypropylene Woven Bags)": 43.99,
    "Non-Woven Bags": 52.79,
    "Jute Bags": 87.98,
    "BOPP (Biaxially Oriented Polypropylene) Laminated Bags": 61.59,
    "LDPE (Low Density Polyethylene) Pouches": 35.19,
  };

  // ---------- Helper: get total bags from cart items ----------
  const getCartTotalBags = () => {
    if (!isCartOrder) return 1;
    return cartItems.reduce((sum, item) => sum + (item.numberOfBags || 1), 0);
  };

  // ---------- Helper: get total weight from cart items (kg) ----------
  const getCartTotalWeightKg = () => {
    if (!isCartOrder) return 0;
    return cartItems.reduce((sum, item) => {
      let qtyPerBag = 0;
      if (item.quantity === "1ton") qtyPerBag = 1000;
      else if (typeof item.quantity === "string" && item.quantity.includes("kg"))
        qtyPerBag = parseFloat(item.quantity.replace("kg", "")) || 0;
      else if (typeof item.quantity === "number") qtyPerBag = item.quantity;
      const bags = item.numberOfBags || 1;
      return sum + qtyPerBag * bags;
    }, 0);
  };

  // ---------- Fetch product grades (single product only) ----------
  useEffect(() => {
    if (isCartOrder || !product?.firebaseId) return;

    const productRef = ref(db, `products/${product.firebaseId}/grades`);
    const unsubscribe = onValue(productRef, (snap) => {
      if (snap.exists()) {
        const gradesData = snap.val();
        const gradesArray = Object.keys(gradesData).map((key) => ({
          id: key,
          ...gradesData[key],
        }));

        const gradeNames = gradesArray.map((g) => g.grade).filter(Boolean);
        const selectedGradeObj = gradesArray.find((g) => g.grade === grade);

        setGrades(gradeNames);
        setLiveGradePricePerKg(
          selectedGradeObj?.price_inr_per_kg || selectedGradeObj?.price_inr || 0
        );
      } else {
        setGrades([]);
        setLiveGradePricePerKg(0);
      }
    });

    return () => unsubscribe();
  }, [product?.firebaseId, grade, isCartOrder]);

  // ---------- Pre‑fill from user profile ----------
  useEffect(() => {
    if (!isOpen || !profile?.uid) return;

    const usersRef = ref(db, "users");
    const unsubscribe = onValue(usersRef, (snap) => {
      const data = snap.val() || {};
      let matched = null;
      Object.keys(data).forEach((key) => {
        if (data[key].uid === profile.uid) matched = data[key];
      });

      if (matched) {
        setFullName((prev) => prev || matched.fullName || "");
        setEmail((prev) => prev || matched.email || profile.email || "");

        if (matched.phone) {
          const cleaned = matched.phone.replace(/\s+/g, "").replace(/[^+\d]/g, "");
          const matchedCountry = countryOptions.find((c) =>
            cleaned.startsWith(c.value)
          );
          if (matchedCountry) {
            setCountryCode(matchedCountry.value);
            setPhoneNumber(cleaned.replace(matchedCountry.value, ""));
          }
        }

        setStreet(matched.street || "");
        setCity(matched.city || "");
        setAddressState(matched.addressState || "");
        setAddressCountry(matched.addressCountry || "India");
        setPincode(matched.pincode || "");
      }
    });

    return () => unsubscribe();
  }, [isOpen, profile?.uid]);

  // ---------- Fetch exchange rates from Firebase (USD‑base format) ----------
  useEffect(() => {
    const ratesRef = ref(db, "exchangeRates/rates");
    const unsubscribe = onValue(ratesRef, (snap) => {
      if (snap.exists()) {
        const fetched = snap.val(); // { USD:1, INR:83.5, EUR:0.92, GBP:0.79, ... }

        const inrPerUsd = fetched.INR ? parseFloat(fetched.INR) : 87.98;

        const newRates = { INR: 1 };

        currencyOptions.forEach((opt) => {
          const curr = opt.value;
          if (curr === "INR") return;

          let ratePerUSD = fetched[curr];
          if (ratePerUSD === undefined) return;
          ratePerUSD = parseFloat(ratePerUSD);
          if (isNaN(ratePerUSD) || ratePerUSD <= 0) return;

          newRates[curr] = inrPerUsd / ratePerUSD;
        });

        setExchangeRates((prev) => ({
          ...prev,
          ...newRates,
          INR: 1,
        }));
      }
    });
    return () => unsubscribe();
  }, []);

  // ---------- Fetch CIF rates – ALWAYS (no currency restriction) ----------
  useEffect(() => {
    const cifRef = ref(db, "cifRates");
    const unsubscribe = onValue(cifRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const dataArray = Array.isArray(data) ? data : Object.values(data);
        setCifRatesData(dataArray);
      } else {
        setCifRatesData([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // ---------- Packing adjustment factor (for CIF rate) ----------
  const getPackingAdjustment = (packingOption) => {
    const packingAdjustments = {
      "50kg PP": 1.0,
      "50lbs BOPP": 1.1,
      "40Kg PP": 0.95,
      "40kg Non-woven": 1.05,
      "40kg Jute (Jute Inner)": 1.08,
      "40kg Jute": 1.07,
      "39kg Non-woven": 1.03,
      "39kg BOPP": 1.04,
      "36kg Non-Woven": 1.02,
      "35kg Non-Woven": 1.01,
      "35kg Jute": 1.02,
      "30kg Non Woven": 0.98,
      "30kg Jute (Jute inner)": 0.99,
      "30kg Jute": 0.98,
      "30kg PP": 0.97,
      "25kg PP": 0.95,
      "25kg Non-Woven": 0.96,
      "25kg Jute": 0.97,
      "25kg BOPP (Private Label)": 1.15,
      "25kg BOPP": 1.1,
      "24.5kg PP": 0.94,
      "24.5kg Non-Woven": 0.95,
      "20kg PP": 0.92,
      "20kg Non-woven": 0.93,
      "20kg Jute": 0.94,
      "20kg BOPP (Private Label)": 1.12,
      "20kg BOPP": 1.08,
      "17/18Kg Non-woven": 0.9,
      "4*10kg Non-woven": 1.05,
      "4*10kg Jute": 1.06,
      "4*10lbs Non-woven": 1.07,
      "4*10lbs Jute": 1.08,
      "4*10Kgs PP": 1.04,
      "2*10kg Non-woven": 1.02,
      "2*10kg Jute": 1.03,
      "2*10kg BOPP with outer (Private Label)": 1.2,
      "2*10kg BOPP with outer": 1.15,
      "2*20lbs Non-woven": 1.04,
      "2*25lbs BOPP": 1.1,
      "4*5kg Non-woven": 1.08,
      "4*5kg Jute": 1.09,
      "4*5kg BOPP with outer (Private Label)": 1.22,
      "4*5kg Pouch with outer (Private Label)": 1.25,
      "4*5kg Pouch with carton (Private Label)": 1.3,
      "4*5kg Pouch with carton": 1.28,
      "8*5kg Non-woven": 1.12,
      "8*5kg Jute": 1.13,
      "8*5Kgs PP": 1.1,
      "10*4Kgs Non Woven": 1.15,
      "10*4Kg Non Woven": 1.15,
      "10*2kg Non Woven": 1.18,
      "20*1kg Non-woven": 1.25,
      "20*1kg Jute": 1.26,
      "20*1kg Pouch with carton (Private Label)": 1.35,
      "20*1kg Pouch with outer (Private Label)": 1.32,
      "20*1kg Pouch with carton": 1.3,
      "One Jumbo liner bag": 0.85,
    };
    return packingAdjustments[packingOption] || 1.0;
  };

  // ---------- Calculate CIF price (USD per MT) based on destination, grade, packing, AND transport mode ----------
  useEffect(() => {
    if (!selectedDestination || !selectedDestination.port || !grade || !packing || !transportMode || isCartOrder || isDomestic) {
      setCifPriceUSD(0);
      setCifPriceConverted(0);
      return;
    }

    const matchingRates = cifRatesData.filter((item) => {
      const destPort = item["Destination Port"] || item.destinationPort || item.Destination;
      const itemGrade = item.Grade || item.grade || "";
      const itemContainer = item.Container || item.container || "20' Container";
      const itemMode = item.Mode || item.mode || item["Transport Mode"] || "";

      const gradeMatch = itemGrade.toLowerCase().includes(grade.toLowerCase());
      const portMatch = destPort === selectedDestination.port;
      const containerMatch =
        selectedDestination.container === "All Containers" ||
        itemContainer === selectedDestination.container;
      const modeMatch = itemMode.toLowerCase() === transportMode.toLowerCase();

      return gradeMatch && portMatch && containerMatch && modeMatch;
    });

    if (matchingRates.length === 0) {
      setCifPriceUSD(0);
      setCifPriceConverted(0);
      return;
    }

    const rate = matchingRates[0];
    let cifUSD = parseFloat(rate.Region_Grade_CIF_Min || rate.CIF_USD || rate.CIF || 0);
    if (isNaN(cifUSD)) cifUSD = 0;

    const packingAdjustment = getPackingAdjustment(packing);
    const adjustedCifUSD = cifUSD * packingAdjustment;

    setCifPriceUSD(adjustedCifUSD);

    // Convert to selected currency for display (even if currency INR)
    const cifINR = adjustedCifUSD * exchangeRates.USD;
    const cifInCurrency = cifINR / exchangeRates[currency];
    setCifPriceConverted(cifInCurrency);
  }, [selectedDestination, grade, packing, transportMode, cifRatesData, currency, exchangeRates, isCartOrder, isDomestic]);

  // ---------- Price calculation (ALL PRICES IN INR internally) ----------
  // Insurance is REMOVED.
  // - Domestic: freight is a fixed amount PER BAG (no weight dependency).
  // - International: freight is added only if cif === "Yes". If CIF rate is available, use it per ton;
  //                  else use international fallback rate per ton.
  useEffect(() => {
    if (isCartOrder) {
      // ---------- CART ORDER ----------
      const cartTotalINR = cartTotal;
      const totalBags = getCartTotalBags();
      const totalWeightKg = getCartTotalWeightKg();
      const totalWeightInTons = totalWeightKg / 1000;

      // Use estimate if actual weight is zero (for fallback)
      const actualOrEstimatedTons = totalWeightKg > 0 ? totalWeightInTons : Math.ceil(cartTotalINR / 10000) * 0.1 || 1;

      // Packing & logo: per bag
      const pPriceINR = packing ? (packingPriceMap[packing] || 0) * totalBags : 0;
      const lPriceINR = customLogo === "Yes" ? 879.8 * totalBags : 0;

      let fPriceINR = 0;

      if (isDomestic) {
        // Domestic freight – fixed rate PER BAG
        const ratePerBag = DOMESTIC_FREIGHT_RATES_PER_BAG[transportMode];
        if (ratePerBag) {
          fPriceINR = ratePerBag * totalBags;
        }
      } else {
        // International – freight added only if cif === "Yes"
        if (cif === "Yes") {
          if (selectedDestination && selectedDestination.port && cifPriceUSD > 0) {
            // Use CIF rate from database (per ton)
            const cifPriceINR = cifPriceUSD * exchangeRates.USD;
            fPriceINR = cifPriceINR * actualOrEstimatedTons;
          } else {
            // No CIF rate available – use international fallback rate PER TON
            const ratePerTon = INTERNATIONAL_FALLBACK_RATES_PER_TON[transportMode];
            if (ratePerTon) {
              fPriceINR = ratePerTon * actualOrEstimatedTons;
            }
          }
        }
      }

      const totalINR = cartTotalINR + pPriceINR + lPriceINR + fPriceINR;

      setGradePriceINR(0);
      setPackingPriceINR(pPriceINR);
      setQuantityPriceINR(cartTotalINR);
      setLogoPriceINR(lPriceINR);
      setFreightPriceINR(fPriceINR);
      setTotalPriceINR(totalINR);
    } else {
      // ---------- SINGLE PRODUCT ----------
      const basePricePerQtlINR = liveGradePricePerKg * 100;
      let qtyInKg = quantity === "1ton" ? 1000 : parseFloat(quantity.replace("kg", "")) || 0;
      const qtyInQuintals = qtyInKg / 100;
      const qPriceINR = basePricePerQtlINR * qtyInQuintals * numberOfBags;

      const pPriceINR = packing ? (packingPriceMap[packing] || 0) * numberOfBags : 0;
      const lPriceINR = customLogo === "Yes" ? 879.8 * numberOfBags : 0;

      const totalWeightInTons = (qtyInKg * numberOfBags) / 1000;

      let fPriceINR = 0;

      if (isDomestic) {
        // Domestic freight – fixed rate PER BAG
        const ratePerBag = DOMESTIC_FREIGHT_RATES_PER_BAG[transportMode];
        if (ratePerBag) {
          fPriceINR = ratePerBag * numberOfBags;
        }
      } else {
        // International – freight added only if cif === "Yes"
        if (cif === "Yes") {
          if (selectedDestination && selectedDestination.port && cifPriceUSD > 0) {
            // Use CIF rate from database (per ton)
            const cifPriceINR = cifPriceUSD * exchangeRates.USD;
            fPriceINR = cifPriceINR * totalWeightInTons;
          } else {
            // No CIF rate available – use international fallback rate PER TON
            const ratePerTon = INTERNATIONAL_FALLBACK_RATES_PER_TON[transportMode];
            if (ratePerTon) {
              fPriceINR = ratePerTon * totalWeightInTons;
            }
          }
        }
      }

      const totalINR = qPriceINR + pPriceINR + lPriceINR + fPriceINR;

      setGradePriceINR(basePricePerQtlINR);
      setPackingPriceINR(pPriceINR);
      setQuantityPriceINR(qPriceINR);
      setLogoPriceINR(lPriceINR);
      setFreightPriceINR(fPriceINR);
      setTotalPriceINR(totalINR);
    }
  }, [
    liveGradePricePerKg,
    cif,
    grade,
    packing,
    quantity,
    currency,
    customLogo,
    product,
    isCartOrder,
    cartTotal,
    numberOfBags,
    selectedDestination,
    cifPriceUSD,
    exchangeRates,
    cartItems,
    isDomestic,
    transportMode,
  ]);

  // ---------- Display values (convert INR to selected currency) ----------
  const getDisplayPrice = (priceINR) => {
    if (!currency || !exchangeRates[currency]) return priceINR;
    return priceINR / exchangeRates[currency];
  };

  const displayGradePrice = getDisplayPrice(gradePriceINR);
  const displayPackingPrice = getDisplayPrice(packingPriceINR);
  const displayQuantityPrice = getDisplayPrice(quantityPriceINR);
  const displayLogoPrice = getDisplayPrice(logoPriceINR);
  const displayFreightPrice = getDisplayPrice(freightPriceINR);
  const displayTotalPrice = getDisplayPrice(totalPriceINR);

  // ---------- Validation functions ----------
  const validatePhoneNumber = (num, code) => {
    const country = countryOptions.find((o) => o.value === code);
    const len = country?.length || 10;
    if (!num) {
      setPhoneError(t("phone_required"));
      return false;
    }
    if (num.length !== len) {
      setPhoneError(t("phone_length_error").replace("{length}", len));
      return false;
    }
    if (!/^\d+$/.test(num)) {
      setPhoneError(t("phone_digits_error"));
      return false;
    }
    setPhoneError("");
    return true;
  };

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError(t("email_required"));
      return false;
    }
    if (!re.test(email)) {
      setEmailError(t("email_invalid"));
      return false;
    }
    setEmailError("");
    return true;
  };

  const handleCountryChange = (e) => {
    if (!profile) {
      setCountryCode(e.target.value);
      validatePhoneNumber(phoneNumber, e.target.value);
    }
  };

  const handlePhoneChange = (e) => {
    if (!profile) {
      const v = e.target.value.replace(/\D/g, "");
      setPhoneNumber(v);
      validatePhoneNumber(v, countryCode);
    }
  };

  const handleEmailChange = (e) => {
    if (!profile) {
      setEmail(e.target.value);
      validateEmail(e.target.value);
    }
  };

  const handleFullNameChange = (e) => {
    if (!profile) setFullName(e.target.value);
  };

  // ---------- Navigation to SeaFreight for destination selection (international only) ----------
  const handleSelectDestination = () => {
    const normalizedPath = window.location.pathname.replace(/\/$/, '');
    const modalState = {
      isCartOrder,
      product: product || null,
      cartItems,
      cartTotal,
    };
    localStorage.setItem("seaFreightModalData", JSON.stringify(modalState));
    localStorage.setItem("seaFreightReturnTo", normalizedPath);
    navigate("/sea-freight");
  };

  // ---------- Restore destination after returning from SeaFreight ----------
  useEffect(() => {
    if (isOpen) {
      const returnTo = localStorage.getItem("seaFreightReturnTo");
      const normalizedPath = window.location.pathname.replace(/\/$/, '');
      if (returnTo === normalizedPath) {
        const savedDest = localStorage.getItem("selectedCifDestination");
        if (savedDest) {
          setSelectedDestination(JSON.parse(savedDest));
        }
        localStorage.removeItem("seaFreightReturnTo");
      }
    }
  }, [isOpen]);

  // ---------- Submit handler ----------
  const handleSubmit = async () => {
    if (!fullName || !email || !phoneNumber || !street || !city || !addressState || !addressCountry || !pincode) {
      alert(t("fill_required_fields"));
      return;
    }

    const phoneOk = validatePhoneNumber(phoneNumber, countryCode);
    const emailOk = validateEmail(email);
    if (!phoneOk || !emailOk) {
      alert(t("phone_invalid") + " " + t("email_invalid"));
      return;
    }

    if (isCartOrder) {
      if (!packing || !currency || !customLogo) {
        alert(t("fill_required_fields"));
        return;
      }
      if (onSubmitCartOrder) {
        const formData = {
          fullName,
          email,
          phone: `${countryCode} ${phoneNumber}`,
          street,
          city,
          addressState,
          addressCountry,
          pincode,
          packing,
          port: ORIGIN_PORT,
          cif,
          currency,
          customLogo,
          additionalInfo,
          gradePrice: displayGradePrice,
          packingPrice: displayPackingPrice,
          quantityPrice: displayQuantityPrice,
          logoPrice: displayLogoPrice,
          freightPrice: displayFreightPrice,
          totalPrice: displayTotalPrice,
          selectedDestination,
          transportMode,
          cifPrice: cifPriceConverted,
        };
        await onSubmitCartOrder(formData);
        return;
      }
    } else {
      if (!quantity || !packing || !grade || !cif || !currency || !customLogo) {
        alert(t("fill_required_fields"));
        return;
      }
    }

    const fullPhone = `${countryCode} ${phoneNumber}`;
    const sym = currencyOptions.find((o) => o.value === currency)?.symbol || "$";

    let message = "";
    if (isCartOrder) {
      message = `**${t("cart_order_request")}**\n\n`;
      message += `1. **${t("customer_information")}**\n`;
      message += ` - ${t("full_name")}: ${fullName}\n`;
      message += ` - ${t("email_address")}: ${email}\n`;
      message += ` - ${t("phone_number")}: ${fullPhone}\n`;
      message += ` - ${t("address")}: ${street}, ${city}, ${addressState}, ${addressCountry} - ${pincode}\n\n`;
      message += `2. **${t("order_details")}**\n`;
      message += ` - ${t("packing")}: ${t(packing.toLowerCase().replace(/\s/g, "_"))}\n`;
      message += ` - ${t("origin_port")}: ${ORIGIN_PORT}\n`;
      if (selectedDestination) {
        message += ` - ${t("destination_port")}: ${selectedDestination.port} (${selectedDestination.country})\n`;
        message += ` - ${t("transport_mode")}: ${transportMode}\n`;
        message += ` - ${t("container")}: ${selectedDestination.container}\n`;
      } else {
        message += ` - ${t("transport_mode")}: ${transportMode}\n`;
      }
      message += ` - ${t("cif")}: ${cif === "Yes" ? t("yes") : t("no")}\n`;
      message += ` - ${t("currency")}: ${currency} (${sym})\n\n`;
      message += `3. **${t("cart_items")}**\n`;
      cartItems.forEach((item, i) => {
        message += `   ${i + 1}. ${item.name} - Grade: ${item.grade || "N/A"}, Qty: ${item.quantityUnit || item.quantity}, Bags: ${item.numberOfBags || 1}, Price: ₹${item.totalPriceForItem?.toFixed(2) || 0}\n`;
      });
    } else {
      message = `**${t("quotation_request")}**\n\n`;
      message += `1. **${t("customer_information")}**\n`;
      message += ` - ${t("full_name")}: ${fullName}\n`;
      message += ` - ${t("email_address")}: ${email}\n`;
      message += ` - ${t("phone_number")}: ${fullPhone}\n`;
      message += ` - ${t("address")}: ${street}, ${city}, ${addressState}, ${addressCountry} - ${pincode}\n\n`;
      message += `2. **${t("product_details")}**\n`;
      message += ` - ${t("variety")}: ${product?.name?.en || "N/A"}\n`;
      message += ` - ${t("grade")}: ${grade}\n`;
      message += ` - ${t("packing")}: ${t(packing.toLowerCase().replace(/\s/g, "_"))}\n`;
      message += ` - ${t("quantity_per_bag")}: ${quantity}\n`;
      message += ` - ${t("number_of_bags")}: ${numberOfBags}\n`;
      message += ` - ${t("total_quantity")}: ${
        quantity === "1ton"
          ? `${numberOfBags} ton`
          : `${parseFloat(quantity.replace("kg", "")) * numberOfBags} kg`
      }\n`;
      message += ` - ${t("origin_port")}: ${ORIGIN_PORT}\n`;
      if (selectedDestination) {
        message += ` - ${t("destination_port")}: ${selectedDestination.port} (${selectedDestination.country})\n`;
        message += ` - ${t("transport_mode")}: ${transportMode}\n`;
        message += ` - ${t("container")}: ${selectedDestination.container}\n`;
      } else {
        message += ` - ${t("transport_mode")}: ${transportMode}\n`;
      }
      message += ` - ${t("cif")}: ${cif === "Yes" ? t("yes") : t("no")}\n`;
      message += ` - ${t("currency")}: ${currency} (${sym})\n\n`;
    }

    message += `3. **${t("customization")}**\n`;
    message += ` - ${t("custom_logo")}: ${customLogo === "Yes" ? t("yes") : t("no")}\n\n`;
    message += `4. **${t("pricing_breakdown")}**\n`;

    if (!isCartOrder) {
      message += ` - ${t("grade_price")}: ${sym}${displayGradePrice.toFixed(2)} ${t("per")} ${t("quintal")}\n`;
    }

    message += ` - ${t("packing_price")}: ${sym}${displayPackingPrice.toFixed(2)} (${
      isCartOrder ? `${getCartTotalBags()} ${t("bags")}` : numberOfBags + " " + t("bags")
    })\n`;
    message += ` - ${t("quantity_price")}: ${sym}${displayQuantityPrice.toFixed(2)}\n`;

    // Transport line – International (with CIF and ports)
    if (!isDomestic && cif === "Yes" && selectedDestination) {
      if (cifPriceUSD > 0) {
        message += ` - ${t("transport")} (${transportMode}, ${ORIGIN_PORT} → ${selectedDestination.port}): ${sym}${displayFreightPrice.toFixed(2)}\n`;
        message += `   (CIF rate: ${sym}${cifPriceConverted.toFixed(2)} / MT)\n`;
      } else {
        message += ` - ${t("transport")} (${transportMode}, ${ORIGIN_PORT} → Standard Rate): ${sym}${displayFreightPrice.toFixed(2)}\n`;
      }
    }

    // Transport line – Domestic (no ports, per bag)
    if (isDomestic) {
      message += ` - ${t("transport")} (${transportMode}): ${sym}${displayFreightPrice.toFixed(2)}\n`;
    }

    message += ` - ${t("total_price")}: ${sym}${displayTotalPrice.toFixed(2)} (${
      cif === "Yes" ? t("cif_term") : t("fob_term")
    })\n\n`;
    message += `5. **${t("additional_information")}**\n`;
    message += ` ${additionalInfo || t("none")}\n\n${t("thank_you")}\n\n${t("best_regards")},\n${fullName}`;

    const quoteData = {
      name: fullName,
      email,
      phone: fullPhone,
      product: isCartOrder ? "Shopping Cart" : product?.name?.en || "",
      grade: isCartOrder ? "Multiple Grades" : grade,
      packing,
      quantity: isCartOrder ? `${cartItems.length} items` : quantity,
      numberOfBags: isCartOrder ? getCartTotalBags() : numberOfBags,
      totalQuantity: isCartOrder
        ? `${getCartTotalWeightKg()} kg`
        : quantity === "1ton"
        ? `${numberOfBags} ton`
        : `${parseFloat(quantity.replace("kg", "")) * numberOfBags} kg`,
      originPort: ORIGIN_PORT,
      destinationPort: selectedDestination?.port || null,
      destinationCountry: selectedDestination?.country || null,
      container: selectedDestination?.container || null,
      transportMode: transportMode,
      cif,
      currency,
      exchangeRate: exchangeRates[currency],
      customLogo,
      street,
      city,
      addressState,
      addressCountry,
      pincode,
      gradePrice: isCartOrder ? 0 : displayGradePrice,
      packingPrice: displayPackingPrice,
      quantityPrice: displayQuantityPrice,
      freightPrice: displayFreightPrice,
      totalPrice: displayTotalPrice,
      cifPrice: cifPriceUSD > 0 ? cifPriceConverted : null,
      additionalInfo: additionalInfo || "",
      timestamp: Date.now(),
      type: isCartOrder ? "cart_order" : "bulk",
    };

    try {
      await submitQuote(quoteData);
      const WHATSAPP = import.meta.env.VITE_WHATSAPP_NUMBER;
      window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}`, "_blank");
      setShowThankYou(true);
    } catch (err) {
      console.error(err);
      alert(t("submission_error"));
    }
  };

  // ---------- Close & reset ----------
  const handleClose = () => {
    setGrade("");
    setPacking("");
    setQuantity("");
    setCif("");
    setCurrency("USD");
    setCustomLogo("");
    setAdditionalInfo("");
    setFullName("");
    setEmail("");
    setPhoneNumber("");
    setCountryCode("+91");
    setEmailError("");
    setShowThankYou(false);
    setGradePriceINR(0);
    setPackingPriceINR(0);
    setQuantityPriceINR(0);
    setLogoPriceINR(0);
    setFreightPriceINR(0);
    setTotalPriceINR(0);
    setStreet("");
    setCity("");
    setAddressState("");
    setAddressCountry("");
    setPincode("");
    setNumberOfBags(1);
    setSelectedDestination(null);
    setTransportMode("Sea Freight");
    onClose();
  };

  const getCurrentCountry = () => countryOptions.find((o) => o.value === countryCode);

  if (!isOpen) return null;

  const currencySymbol = currencyOptions.find((o) => o.value === currency)?.symbol || "$";

  return (
    <div className="buy-modal-overlay">
      <div className="buy-modal-container">
        <canvas ref={canvasRef} className="buy-modal-canvas" />
        <button className="buy-modal-close-btn" onClick={handleClose} aria-label={t("close_modal")}>
          ×
        </button>
        <div className="buy-modal-header">
          <h2 className="buy-modal-title">
            {isCartOrder ? t("checkout_cart") : t("get_quote")}
          </h2>
        </div>
        <div className="buy-modal-body">
          <div className="buy-modal-content">
            <div className="form-container">
              <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
                {/* CONTACT */}
                <section className="form-section">
                  <h3>{t("contact_information")}</h3>
                  <label>{t("full_name")} * <input type="text" value={fullName} onChange={handleFullNameChange} required className="input-field" readOnly={!!profile} /></label>
                  <label>{t("email_address")} * <input type="email" value={email} onChange={handleEmailChange} required className="input-field" readOnly={!!profile} /> {emailError && <div className="error-text">{emailError}</div>}</label>
                  <label>{t("phone_number")} *
                    <div className="phone-input-group">
                      <select value={countryCode} onChange={handleCountryChange} className="country-code-select no-arrow" disabled={!!profile}>
                        {countryOptions.map(o => <option key={o.value} value={o.value}>{o.flag} {o.value}</option>)}
                      </select>
                      <input type="tel" value={phoneNumber} onChange={handlePhoneChange} maxLength={getCurrentCountry()?.length || 10} required className="input-field flex-grow" readOnly={!!profile} />
                    </div>
                    {phoneError && <div className="error-text">{phoneError}</div>}
                  </label>
                </section>

                {/* ADDRESS */}
                <section className="form-section">
                  <h3>{t("address_information")}</h3>
                  <label>{t("street")} * <input type="text" className="input-field" value={street} onChange={e => setStreet(e.target.value)} required /></label>
                  <label>{t("city")} * <input type="text" className="input-field" value={city} onChange={e => setCity(e.target.value)} required /></label>
                  <label>{t("state")} * <input type="text" className="input-field" value={addressState} onChange={e => setAddressState(e.target.value)} required /></label>
                  <label>{t("country")} * <input type="text" className="input-field" value={addressCountry} onChange={e => setAddressCountry(e.target.value)} required /></label>
                  <label>{t("pincode")} * <input type="text" className="input-field" value={pincode} onChange={e => setPincode(e.target.value)} required /></label>
                </section>

                {/* PRODUCT */}
                <section className="form-section">
                  <h3>{t("product_information")}</h3>

                  {isCartOrder ? (
                    <>
                      <label>{t("order_type")}<input type="text" value={t("shopping_cart")} disabled className="input-field" /></label>
                      <label>{t("total_items")}<input type="text" value={`${cartItems.length} ${t("items")}`} disabled className="input-field" /></label>
                      <label>{t("total_bags")}<input type="text" value={`${getCartTotalBags()} ${t("bags")}`} disabled className="input-field" /></label>
                      <div className="tw-mt-4 tw-space-y-3">
                        <h4 className="tw-text-yellow-400 tw-font-semibold">{t("selected_products")}</h4>
                        {cartItems.map((item, index) => (
                          <div key={`${item.id}-${index}`} className="tw-flex tw-gap-3 tw-bg-black/40 tw-border tw-border-yellow-400/20 tw-rounded-lg tw-p-3">
                            <img src={item.image} alt={item.name} className="tw-w-16 tw-h-16 tw-object-cover tw-rounded-md tw-border tw-border-yellow-400/30" onError={(e) => { e.target.src = "/img/placeholder-rice.jpg"; }} />
                            <div className="tw-flex-1 tw-flex tw-justify-between tw-gap-4">
                              <div>
                                <p className="tw-text-yellow-300 tw-font-semibold">{index + 1}. {item.name}</p>
                                {item.grade && <p className="tw-text-xs tw-text-yellow-200/70">Grade: {item.grade}</p>}
                                <p className="tw-text-xs tw-text-yellow-200/70">Qty: {item.quantityUnit || `${item.quantity} unit`}</p>
                                <p className="tw-text-xs tw-text-yellow-200/70">Bags: {item.numberOfBags || 1}</p>
                                {item.pricePerBag && <p className="tw-text-xs tw-text-yellow-200/70">Price per bag: ₹{item.pricePerBag.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>}
                              </div>
                              <div className="tw-text-right">
                                <p className="tw-text-yellow-400 tw-font-semibold">₹{(item.totalPriceForItem || item.subtotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                                <p className="tw-text-[10px] tw-text-yellow-200/50">{item.numberOfBags > 1 ? `${item.numberOfBags} × ₹${(item.pricePerBag || 0).toLocaleString("en-IN")}` : `₹${(item.pricePerBag || 0).toLocaleString("en-IN")} per bag`}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="tw-flex tw-gap-4 tw-items-center tw-bg-black/40 tw-border tw-border-yellow-400/20 tw-rounded-lg tw-p-3 tw-mb-4">
                        <img src={product?.image} alt={product?.name?.en} className="tw-w-20 tw-h-20 tw-object-cover tw-rounded-md tw-border tw-border-yellow-400/30" onError={(e) => { e.target.src = "/img/placeholder-rice.jpg"; }} />
                        <div><p className="tw-text-yellow-300 tw-font-semibold">{product?.name?.en}</p><p className="tw-text-xs tw-text-yellow-200/70">{product?.category}</p></div>
                      </div>
                      <label>{t("category")}<select disabled value={product?.category} className="select-field no-arrow"><option>{product?.category}</option></select></label>
                      <label>{t("grade")} *<select value={grade} onChange={e => setGrade(e.target.value)} required className="select-field"><option value="">{t("select_grade")}</option>{grades.map((g, i) => <option key={i} value={g}>{g}</option>)}</select></label>
                    </>
                  )}

                  <label>{t("packing")} *<select value={packing} onChange={e => setPacking(e.target.value)} required className="select-field"><option value="">{t("select_packing")}</option><option value="PP (Polypropylene Woven Bags)">{t("pp_bags")}</option><option value="Non-Woven Bags">{t("non_woven_bags")}</option><option value="Jute Bags">{t("jute_bags")}</option><option value="BOPP (Biaxially Oriented Polypropylene) Laminated Bags">{t("bopp_bags")}</option><option value="LDPE (Low Density Polyethylene) Pouches">{t("ldpe_pouches")}</option></select></label>

                  {!isCartOrder && (
                    <>
                      <label>{t("quantity")} *<select value={quantity} onChange={e => setQuantity(e.target.value)} required className="select-field"><option value="">{t("select_quantity")}</option>{quantityOptions.map((q, i) => <option key={i} value={q}>{q}</option>)}</select></label>
                      <label>{t("number_of_bags")} *<div className="tw-flex tw-items-center tw-gap-2"><button type="button" onClick={() => setNumberOfBags(prev => Math.max(1, prev - 1))} className="tw-w-8 tw-h-8 tw-flex tw-items-center tw-justify-center tw-bg-yellow-400 tw-text-black tw-rounded-md hover:tw-bg-yellow-300 tw-font-bold">-</button><input type="number" min="1" max="1000" value={numberOfBags} onChange={e => { const val = parseInt(e.target.value) || 1; setNumberOfBags(Math.max(1, Math.min(1000, val))); }} className="tw-flex-1 tw-text-center tw-bg-black/50 tw-border tw-border-yellow-400/30 tw-rounded tw-p-2 tw-text-white" /><button type="button" onClick={() => setNumberOfBags(prev => Math.min(1000, prev + 1))} className="tw-w-8 tw-h-8 tw-flex tw-items-center tw-justify-center tw-bg-yellow-400 tw-text-black tw-rounded-md hover:tw-bg-yellow-300 tw-font-bold">+</button><span className="tw-ml-2 tw-text-yellow-200">{numberOfBags} {t("bags")}</span></div><p className="tw-text-xs tw-text-gray-400 tw-mt-1">{t("bag_calculation_note")}</p></label>
                    </>
                  )}

                  {/* Origin Port - hidden for domestic shipments */}
                  {!isDomestic && (
                    <label>
                      {t("origin_port")}
                      <input type="text" value={ORIGIN_PORT} disabled className="input-field" />
                    </label>
                  )}

                  {/* Destination Port block - hidden for domestic shipments */}
                  {!isDomestic && (
                    <div className="tw-mt-4 tw-p-3 tw-bg-black/40 tw-border tw-border-yellow-400/30 tw-rounded-lg">
                      <label className="tw-block tw-text-yellow-400 tw-font-semibold tw-mb-2">
                        {t("destination_port")} {cif === "Yes" && currency !== "INR" && <span className="tw-text-red-400">*</span>}
                      </label>

                      {selectedDestination ? (
                        <>
                          <div className="tw-flex tw-items-center tw-justify-between tw-mb-3">
                            <div>
                              <span className="tw-text-white tw-text-sm">
                                {selectedDestination.port} ({selectedDestination.country}) – {selectedDestination.container}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={handleSelectDestination}
                              className="tw-px-3 tw-py-1 tw-text-xs tw-bg-yellow-400 tw-text-black tw-rounded hover:tw-bg-yellow-300"
                            >
                              {t("change")}
                            </button>
                          </div>

                          {/* TRANSPORT MODE DROPDOWN - inside destination block for international */}
                          <div className="tw-mt-2">
                            <label className="tw-block tw-text-yellow-300 tw-text-sm tw-mb-1">
                              {t("transport_mode")} *
                            </label>
                            <select
                              value={transportMode}
                              onChange={(e) => setTransportMode(e.target.value)}
                              className="select-field tw-w-full"
                              required={cif === "Yes" && currency !== "INR"}
                            >
                              {availableModes.map((mode) => (
                                <option key={mode} value={mode}>
                                  {mode}
                                </option>
                              ))}
                            </select>
                            <p className="tw-text-xs tw-text-gray-400 tw-mt-1">
                              {selectedDestination.country?.toLowerCase() === "india"
                                ? "Domestic shipment – all modes available"
                                : "International shipment – Sea/Air only"}
                            </p>
                          </div>

                          {cifPriceUSD > 0 && (
                            <div className="tw-mt-2 tw-text-yellow-300 tw-text-xs">
                              CIF rate: {currencySymbol}{cifPriceConverted.toFixed(2)}/MT
                            </div>
                          )}
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSelectDestination}
                          className="tw-w-full tw-p-2 tw-bg-yellow-400/20 tw-border tw-border-yellow-400/50 tw-rounded tw-text-yellow-300 hover:tw-bg-yellow-400/30 tw-text-sm"
                        >
                          {t("select_destination_port")}
                        </button>
                      )}

                      {cif === "Yes" && currency !== "INR" && !selectedDestination && (
                        <p className="tw-text-red-400 tw-text-xs tw-mt-1">{t("destination_required_for_cif")}</p>
                      )}
                    </div>
                  )}

                  {/* TRANSPORT MODE for DOMESTIC shipments - shown separately when country is India */}
                  {isDomestic && (
                    <div className="tw-mt-4 tw-p-3 tw-bg-black/40 tw-border tw-border-yellow-400/30 tw-rounded-lg">
                      <label className="tw-block tw-text-yellow-300 tw-text-sm tw-mb-1">
                        {t("transport_mode")} *
                      </label>
                      <select
                        value={transportMode}
                        onChange={(e) => setTransportMode(e.target.value)}
                        className="select-field tw-w-full"
                        required
                      >
                        {DOMESTIC_MODES.map((mode) => (
                          <option key={mode} value={mode}>
                            {mode}
                          </option>
                        ))}
                      </select>
                      <p className="tw-text-xs tw-text-gray-400 tw-mt-1">
                        Domestic shipment – fixed cost per bag
                      </p>
                    </div>
                  )}

                  {/* CIF - hidden for domestic shipments */}
                  {!isDomestic && (
                    <label>{t("cif")} *<select value={cif} onChange={e => setCif(e.target.value)} required className="select-field"><option value="">{t("select_cif")}</option><option value="Yes">{t("yes")}</option><option value="No">{t("no")}</option></select></label>
                  )}

                  <label>{t("currency")} *<select value={currency} onChange={e => setCurrency(e.target.value)} required className="select-field"><option value="">{t("select_currency")}</option>{currencyOptions.map((c, i) => <option key={i} value={c.value}>{c.value} ({c.symbol})</option>)}</select></label>

                  <label>{t("custom_logo")} *<select value={customLogo} onChange={e => setCustomLogo(e.target.value)} required className="select-field"><option value="">{t("select_logo")}</option><option value="Yes">{t("yes")}</option><option value="No">{t("no")}</option></select></label>

                  <label>{t("additional_info")}<textarea value={additionalInfo} onChange={e => setAdditionalInfo(e.target.value)} className="textarea-field" /></label>
                </section>

                <button type="submit" className="submit-btn">{isCartOrder ? t("place_order") : t("get_quote")}</button>
              </form>
            </div>

            {/* BILL */}
            <div className="bill-container">
              <h3>{t("estimated_bill")}</h3>
              <div className="bill-breakdown">
                {!isCartOrder && (
                  <div className="bill-item">
                    <span>{t("grade_price")}:</span>
                    <span>{currencySymbol}{displayGradePrice.toFixed(2)} {t("per")} {t("quintal")}</span>
                  </div>
                )}

                <div className="bill-item">
                  <span>{t("packing_price")}:</span>
                  <span>{currencySymbol}{displayPackingPrice.toFixed(2)} {isCartOrder ? `(${getCartTotalBags()} ${t("bags")})` : `(${numberOfBags} ${t("bags")})`}</span>
                </div>

                <div className="bill-item">
                  <span>{isCartOrder ? t("cart_total") : t("quantity_price")}:</span>
                  <span>{currencySymbol}{displayQuantityPrice.toFixed(2)}</span>
                </div>

                {/* Transport line – International (with CIF and ports) */}
                {!isDomestic && cif === "Yes" && selectedDestination && (
                  <>
                    {cifPriceUSD > 0 ? (
                      <>
                        <div className="bill-item tw-text-yellow-300">
                          <span>{t("transport")} ({transportMode}, {ORIGIN_PORT} → {selectedDestination.port}):</span>
                          <span>{currencySymbol}{displayFreightPrice.toFixed(2)}</span>
                        </div>
                        <div className="bill-item tw-text-xs tw-text-yellow-400/70">
                          <span>{t("cif_rate")}:</span>
                          <span>{currencySymbol}{cifPriceConverted.toFixed(2)} / MT</span>
                        </div>
                      </>
                    ) : (
                      <div className="bill-item tw-text-yellow-300">
                        <span>{t("transport")} ({transportMode}, {ORIGIN_PORT} → Standard Rate):</span>
                        <span>{currencySymbol}{displayFreightPrice.toFixed(2)}</span>
                      </div>
                    )}
                  </>
                )}

                {/* Transport line – Domestic (no ports, per bag) */}
                {isDomestic && (
                  <div className="bill-item tw-text-yellow-300">
                    <span>{t("transport")} ({transportMode}):</span>
                    <span>{currencySymbol}{displayFreightPrice.toFixed(2)}</span>
                  </div>
                )}

                <div className="tw-border-t tw-border-yellow-400/50 tw-my-2"></div>

                <div className="bill-item total">
                  <span>{t("total_price")}:</span>
                  <span>{currencySymbol}{displayTotalPrice.toFixed(2)} ({cif === "Yes" ? t("cif_term") : t("fob_term")})</span>
                </div>
              </div>
              <div className="tw-mt-4 tw-text-xs tw-text-white-400 tw-leading-relaxed">
                <strong>{t("NOTE")} : {t("This is an estimated cost. Actual costs may vary based on additional requirements and market conditions.")}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ThankYouPopup isOpen={showThankYou} onClose={() => { setShowThankYou(false); onClose(); }} />
    </div>
  );
};

export default BuyModal;