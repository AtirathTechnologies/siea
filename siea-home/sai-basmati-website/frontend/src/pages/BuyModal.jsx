import React, { useState, useEffect, useRef } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import ThankYouPopup from "../components/ThankYouPopup";
import { submitQuote } from "../firebase";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";
import { useNavigate } from "react-router-dom";
import { calculateCIFUSD } from "../utils/pricingUtils";
import {
  PACKING_RULES,
  calculatePackingPrice,
  isPackingValidForCart,
  getAvailableQuantities
} from "../utils/packingUtils";

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

  useEffect(() => {
    if (!isDomestic) {
      setTransportMode("Sea Freight");
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

  const ALL_QUANTITIES = [5, 10, 25, 40, 50, 100, 1000];

  const currencyOptions = [
    { value: "INR", symbol: "₹" },
    { value: "USD", symbol: "$" },
    { value: "EUR", symbol: "€" },
    { value: "GBP", symbol: "£" },
  ];

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

      const qtyString = item.quantityUnit || item.quantity;

      if (qtyString === "1ton") {
        qtyPerBag = 1000;
      } else if (typeof qtyString === "string" && qtyString.includes("kg")) {
        qtyPerBag = parseFloat(qtyString.replace("kg", "")) || 0;
      } else if (typeof qtyString === "number") {
        qtyPerBag = qtyString;
      }

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

  // ---------- Calculate CIF price (USD per MT) based on destination, grade, packing, AND transport mode ----------
  useEffect(() => {
    if (!selectedDestination || !selectedDestination.cifUSD || isDomestic) {
      setCifPriceUSD(0);
      setCifPriceConverted(0);
      return;
    }

    const cifUSD = parseFloat(selectedDestination.cifUSD) || 0;

    setCifPriceUSD(cifUSD);


    const cifINR = cifUSD * exchangeRates.USD;
    const cifInCurrency = cifINR / exchangeRates[currency];

    setCifPriceConverted(cifInCurrency);

  }, [selectedDestination, currency, exchangeRates, isDomestic]);

  useEffect(() => {

    if (isCartOrder) {

      // ---------- CART ORDER ----------
      const cartTotalINR = cartTotal;
      const totalBags = getCartTotalBags();
      const totalWeightKg = getCartTotalWeightKg();
      const totalWeightInTons = totalWeightKg / 1000;

      let pPriceINR = 0;

      cartItems.forEach((item) => {
        const itemPacking = item.packing;
        const bags = item.numberOfBags || 1;

        let qtyPerBag = 0;

        if (item.quantityUnit === "1ton") {
          qtyPerBag = 1000;
        } else if (item.quantityUnit?.includes("kg")) {
          qtyPerBag = parseFloat(item.quantityUnit.replace("kg", "")) || 0;
        }

        if (itemPacking && qtyPerBag > 0) {
          const itemPackingPrice = calculatePackingPrice(
            itemPacking,
            qtyPerBag,
            bags
          );

          pPriceINR += itemPackingPrice;
        }
      });
      const lPriceINR = 0;

      let fPriceINR = 0;
      let totalINR = 0;

      if (isDomestic) {
        const ratePerBag = DOMESTIC_FREIGHT_RATES_PER_BAG[transportMode];
        fPriceINR = ratePerBag ? ratePerBag * totalBags : 0;

        totalINR = cartTotalINR + pPriceINR + fPriceINR;

      } else {

        if (cif === "Yes") {

          if (selectedDestination && selectedDestination.port) {

            const cifUSDPerTon = parseFloat(selectedDestination.cifUSD || 0);
            const cifINRPerTon = cifUSDPerTon * exchangeRates.USD;

            fPriceINR = cifINRPerTon * totalWeightInTons;

            totalINR = cartTotalINR + pPriceINR + fPriceINR;
          } else {


            totalINR = cartTotalINR + pPriceINR + lPriceINR + fPriceINR;
          }

        } else {
          totalINR = cartTotalINR + pPriceINR + lPriceINR;
        }
      }

      setGradePriceINR(0);
      setPackingPriceINR(pPriceINR);
      setQuantityPriceINR(cartTotalINR);
      setFreightPriceINR(fPriceINR);
      setTotalPriceINR(totalINR);

    } else {

      // ---------- SINGLE PRODUCT ----------
      const basePricePerQtlINR = liveGradePricePerKg * 100;

      let qtyInKg =
        quantity === "1ton"
          ? 1000
          : parseFloat(quantity.replace("kg", "")) || 0;

      const qtyInQuintals = qtyInKg / 100;
      const qPriceINR = basePricePerQtlINR * qtyInQuintals * numberOfBags;

      const pPriceINR = calculatePackingPrice(
        packing,
        qtyInKg,
        numberOfBags
      );


      const lPriceINR = 0;


      const totalWeightInTons = (qtyInKg * numberOfBags) / 1000;

      let fPriceINR = 0;
      let totalINR = 0;

      if (isDomestic) {

        const ratePerBag = DOMESTIC_FREIGHT_RATES_PER_BAG[transportMode];
        fPriceINR = ratePerBag ? ratePerBag * numberOfBags : 0;

        totalINR = qPriceINR + pPriceINR + fPriceINR;

      } else {

        if (cif === "Yes") {

          if (selectedDestination && selectedDestination.port) {

            const result = calculateCIFUSD(
              selectedDestination.exMillMin,
              selectedDestination.exMillMax,
              exchangeRates.USD,
              selectedDestination.region,
              selectedDestination.country,
              selectedDestination.port
            );

            // Use MAX to match mobile
            const cifUSDPerTon = result.cifMaxUSD;

            const cifINRPerTon = cifUSDPerTon * exchangeRates.USD;

            fPriceINR = cifINRPerTon * totalWeightInTons;

            totalINR = qPriceINR + pPriceINR + fPriceINR;
          } else {


            totalINR = qPriceINR + pPriceINR + fPriceINR;
          }

        } else {

          totalINR = qPriceINR + pPriceINR + lPriceINR;
        }
      }

      setGradePriceINR(basePricePerQtlINR);
      setPackingPriceINR(pPriceINR);
      setQuantityPriceINR(qPriceINR);
      setFreightPriceINR(fPriceINR);
      setTotalPriceINR(totalINR);
    }

  }, [
    liveGradePricePerKg,
    cif,
    grade,
    packing,
    quantity,
    customLogo,
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

  // ---------- Calculate total weight in MT for display ----------
  const totalWeightInTons = isCartOrder
    ? getCartTotalWeightKg() / 1000
    : (
      quantity === "1ton"
        ? numberOfBags
        : ((parseFloat(quantity?.replace("kg", "") || 0) * numberOfBags) / 1000)
    );


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



  useEffect(() => {
    setQuantity("");
  }, [packing]);

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
      if (!currency || !customLogo) {
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
      message += ` - ${t("total_quantity")}: ${quantity === "1ton"
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

    message += ` - ${t("packing_price")}: ${sym}${displayPackingPrice.toFixed(2)} (${isCartOrder ? `${getCartTotalBags()} ${t("units")}`
      : numberOfBags + " " + t("units")})

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

    message += ` - ${t("total_price")}: ${sym}${displayTotalPrice.toFixed(2)} (${cif === "Yes" ? t("cif_term") : t("fob_term")
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

  const availablePackingOptions = Object.keys(PACKING_RULES);

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
                      <label>{t("total_units")}<input type="text" value={`${getCartTotalBags()} ${t("units")}`} disabled className="input-field" /></label>
                      <div className="tw-mt-4 tw-space-y-3">
                        <h4 className="tw-text-yellow-400 tw-font-semibold">{t("selected_products")}</h4>
                        {cartItems.map((item, index) => (
                          <div key={`${item.id}-${index}`} className="tw-flex tw-gap-3 tw-bg-black/40 tw-border tw-border-yellow-400/20 tw-rounded-lg tw-p-3">
                            <img src={item.image} alt={item.name} className="tw-w-16 tw-h-16 tw-object-cover tw-rounded-md tw-border tw-border-yellow-400/30" onError={(e) => { e.target.src = "/img/placeholder-rice.jpg"; }} />
                            <div className="tw-flex-1 tw-flex tw-justify-between tw-gap-4">
                              <div>
                                <p className="tw-text-yellow-300 tw-font-semibold">{index + 1}. {item.name}</p>
                                {item.grade && <p className="tw-text-xs tw-text-yellow-200/70">Grade: {item.grade}</p>}
                                {item.packing && (
                                  <p className="tw-text-xs tw-text-yellow-200/70">
                                    Packing: {item.packing}
                                  </p>
                                )}
                                <p className="tw-text-xs tw-text-yellow-200/70">Qty: {item.quantityUnit || `${item.quantity} unit`}</p>
                                <p className="tw-text-xs tw-text-yellow-200/70">
                                  Units: {item.numberOfBags || 1}
                                </p>
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

                  {!isCartOrder && (
                    <label>{t("packing")} *
                      <select
                        value={packing}
                        onChange={e => setPacking(e.target.value)}
                        required
                        className="select-field"
                      >
                        <option value="">{t("select_packing")}</option>

                        {availablePackingOptions.map((pack, index) => (
                          <option key={index} value={pack}>
                            {pack}
                          </option>
                        ))}

                      </select>
                    </label>
                  )}


                  {!isCartOrder && (
                    <>
                      <label>{t("quantity")} *<select
                        value={quantity}
                        onChange={e => setQuantity(e.target.value)}
                        required
                        className="select-field"
                      >
                        <option value="">{t("select_quantity")}</option>

                        {getAvailableQuantities(packing, ALL_QUANTITIES).map((q) => (
                          <option key={q} value={q === 1000 ? "1ton" : `${q}kg`}>
                            {q === 1000 ? "1ton" : `${q}kg`}
                          </option>
                        ))}
                      </select></label>
                      <label>{t("number_of_units")} *
                        <div className="tw-flex tw-items-center tw-gap-2"><button type="button" onClick={() => setNumberOfBags(prev => Math.max(1, prev - 1))} className="tw-w-8 tw-h-8 tw-flex tw-items-center tw-justify-center tw-bg-yellow-400 tw-text-black tw-rounded-md hover:tw-bg-yellow-300 tw-font-bold">-</button><input type="number" min="1" max="1000" value={numberOfBags} onChange={e => { const val = parseInt(e.target.value) || 1; setNumberOfBags(Math.max(1, Math.min(1000, val))); }} className="tw-flex-1 tw-text-center tw-bg-black/50 tw-border tw-border-yellow-400/30 tw-rounded tw-p-2 tw-text-white" /><button type="button" onClick={() => setNumberOfBags(prev => Math.min(1000, prev + 1))} className="tw-w-8 tw-h-8 tw-flex tw-items-center tw-justify-center tw-bg-yellow-400 tw-text-black tw-rounded-md hover:tw-bg-yellow-300 tw-font-bold">+</button><span className="tw-ml-2 tw-text-yellow-200">{numberOfBags} {t("units")}</span></div></label>
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

                {!isDomestic && cif === "Yes" && selectedDestination && (
                  <>
                    <div className="bill-item tw-text-yellow-400">
                      <span>
                        CIF Rate per MT ({selectedDestination.port}):
                      </span>
                      <span>
                        {currencySymbol}{cifPriceConverted.toFixed(2)} / MT
                      </span>
                    </div>

                    <div className="tw-border-t tw-border-yellow-400/40 tw-my-2"></div>
                  </>
                )}


                <div className="bill-item">
                  <span>{t("packing_price")}:</span>
                  <span>{currencySymbol}{displayPackingPrice.toFixed(2)} {isCartOrder ? `(${getCartTotalBags()} ${t("units")})` : `(${numberOfBags} ${t("units")})`}</span>
                </div>

                <div className="bill-item">
                  <span>{isCartOrder ? t("cart_total") : t("quantity_price")}:</span>
                  <span>{currencySymbol}{displayQuantityPrice.toFixed(2)}</span>
                </div>

                {!isDomestic && cif === "Yes" && selectedDestination && totalWeightInTons > 0 && (
                  <div className="bill-item tw-text-yellow-300">
                    <span>
                      CIF Freight ({totalWeightInTons.toFixed(2)} MT):
                    </span>
                    <span>
                      {currencySymbol}{displayFreightPrice.toFixed(2)}
                    </span>
                  </div>
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
      </div >
      <ThankYouPopup isOpen={showThankYou} onClose={() => { setShowThankYou(false); onClose(); }} />
    </div >
  );
};

export default BuyModal;