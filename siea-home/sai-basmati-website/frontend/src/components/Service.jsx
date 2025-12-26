// src/components/Service.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import MapImage from "../assets/Map.png";
import Branding from "../assets/Branding-Services.png";
import Profitable from "../assets/Profitable-Purchase.jpg";
import Personalization from "../assets/Personalization.jpg";
import Guidance from "../assets/Guidance.jpg";
import Quality from "../assets/Quality.jpg";
import { useLanguage } from "../contexts/LanguageContext";
import { otherServices } from "../data/services";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";

/* Helper: safely get a string from possibly localized/value object */
const safeString = (v) => {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (typeof v === "object") {
    // try common locales or 'en' fallback
    if (v.en) return v.en;
    if (v.name && typeof v.name === "string") return v.name;
    if (v.title && typeof v.title === "string") return v.title;
    // as last resort stringify
    return JSON.stringify(v);
  }
  return String(v);
};

/* Load Razorpay SDK */
const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

// Currency conversion rates
const CURRENCY_RATES = {
  "+91": { code: "INR", symbol: "₹", rate: 1, name: "Indian Rupee" },
  "+1": { code: "USD", symbol: "$", rate: 0.012, name: "US Dollar" },
  "+44": { code: "GBP", symbol: "£", rate: 0.009, name: "British Pound" },
  "+971": { code: "AED", symbol: "د.إ", rate: 0.044, name: "UAE Dirham" },
  "+966": { code: "SAR", symbol: "ر.س", rate: 0.045, name: "Saudi Riyal" },
  "+81": { code: "JPY", symbol: "¥", rate: 1.8, name: "Japanese Yen" },
  "+49": { code: "EUR", symbol: "€", rate: 0.011, name: "Euro" },
  "+33": { code: "EUR", symbol: "€", rate: 0.011, name: "Euro" },
  "+86": { code: "CNY", symbol: "¥", rate: 0.085, name: "Chinese Yuan" },
};

const Service = () => {
  const { t } = useLanguage();

  // UI state
  const [selectedService, setSelectedService] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [shippingMethod, setShippingMethod] = useState("airways");

  const countryCodeRules = {
    "+91": { name: "India", length: 10, api: "india" },
    "+1": { name: "USA/Canada", length: 10, api: "usa_canada" },
    "+44": { name: "UK", length: 10, api: "uk" },
    "+971": { name: "UAE", length: 9, api: "manual" },
    "+966": { name: "Saudi Arabia", length: 9, api: "manual" },
    "+81": { name: "Japan", length: 10, api: "manual" },
    "+49": { name: "Germany", length: 11, api: "manual" },
    "+33": { name: "France", length: 9, api: "manual" },
    "+86": { name: "China", length: 11, api: "manual" },
  };

  // Form
  const [form, setForm] = useState({
    name: "",
    company: "",
    doorNo: "",
    area: "",
    town: "",
    city: "",
    district: "",
    pincode: "",
    landmark: "",
    phone: "",
    email: "",
    countryCode: "+91",
    selectedItems: [],
    submitted: false,
  });

  const [phoneError, setPhoneError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [varietyOptions, setVarietyOptions] = useState([]); // array of strings
  const [gradeMap, setGradeMap] = useState({}); // { varietyName: [ { name, price }, ... ] }
  const [productsRaw, setProductsRaw] = useState([]);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [apiLoading, setApiLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null); // For simplified product selection

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://siea.onrender.com";

  const shippingCharges = {
    india: { airways: 350, train: 250 },
    international: { airways: 1500, ship: 800 },
  };

  const quantityOptions = [
    { label: "300 grams", value: "300 grams", kg: 0.3 },
    { label: "500 grams", value: "500 grams", kg: 0.5 },
    { label: "1 kg", value: "1 kg", kg: 1 },
    { label: "2 kg", value: "2 kg", kg: 2 },
    { label: "3 kg", value: "3 kg", kg: 3 },
    { label: "5 kg", value: "5 kg", kg: 5 },
    { label: "8 kg", value: "8 kg", kg: 8 },
    { label: "10 kg", value: "10 kg", kg: 10 },
    { label: "12 kg", value: "12 kg", kg: 12 },
    { label: "15 kg", value: "15 kg", kg: 15 },
    { label: "18 kg", value: "18 kg", kg: 18 },
    { label: "20 kg", value: "20 kg", kg: 20 },
    { label: "25 kg", value: "25 kg", kg: 25 },
    { label: "30 kg", value: "30 kg", kg: 30 },
  ];

  // -------------------------
  // Load products from Firebase RTDB (optimized)
  // -------------------------
  useEffect(() => {
    const productsRef = ref(db, "products");
    const unsubscribe = onValue(
      productsRef,
      (snap) => {
        const val = snap.val() || {};
        // transform node object -> array preserving keys
        const list = Object.entries(val).map(([k, v]) => ({ key: k, ...(v || {}) }));
        setProductsRaw(list);

        // Build map
        const varietiesArr = [];
        const gmap = {};

        list.forEach((prod) => {
          // get variety/product name safely
          const varietyName =
            safeString(prod.name) ||
            safeString(prod.productName) ||
            safeString(prod.variety) ||
            `Product ${prod.key}`;

          if (!varietiesArr.includes(varietyName)) varietiesArr.push(varietyName);

          // grades may be in various shapes
          const rawGrades = prod.grades || prod.grade || prod.gradesList || prod.gradeList || [];
          let gradesArr = [];

          if (Array.isArray(rawGrades) && rawGrades.length) {
            gradesArr = rawGrades.map((g) => {
              if (!g) return null;
              if (typeof g === "string") return { name: g, price: 0 };
              const name = safeString(g.name || g.grade || g.gradeName || g.title) || "Unknown";
              const price = Number(g.price || g.price_inr || g.priceINR || g.priceINR || 0);
              return { name, price };
            }).filter(Boolean);
          } else if (rawGrades && typeof rawGrades === "object" && Object.keys(rawGrades).length) {
            gradesArr = Object.values(rawGrades).map((g) => {
              if (!g) return null;
              const name = safeString(g.name || g.grade || g.gradeName || g.title) || "Unknown";
              const price = Number(g.price || g.price_inr || g.priceINR || 0);
              return { name, price };
            }).filter(Boolean);
          } else {
            // fallback: maybe this product has direct grade & price fields
            if (prod.grade && (prod.price || prod.price_inr || prod.priceINR)) {
              gradesArr = [{ name: safeString(prod.grade), price: Number(prod.price || prod.price_inr || prod.priceINR || 0) }];
            } else {
              // no grade found – add generic Unknown with price if available
              const fallbackPrice = Number(prod.price || prod.price_inr || prod.priceINR || 0);
              gradesArr = [{ name: prod.defaultGradeName || "Unknown", price: fallbackPrice }];
            }
          }

          // ensure unique grade names
          const uniqueGrades = [];
          gradesArr.forEach((g) => {
            const name = safeString(g.name);
            if (!uniqueGrades.find((x) => x.name === name)) uniqueGrades.push({ name, price: Number(g.price || 0) });
          });

          // sort by name safe
          uniqueGrades.sort((a, b) => {
            try {
              return a.name.localeCompare(b.name);
            } catch {
              return 0;
            }
          });

          gmap[varietyName] = uniqueGrades;
        });

        // sort variety names safely
        varietiesArr.sort((a, b) => {
          try {
            return a.localeCompare(b);
          } catch {
            return 0;
          }
        });

        setVarietyOptions(varietiesArr);
        setGradeMap(gmap);
        
        // Auto-select first category if available
        if (varietiesArr.length > 0 && !selectedCategory) {
          setSelectedCategory(varietiesArr[0]);
        }
      },
      (err) => {
        console.error("Failed to load products from firebase:", err);
      }
    );

    return () => unsubscribe();
  }, []);

  // -------------------------
  // Memoized helpers to avoid repeated work
  // -------------------------
  const calculateItemPrice = useCallback(
    (variety, grade, quantityValue) => {
      const grades = gradeMap[variety] || [];
      const gradeObj = grades.find((g) => (g.name || "").toString() === (grade || "").toString());
      const pricePerKg = gradeObj ? Number(gradeObj.price || 0) : 0;
      if (!pricePerKg) return 0;
      const qOpt = quantityOptions.find((q) => q.value === quantityValue);
      const kg = qOpt ? qOpt.kg : 1;
      return pricePerKg * kg;
    },
    [gradeMap]
  );

  const calculateTotalRicePrice = useMemo(() => {
    return form.selectedItems.reduce((total, item) => total + calculateItemPrice(item.variety, item.grade, item.quantity), 0);
  }, [form.selectedItems, calculateItemPrice]);

  const calculateShippingCharges = useMemo(() => {
    const isInternational = form.countryCode !== "+91";
    const charges = isInternational ? shippingCharges.international : shippingCharges.india;
    return charges[shippingMethod];
  }, [form.countryCode, shippingMethod]);

  const totalAmountINR = useMemo(() => {
    return calculateTotalRicePrice + calculateShippingCharges;
  }, [calculateTotalRicePrice, calculateShippingCharges]);

  // Currency conversion helper
  const convertToLocalCurrency = useCallback((amountINR) => {
    const currencyInfo = CURRENCY_RATES[form.countryCode] || CURRENCY_RATES["+1"];
    const amount = amountINR * currencyInfo.rate;
    return {
      ...currencyInfo,
      amount: Math.round(amount * 100) / 100,
      amountINR: amountINR
    };
  }, [form.countryCode]);

  const validateEmail = useCallback((email) => {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test((email || "").trim());
  }, []);

  // -------------------------
  // Input handlers (stable via useCallback)
  // -------------------------
  const handleInputChange = useCallback(
    (e) => {
      const { name, value } = e.target;

      if (name === "phone") {
        const digitsOnly = value.replace(/\D/g, "");
        const maxLength = countryCodeRules[form.countryCode].length;
        setPhoneError(digitsOnly.length > maxLength ? `Enter exactly ${maxLength} digits` : "");
        setForm((prev) => ({ ...prev, phone: digitsOnly }));
        return;
      }

      if (name === "countryCode") {
        setForm((prev) => ({
          ...prev,
          countryCode: value,
          phone: "",
          pincode: "",
          area: "",
          town: "",
          city: "",
          district: "",
          landmark: "",
        }));
        setPhoneError("");
        return;
      }

      if (name === "pincode") {
        let cleaned = value;
        if (form.countryCode === "+44") {
          cleaned = value.toUpperCase().replace(/[^A-Z0-9\s]/g, "");
        } else {
          cleaned = value.replace(/\D/g, "").slice(0, 10);
        }
        setForm((prev) => ({ ...prev, pincode: cleaned }));
        return;
      }

      if (name === "email") {
        setForm((prev) => ({ ...prev, email: value }));
        setEmailError(value.trim() && !validateEmail(value) ? "Invalid email" : "");
        return;
      }

      setForm((prev) => ({ ...prev, [name]: value }));
    },
    [form.countryCode, validateEmail]
  );

  // -------------------------
  // Simplified item selection helpers
  // -------------------------
  const toggleItem = useCallback(
    (variety, grade) => {
      setForm((prev) => {
        const key = `${variety}:::${grade}`;
        const exists = prev.selectedItems.find((i) => i.key === key);
        if (exists) {
          return { ...prev, selectedItems: prev.selectedItems.filter((i) => i.key !== key) };
        } else {
          const price = calculateItemPrice(variety, grade, "1 kg");
          return {
            ...prev,
            selectedItems: [...prev.selectedItems, { variety, grade, quantity: "1 kg", key, price }],
          };
        }
      });
    },
    [calculateItemPrice]
  );

  const updateQuantity = useCallback(
    (key, newQuantity) => {
      setForm((prev) => ({
        ...prev,
        selectedItems: prev.selectedItems.map((item) => {
          if (item.key === key) {
            const newPrice = calculateItemPrice(item.variety, item.grade, newQuantity);
            return { ...item, quantity: newQuantity, price: newPrice };
          }
          return item;
        }),
      }));
    },
    [calculateItemPrice]
  );

  // -------------------------
  // Remove item from selection
  // -------------------------
  const removeItem = useCallback((key) => {
    setForm((prev) => ({
      ...prev,
      selectedItems: prev.selectedItems.filter((item) => item.key !== key),
    }));
  }, []);

  // -------------------------
  // Persist sample quote (non-blocking)
  // -------------------------
  const saveSampleQuoteToFirebase = useCallback(async (payload) => {
    try {
      const { submitQuote } = await import("../firebase");
      if (submitQuote) await submitQuote(payload);
    } catch (err) {
      console.error("Failed to save sample order:", err);
    }
  }, []);

  // -------------------------
  // sendToWhatsApp / Payment flows
  // -------------------------
  const sendToWhatsApp = useCallback(
    async (currency = "INR", amount = null, paymentMethod = "Razorpay") => {
      const required = ["name", "company", "doorNo", "area", "town", "city", "district", "pincode", "phone", "email"];
      const missing = required.filter((f) => !form[f]?.trim());
      const phoneOk = form.phone.length === countryCodeRules[form.countryCode].length && !phoneError;
      const pinOk = form.pincode.length >= 4;
      const emailOk = validateEmail(form.email);
      const samplesOk = form.selectedItems.length > 0;

      if (missing.length > 0 || !phoneOk || !pinOk || !emailOk || !samplesOk) {
        alert("ALL FIELDS ARE MANDATORY! Please fill everything correctly.");
        return false;
      }

      const fullPhone = form.countryCode + form.phone;
      const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER || "919247485871";
      const address = `${form.doorNo}, ${form.area}, ${form.town}, ${form.city}, ${form.district} - ${form.pincode}${form.landmark ? ` (Landmark: ${form.landmark})` : ""}`;

      const itemsList = form.selectedItems
        .map(
          (item, i) =>
            `${i + 1}. *Variety*: ${item.variety}\n   *Grade*: ${item.grade}\n   *Weight*: ${item.quantity}\n   *Price*: ₹${item.price.toFixed(2)}`
        )
        .join("\n\n");

      const totalRicePrice = form.selectedItems.reduce((s, it) => s + Number(it.price || 0), 0);
      const shippingPrice = calculateShippingCharges;
      const totalAmount = totalRicePrice + shippingPrice;
      const paymentAmount = amount || `₹${totalAmount.toFixed(2)}`;

      const message =
        `*Rice Sample Request - PAID*\n\n` +
        `*Samples*:\n${itemsList}\n\n` +
        `*Price Breakdown*:\n` +
        `*Rice Total*: ₹${totalRicePrice.toFixed(2)}\n` +
        `*Shipping (${shippingMethod.toUpperCase()})*: ₹${shippingPrice.toFixed(2)}\n` +
        `*Total Amount*: ₹${totalAmount.toFixed(2)}\n\n` +
        `*Customer Details*:\n` +
        `*Name*: ${form.name}\n` +
        `*Company*: ${form.company}\n` +
        `*Full Address*: ${address}\n` +
        `*Country*: ${countryCodeRules[form.countryCode].name}\n` +
        `*Phone*: ${fullPhone}\n` +
        `*Email*: ${form.email}\n\n` +
        `*Shipping Method*: ${shippingMethod.toUpperCase()}\n` +
        `*Payment Status*: Paid (${paymentAmount})\n` +
        `*Payment Method*: ${paymentMethod}\n` +
        `*Time*: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`.trim();

      // Save to firebase (non-blocking)
      saveSampleQuoteToFirebase({
        type: "sample_courier",
        name: form.name,
        company: form.company,
        email: form.email,
        phone: fullPhone,
        address,
        country: countryCodeRules[form.countryCode].name,
        items: form.selectedItems,
        shippingMethod,
        riceTotal: totalRicePrice,
        shippingCharge: shippingPrice,
        totalAmount: totalAmount,
        paymentMethod,
        paymentStatus: "Paid",
        timestamp: Date.now(),
        status: "Pending Dispatch",
      });

      const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
      window.open(url, "_blank");
      alert("Payment Successful! Your sample request has been sent and saved.");

      // Reset
      setForm({
        name: "",
        company: "",
        doorNo: "",
        area: "",
        town: "",
        city: "",
        district: "",
        pincode: "",
        landmark: "",
        phone: "",
        email: "",
        countryCode: "+91",
        selectedItems: [],
        submitted: false,
      });

      return true;
    },
    [form, phoneError, saveSampleQuoteToFirebase, shippingMethod]
  );

  const currentLength = countryCodeRules[form.countryCode]?.length || 10;
  const allFieldsValid = useCallback(() => {
    const req = ["name", "company", "doorNo", "area", "town", "city", "district", "pincode", "phone", "email"];
    return (
      req.every((f) => form[f]?.trim()) &&
      form.phone.length === currentLength &&
      !phoneError &&
      form.pincode.length >= 4 &&
      validateEmail(form.email) &&
      form.selectedItems.length > 0
    );
  }, [form, currentLength, phoneError, validateEmail]);

  // Razorpay payment for all countries
  const startRazorpayPayment = useCallback(async () => {
    setForm((prev) => ({ ...prev, submitted: true }));
    if (!allFieldsValid()) {
      alert("Please fill all required fields correctly before making payment.");
      return;
    }

    setPaymentLoading(true);
    setApiLoading(true);

    try {
      const sdkLoaded = await loadRazorpay();
      if (!sdkLoaded) {
        alert("Razorpay SDK failed to load");
        return;
      }

      const riceTotal = form.selectedItems.reduce((s, it) => s + Number(it.price || 0), 0);
      const shipping = calculateShippingCharges;
      const totalAmountINR = riceTotal + shipping;

      // Always use INR for Razorpay
      const amount = Math.round(totalAmountINR * 100); // Convert to paise

      const orderRes = await fetch(`${API_BASE_URL}/create-razorpay-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ 
          amount: amount,
          currency: "INR",
          countryCode: form.countryCode,
          totalInr: totalAmountINR
        }),
      });

      if (!orderRes.ok) {
        throw new Error(`Failed to create order: ${orderRes.status} ${orderRes.statusText}`);
      }

      const data = await orderRes.json();
      if (!data.order || !data.order.id) throw new Error("Invalid order response from server");
      const order = data.order;

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_RfSBzDny9nssx0",
        amount: order.amount,
        currency: order.currency,
        name: import.meta.env.VITE_COMPANY_NAME || "Sai Import Export Agro",
        description: "Rice Sample Courier Service Payment",
        order_id: order.id,
        handler: function (response) {
          const localCurrency = convertToLocalCurrency(totalAmountINR);
          sendToWhatsApp("INR", `${localCurrency.symbol}${localCurrency.amount.toFixed(2)} ${localCurrency.code}`, "Razorpay");
        },
        prefill: {
          name: form.name,
          email: form.email,
          contact: form.countryCode + form.phone,
        },
        theme: { color: "#F4C430" },
        modal: {
          ondismiss: function () {
            setPaymentLoading(false);
            setApiLoading(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error("Payment error:", error);
      if (error.message.includes("Failed to fetch")) {
        alert("Cannot connect to payment server. Please check your internet connection or try again later.");
      } else {
        alert(`Payment failed: ${error.message}`);
      }
    } finally {
      setPaymentLoading(false);
      setApiLoading(false);
    }
  }, [API_BASE_URL, allFieldsValid, form, sendToWhatsApp, calculateShippingCharges, convertToLocalCurrency]);

  const startPayment = useCallback(() => {
    startRazorpayPayment();
  }, [startRazorpayPayment]);

  // Services (kept same visuals)
  const servicesList = useMemo(
    () => [
      { image: MapImage, titleKey: "trusted_pan_india_network" },
      { image: Branding, titleKey: "branding_packaging_services" },
      { image: Profitable, titleKey: "profitable_purchase" },
      { image: Personalization, titleKey: "personalization_available" },
      { image: Guidance, titleKey: "professional_guidance" },
      { image: Quality, titleKey: "quality_assured" },
    ],
    []
  );

  const serviceOptions = useMemo(() => [...Object.keys(otherServices), "Sample Courier Services"], []);

  const toggleDropdown = useCallback(() => setIsDropdownOpen((s) => !s), []);
  const handleServiceSelect = useCallback((service) => {
    setSelectedService(service);
    setIsDropdownOpen(false);
    if (service === "Sample Courier Services") {
      setForm({
        name: "",
        company: "",
        doorNo: "",
        area: "",
        town: "",
        city: "",
        district: "",
        pincode: "",
        landmark: "",
        phone: "",
        email: "",
        countryCode: "+91",
        selectedItems: [],
        submitted: false,
      });
      setPhoneError("");
      setEmailError("");
    }
  }, []);

  const showForm = selectedService === "Sample Courier Services";

  const getPaymentButtonText = useCallback(() => {
    const localCurrency = convertToLocalCurrency(totalAmountINR);
    
    if (form.countryCode === "+91") {
      return `Pay Now: ₹${totalAmountINR.toFixed(2)}`;
    } else {
      return `Pay Now: ${localCurrency.symbol}${localCurrency.amount.toFixed(2)} ${localCurrency.code}`;
    }
  }, [form.countryCode, totalAmountINR, convertToLocalCurrency]);

  const shippingOptionsToShow = useMemo(() => {
    const localCurrency = convertToLocalCurrency(1); // Get currency info
    
    if (form.countryCode === "+91") {
      return [
        { value: "airways", label: "Airways", info: `₹350`, localInfo: `₹350` },
        { value: "train", label: "Train", info: `₹250`, localInfo: `₹250` }
      ];
    } else {
      const airwaysLocal = convertToLocalCurrency(1500);
      const shipLocal = convertToLocalCurrency(800);
      return [
        { 
          value: "airways", 
          label: "Airways", 
          info: `₹1500`, 
          localInfo: `${airwaysLocal.symbol}${airwaysLocal.amount.toFixed(2)} ${airwaysLocal.code}` 
        },
        { 
          value: "ship", 
          label: "Ship", 
          info: `₹800`, 
          localInfo: `${shipLocal.symbol}${shipLocal.amount.toFixed(2)} ${shipLocal.code}` 
        }
      ];
    }
  }, [form.countryCode, convertToLocalCurrency]);

  // -------------------------
  // Render with simplified product selection UI
  // -------------------------
  return (
    <>
      <section className="service-section">
        <div className="container">
          <h1 className="tw-text-3xl tw-font-bold tw-text-yellow-400 tw-mb-8 tw-text-center service-heading">
            {t("our_services")}
          </h1>

          <div className="service-grid">
            {servicesList.map((service, index) => (
              <div key={index} className="service-card">
                <img src={service.image} alt={t(service.titleKey)} className="service-image" />
                <p className="service-title" dangerouslySetInnerHTML={{ __html: t(service.titleKey).replace("&", "&amp;") }} />
              </div>
            ))}
          </div>

          <div className="other-services-section tw-mt-16">
            <h2 className="tw-text-2xl tw-font-bold tw-text-yellow-400 tw-mb-6 tw-text-center">Other Services</h2>

            <div className="service-dropdown-container tw-mb-8">
              <div className="relative tw-w-full tw-max-w-md tw-mx-auto">
                <button onClick={toggleDropdown} className="region-button tw-w-full">
                  <span>{selectedService || "Select vendor type"}</span>
                  <div className={`chevron-icon ${isDropdownOpen ? "open" : ""}`}>
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
                {isDropdownOpen && (
                  <div className="region-content tw-max-h-60 tw-overflow-y-auto">
                    {serviceOptions.map((serviceOpt, idx) => (
                      <button key={String(serviceOpt) + "-" + idx} onClick={() => handleServiceSelect(serviceOpt)} className="dropdown-item">
                        {serviceOpt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {selectedService && otherServices[selectedService] && selectedService !== "Sample Courier Services" && (
              <div className="tw-grid tw-grid-cols-1 sm:tw-grid-cols-2 lg:tw-grid-cols-3 tw-gap-8 tw-mt-12">
                {otherServices[selectedService].map((vendor) => {
                  const cleanNum = (vendor.contactNo || "").replace(/\D/g, "");
                  let phone = cleanNum.startsWith("91") && cleanNum.length > 10 ? cleanNum.slice(2) : cleanNum;
                  if (cleanNum.length > 10) phone = cleanNum.slice(-10);

                  const emailLink = vendor.email && vendor.email !== "N/A" ? `mailto:${vendor.email}` : null;
                  const callLink = phone.length >= 10 ? `tel:+91${phone}` : null;

                  const hasEmail = !!emailLink;
                  const hasPhone = !!callLink;
                  const buttonCount = (hasEmail ? 1 : 0) + (hasPhone ? 1 : 0);

                  return (
                    <div
                      key={vendor.serialNo || vendor.partyName || JSON.stringify(vendor)}
                      className="tw-relative tw-bg-gray-900 tw-border-2 tw-border-yellow-500 tw-rounded-2xl tw-overflow-hidden tw-shadow-2xl tw-flex tw-flex-col tw-h-full"
                      style={{ borderTop: "10px solid #FFD700" }}
                    >
                      <div className="tw-absolute -tw-top-5 -tw-left-5 tw-w-14 tw-h-14 tw-bg-yellow-500 tw-rounded-full tw-flex tw-items-center tw-justify-center tw-text-black tw-font-bold tw-text-2xl tw-shadow-2xl tw-z-10">
                        {vendor.serialNo}
                      </div>
                      <div className="tw-p-8 tw-pt-12 tw-flex-1 tw-flex tw-flex-col">
                        <h3 className="tw-text-2xl tw-font-extrabold tw-text-yellow-400 tw-mb-5 tw-tracking-tight">{safeString(vendor.partyName)}</h3>
                        <div className="tw-space-y-4 tw-flex-1">
                          <div>
                            <p className="tw-text-xs tw-text-gray-400 tw-uppercase tw-tracking-wider">Product:</p>
                            <p className="tw-text-white tw-font-semibold">{safeString(vendor.product)}</p>
                          </div>
                          <div>
                            <p className="tw-text-xs tw-text-gray-400 tw-uppercase tw-tracking-wider">Address:</p>
                            <p className="tw-text-white tw-font-medium">{safeString(vendor.address)}</p>
                          </div>
                          {vendor.contactPerson && (
                            <div>
                              <p className="tw-text-xs tw-text-gray-400 tw-uppercase tw-tracking-wider">Contact Person:</p>
                              <p className="tw-text-white tw-font-medium">{safeString(vendor.contactPerson)}</p>
                            </div>
                          )}
                        </div>
                        <div className={`tw-flex tw-gap-4 tw-mt-8 ${buttonCount === 1 ? "tw-justify-center" : "tw-justify-between"}`}>
                          {hasEmail && (
                            <a href={emailLink} className="tw-flex tw-items-center tw-justify-center tw-gap-2 tw-w-40 tw-bg-transparent tw-border-2 tw-border-yellow-500 tw-text-yellow-400 tw-font-bold tw-py-3 tw-px-4 tw-rounded-xl hover:tw-bg-yellow-500 hover:tw-text-black tw-transition-all tw-shadow-lg">
                              Email
                            </a>
                          )}
                          {hasPhone && (
                            <a href={callLink} className="tw-flex tw-items-center tw-justify-center tw-gap-2 tw-w-40 tw-bg-transparent tw-border-2 tw-border-yellow-500 tw-text-yellow-400 tw-font-bold tw-py-3 tw-px-4 tw-rounded-xl hover:tw-bg-yellow-500 hover:tw-text-black tw-transition-all tw-shadow-lg">
                              Call
                            </a>
                          )}
                          {buttonCount === 0 && <p className="tw-text-gray-500 tw-text-sm tw-italic tw-w-full tw-text-center">Contact details not available</p>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {showForm && (
              <div className="tw-mt-16 tw-max-w-6xl tw-mx-auto tw-p-10 tw-bg-black/40 tw-backdrop-blur-xl tw-rounded-3xl tw-shadow-2xl tw-border-4 tw-border-yellow-400 tw-relative overflow-hidden">
                <div className="tw-absolute tw-inset-0 tw-border-4 tw-border-yellow-500 tw-rounded-3xl tw-pointer-events-none tw-opacity-50"></div>

                <h4 className="tw-text-4xl tw-font-extrabold tw-text-yellow-400 tw-mb-10 tw-text-center tw-tracking-tight tw-drop-shadow-lg">
                  Request Multiple Rice Samples
                </h4>

                <div className="tw-space-y-8">
                  {/* Contact inputs */}
                  <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-8">
                    <div>
                      <input type="text" name="name" placeholder="Your Name *" value={form.name} onChange={handleInputChange}
                        className="tw-w-full tw-px-6 tw-py-5 tw-rounded-2xl tw-bg-black/60 tw-backdrop-blur-md tw-text-yellow-100 placeholder:tw-text-yellow-500 tw-border-2 tw-border-yellow-600 focus:tw-outline-none focus:tw-ring-4 focus:tw-ring-yellow-400 tw-transition-all tw-shadow-xl" />
                      {!form.name && form.submitted && <p className="tw-text-red-400 tw-text-sm tw-mt-2">Required</p>}
                    </div>
                    <div>
                      <input type="text" name="company" placeholder="Company Name *" value={form.company} onChange={handleInputChange}
                        className="tw-w-full tw-px-6 tw-py-5 tw-rounded-2xl tw-bg-black/60 tw-backdrop-blur-md tw-text-yellow-100 placeholder:tw-text-yellow-500 tw-border-2 tw-border-yellow-600 focus:tw-outline-none focus:tw-ring-4 focus:tw-ring-yellow-400 tw-transition-all tw-shadow-xl" />
                      {!form.company && form.submitted && <p className="tw-text-red-400 tw-text-sm tw-mt-2">Required</p>}
                    </div>
                  </div>

                  <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-8">
                    <div>
                      <div className="tw-flex tw-rounded-2xl tw-overflow-hidden tw-border-2 tw-border-yellow-600">
                        <select name="countryCode" value={form.countryCode} onChange={handleInputChange} className="tw-px-3 tw-py-5 tw-w-32 tw-bg-black/70 tw-backdrop-blur-md tw-text-yellow-100 tw-border-r-2 tw-border-r-yellow-600 tw-outline-none tw-text-sm">
                          {Object.keys(countryCodeRules).map(code => (
                            <option key={code} value={code} className="tw-bg-black">{code} {countryCodeRules[code].name}</option>
                          ))}
                        </select>
                        <input type="tel" name="phone" placeholder={`Enter ${currentLength} digits *`} value={form.phone} onChange={handleInputChange} maxLength={currentLength} className="tw-flex-1 tw-px-5 tw-py-5 tw-bg-black/60 tw-backdrop-blur-md tw-text-yellow-100 placeholder:tw-text-yellow-500 tw-outline-none" />
                      </div>
                      {phoneError && <p className="tw-text-red-400 tw-text-sm tw-mt-2">{phoneError}</p>}
                      {!form.phone && form.submitted && <p className="tw-text-red-400 tw-text-sm tw-mt-2">Required</p>}
                    </div>
                    <div>
                      <input type="email" name="email" placeholder="Email Address *" value={form.email} onChange={handleInputChange} className="tw-w-full tw-px-6 tw-py-5 tw-rounded-2xl tw-bg-black/60 tw-backdrop-blur-md tw-text-yellow-100 placeholder:tw-text-yellow-500 tw-border-2 tw-border-yellow-600 focus:tw-ring-4 focus:tw-ring-yellow-400 tw-shadow-xl" />
                      {emailError && <p className="tw-text-red-400 tw-text-sm tw-mt-2">{emailError}</p>}
                      {!form.email && form.submitted && <p className="tw-text-red-400 tw-text-sm tw-mt-2">Required</p>}
                    </div>
                  </div>

                  {/* Shipping - shows Airways + Train for India, Airways + Ship for International */}
                  <div className="tw-bg-black/50 tw-backdrop-blur-lg tw-rounded-3xl tw-p-8 tw-border-2 tw-border-yellow-600">
                    <h5 className="tw-text-xl tw-font-bold tw-text-yellow-400 tw-mb-6 tw-text-center">Shipping Method</h5>
                    <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-6">
                      {shippingOptionsToShow.map((opt) => (
                        <div key={opt.value}>
                          <label className="tw-flex tw-items-center tw-space-x-4 tw-cursor-pointer">
                            <input type="radio" name="shippingMethod" value={opt.value} checked={shippingMethod === opt.value} onChange={(e) => setShippingMethod(e.target.value)} className="tw-w-5 tw-h-5 tw-text-yellow-400" />
                            <div className="tw-flex-1">
                              <span className="tw-text-yellow-100 tw-font-semibold tw-text-lg">{opt.label}</span>
                              <p className="tw-text-gray-400 tw-text-sm">
                                {opt.localInfo} - {opt.label === "Ship" ? "Economical (10-20 days)" : "Faster delivery (3-10 days)"}
                              </p>
                              {form.countryCode !== "+91" && (
                                <p className="tw-text-xs tw-text-blue-300 mt-1">({opt.info} INR)</p>
                              )}
                            </div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Delivery address */}
                  <div className="tw-bg-black/50 tw-backdrop-blur-lg tw-rounded-3xl tw-p-8 tw-border-2 tw-border-yellow-600">
                    <h5 className="tw-text-xl tw-font-bold tw-text-yellow-400 tw-mb-6 tw-text-center">Delivery Address</h5>
                    <div className="tw-grid tw-grid-cols-1 sm:tw-grid-cols-2 tw-gap-6">
                      <div>
                        <input type="text" name="doorNo" placeholder="Door No / Apt / Plot *" value={form.doorNo} onChange={handleInputChange} className="tw-w-full tw-px-5 tw-py-4 tw-rounded-xl tw-bg-black/60 tw-text-yellow-100 placeholder:tw-text-yellow-500 tw-border tw-border-yellow-700 focus:tw-ring-4 focus:tw-ring-yellow-400" />
                        {!form.doorNo && form.submitted && <p className="tw-text-red-400 tw-text-xs tw-mt-1">Required</p>}
                      </div>
                      <div>
                        <input type="text" name="area" placeholder="Area / Street / Locality *" value={form.area} onChange={handleInputChange} className="tw-w-full tw-px-5 tw-py-4 tw-rounded-xl tw-bg-black/60 tw-text-yellow-100 placeholder:tw-text-yellow-500 tw-border tw-border-yellow-700 focus:tw-ring-4 focus:tw-ring-yellow-400" />
                        {!form.area && form.submitted && <p className="tw-text-red-400 tw-text-xs tw-mt-1">Required</p>}
                      </div>
                      <div>
                        <input type="text" name="town" placeholder="Town / Suburb / Mandal *" value={form.town} onChange={handleInputChange} className="tw-w-full tw-px-5 tw-py-4 tw-rounded-xl tw-bg-black/60 tw-text-yellow-100 placeholder:tw-text-yellow-500 tw-border tw-border-yellow-700 focus:tw-ring-4 focus:tw-ring-yellow-400" />
                        {!form.town && form.submitted && <p className="tw-text-red-400 tw-text-xs tw-mt-1">Required</p>}
                      </div>
                      <div>
                        <input type="text" name="city" placeholder="City *" value={form.city} onChange={handleInputChange} className="tw-w-full tw-px-5 tw-py-4 tw-rounded-xl tw-bg-black/60 tw-text-yellow-100 placeholder:tw-text-yellow-500 tw-border tw-border-yellow-700 focus:tw-ring-4 focus:tw-ring-yellow-400" />
                        {!form.city && form.submitted && <p className="tw-text-red-400 tw-text-xs tw-mt-1">Required</p>}
                      </div>
                      <div>
                        <input type="text" name="district" placeholder="District / County *" value={form.district} onChange={handleInputChange} className="tw-w-full tw-px-5 tw-py-4 tw-rounded-xl tw-bg-black/60 tw-text-yellow-100 placeholder:tw-text-yellow-500 tw-border tw-border-yellow-700 focus:tw-ring-4 focus:tw-ring-yellow-400" />
                        {!form.district && form.submitted && <p className="tw-text-red-400 tw-text-xs tw-mt-1">Required</p>}
                      </div>
                      <div>
                        <input
                          type="text"
                          name="pincode"
                          placeholder={form.countryCode === "+44" ? "Postcode (e.g. SW1A 1AA) *" : "Zip / Postal Code *"}
                          value={form.pincode}
                          onChange={handleInputChange}
                          maxLength="12"
                          className="tw-w-full tw-px-5 tw-py-4 tw-rounded-xl tw-bg-black/60 tw-text-yellow-100 placeholder:tw-text-yellow-500 tw-border tw-border-yellow-700 focus:tw-ring-4 focus:tw-ring-yellow-400 tw-font-mono"
                        />
                        {form.pincode && form.pincode.length < 4 && form.submitted && <p className="tw-text-red-400 tw-text-xs tw-mt-1">Too short</p>}
                        {!form.pincode && form.submitted && <p className="tw-text-red-400 tw-text-xs tw-mt-1">Required</p>}
                      </div>
                      <div className="sm:tw-col-span-2">
                        <input type="text" name="landmark" placeholder="Landmark / Nearby Place (Optional)" value={form.landmark} onChange={handleInputChange} className="tw-w-full tw-px-5 tw-py-4 tw-rounded-xl tw-bg-black/60 tw-text-yellow-100 placeholder:tw-text-yellow-500 tw-border tw-border-yellow-700 focus:tw-ring-4 focus:tw-ring-yellow-400" />
                        <p className="tw-text-gray-400 tw-text-xs tw-mt-1">Help delivery partners locate your address easily</p>
                      </div>
                    </div>
                  </div>

                  {/* SIMPLIFIED: Select Samples & Quantity */}
                  <div className="tw-bg-black/50 tw-backdrop-blur-lg tw-rounded-3xl tw-p-8 tw-border-2 tw-border-yellow-500">
                    <h5 className="tw-text-2xl tw-font-bold tw-text-yellow-400 tw-mb-6 tw-text-center">Select Samples & Quantity</h5>
                    
                    {/* Category Selection Tabs */}
                    <div className="tw-mb-8">
                      <div className="tw-flex tw-flex-wrap tw-gap-3 tw-justify-center">
                        {varietyOptions.map((category) => (
                          <button
                            key={category}
                            onClick={() => setSelectedCategory(category)}
                            className={`tw-px-5 tw-py-3 tw-rounded-xl tw-font-semibold tw-transition-all ${
                              selectedCategory === category
                                ? "tw-bg-yellow-500 tw-text-black"
                                : "tw-bg-black/60 tw-text-yellow-300 hover:tw-bg-yellow-600 hover:tw-text-black"
                            }`}
                          >
                            {category}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Products Grid for Selected Category */}
                    <div className="tw-space-y-6">
                      {selectedCategory && gradeMap[selectedCategory] && gradeMap[selectedCategory].length > 0 ? (
                        <div className="tw-grid tw-grid-cols-1 sm:tw-grid-cols-2 lg:tw-grid-cols-3 tw-gap-6">
                          {gradeMap[selectedCategory].map((gradeObj, index) => {
                            const gradeName = safeString(gradeObj.name || "Unknown");
                            const key = `${selectedCategory}:::${gradeName}`;
                            const item = form.selectedItems.find((i) => i.key === key);
                            const isChecked = !!item;
                            const pricePerKg = Number(gradeObj.price || 0);
                            const localCurrency = convertToLocalCurrency(1);
                            const localPricePerKg = pricePerKg * localCurrency.rate;
                            
                            return (
                              <div 
                                key={`${selectedCategory}-${gradeName}-${index}`} 
                                className={`tw-rounded-2xl tw-p-5 tw-border-2 tw-transition-all tw-cursor-pointer ${
                                  isChecked 
                                    ? "tw-border-yellow-400 tw-bg-yellow-900/30" 
                                    : "tw-border-yellow-700 tw-bg-black/40 hover:tw-border-yellow-500"
                                }`}
                                onClick={() => toggleItem(selectedCategory, gradeName)}
                              >
                                <div className="tw-flex tw-items-start tw-justify-between tw-mb-3">
                                  <div>
                                    <h6 className="tw-text-lg tw-font-bold tw-text-yellow-200">{gradeName}</h6>
                                    <p className="tw-text-yellow-400 tw-text-sm">
                                      ₹{pricePerKg}/kg
                                      {form.countryCode !== "+91" && (
                                        <span className="tw-text-blue-300 tw-text-xs tw-block">
                                          ≈ {localCurrency.symbol}{localPricePerKg.toFixed(2)}/kg
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                  <div className={`tw-w-6 tw-h-6 tw-rounded tw-flex tw-items-center tw-justify-center ${
                                    isChecked ? "tw-bg-yellow-400" : "tw-bg-gray-700"
                                  }`}>
                                    {isChecked && (
                                      <svg className="tw-w-4 tw-h-4 tw-text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </div>
                                </div>
                                
                                {isChecked && (
                                  <div className="tw-mt-4">
                                    <label className="tw-block tw-text-yellow-300 tw-text-sm tw-mb-2">Select Quantity:</label>
                                    <select 
                                      value={item?.quantity} 
                                      onChange={(e) => updateQuantity(key, e.target.value)}
                                      onClick={(e) => e.stopPropagation()}
                                      className="tw-w-full tw-px-3 tw-py-2 tw-bg-black/70 tw-backdrop-blur-md tw-text-yellow-100 tw-border tw-border-yellow-600 tw-rounded-lg tw-text-sm focus:tw-ring-2 focus:tw-ring-yellow-400"
                                    >
                                      {quantityOptions.map((q) => {
                                        const itemPriceINR = pricePerKg * q.kg;
                                        const localItemPrice = itemPriceINR * localCurrency.rate;
                                        return (
                                          <option key={q.value} value={q.value} className="tw-bg-black">
                                            {q.label} 
                                            {form.countryCode === "+91" 
                                              ? ` (₹${itemPriceINR.toFixed(2)})`
                                              : ` (${localCurrency.symbol}${localItemPrice.toFixed(2)} ${localCurrency.code})`
                                            }
                                          </option>
                                        );
                                      })}
                                    </select>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="tw-text-center tw-py-10">
                          <p className="tw-text-gray-400">No products available in this category.</p>
                        </div>
                      )}
                    </div>

                    {/* Selected Items Summary */}
                    {form.selectedItems.length > 0 && (
                      <div className="tw-mt-10 tw-p-6 tw-bg-gradient-to-br tw-from-yellow-900/50 tw-to-black/70 tw-backdrop-blur-lg tw-rounded-2xl tw-border-2 tw-border-yellow-500">
                        <div className="tw-flex tw-items-center tw-justify-between tw-mb-6">
                          <h6 className="tw-text-2xl tw-font-bold tw-text-yellow-300">
                            Selected Items ({form.selectedItems.length})
                          </h6>
                          <button
                            onClick={() => {
                              if (window.confirm("Remove all selected items?")) {
                                setForm(prev => ({ ...prev, selectedItems: [] }));
                              }
                            }}
                            className="tw-px-4 tw-py-2 tw-bg-red-600/30 tw-text-red-300 hover:tw-bg-red-600/50 tw-rounded-lg tw-transition-colors"
                          >
                            Clear All
                          </button>
                        </div>
                        
                        <div className="tw-space-y-4">
                          {form.selectedItems.map((item) => {
                            const localCurrency = convertToLocalCurrency(item.price);
                            return (
                              <div key={item.key} className="tw-flex tw-items-center tw-justify-between tw-p-4 tw-bg-black/40 tw-rounded-xl tw-border tw-border-yellow-600">
                                <div>
                                  <p className="tw-text-yellow-200 tw-font-semibold">
                                    {item.variety} - {item.grade}
                                  </p>
                                  <p className="tw-text-yellow-300 tw-text-sm">
                                    Quantity: {item.quantity}
                                  </p>
                                </div>
                                <div className="tw-flex tw-items-center tw-gap-4">
                                  <div className="tw-text-right">
                                    <p className="tw-text-green-400 tw-font-bold">₹{Number(item.price).toFixed(2)}</p>
                                    {form.countryCode !== "+91" && (
                                      <p className="tw-text-blue-300 tw-text-xs">
                                        ≈ {localCurrency.symbol}{localCurrency.amount.toFixed(2)} {localCurrency.code}
                                      </p>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => removeItem(item.key)}
                                    className="tw-p-2 tw-text-red-400 hover:tw-bg-red-900/30 tw-rounded-lg tw-transition-colors"
                                  >
                                    <svg className="tw-w-5 tw-h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Price Summary */}
                        <div className="tw-mt-8 tw-p-6 tw-bg-black/50 tw-rounded-xl tw-border tw-border-yellow-600">
                          <h6 className="tw-text-xl tw-font-bold tw-text-yellow-300 tw-mb-4">Price Summary</h6>
                          <div className="tw-space-y-3">
                            <div className="tw-flex tw-justify-between">
                              <span className="tw-text-yellow-100">Rice Total:</span>
                              <span className="tw-text-yellow-300 tw-font-semibold">
                                ₹{form.selectedItems.reduce((s, it) => s + Number(it.price || 0), 0).toFixed(2)}
                              </span>
                            </div>
                            <div className="tw-flex tw-justify-between">
                              <span className="tw-text-yellow-100">Shipping ({shippingMethod}):</span>
                              <span className="tw-text-yellow-300 tw-font-semibold">
                                ₹{calculateShippingCharges.toFixed(2)}
                              </span>
                            </div>
                            <div className="tw-border-t tw-border-yellow-600 tw-pt-3 tw-mt-3">
                              <div className="tw-flex tw-justify-between tw-items-center">
                                <span className="tw-text-lg tw-font-bold tw-text-yellow-300">Total Amount:</span>
                                <div className="tw-text-right">
                                  <p className="tw-text-2xl tw-font-bold tw-text-yellow-400">
                                    ₹{totalAmountINR.toFixed(2)}
                                  </p>
                                  {form.countryCode !== "+91" && (
                                    <p className="tw-text-blue-300 tw-text-sm">
                                      ≈ {convertToLocalCurrency(totalAmountINR).symbol}
                                      {convertToLocalCurrency(totalAmountINR).amount.toFixed(2)} 
                                      {convertToLocalCurrency(totalAmountINR).code}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Payment */}
                  <div className="tw-bg-black/50 tw-backdrop-blur-lg tw-rounded-3xl tw-p-8 tw-border-2 tw-border-yellow-500">
                    <h5 className="tw-text-2xl tw-font-bold tw-text-yellow-400 tw-mb-6 tw-text-center">
                      {form.countryCode === "+91" 
                        ? "Secure Payment (Razorpay)" 
                        : `International Payment (${convertToLocalCurrency(1).name} → INR)`
                      }
                    </h5>

                    {apiLoading && (
                      <div className="tw-flex tw-items-center tw-justify-center tw-mb-4">
                        <div className="tw-w-6 tw-h-6 tw-border-2 tw-border-yellow-400 tw-border-t-transparent tw-rounded-full tw-animate-spin"></div>
                        <span className="tw-ml-2 tw-text-yellow-400">Creating order...</span>
                      </div>
                    )}

                    <button 
                      onClick={startPayment} 
                      disabled={!allFieldsValid() || paymentLoading || apiLoading} 
                      className="tw-w-full tw-max-w-2xl tw-mx-auto tw-py-6 tw-bg-green-500 hover:tw-bg-green-600 tw-text-white tw-font-extrabold tw-text-2xl tw-rounded-2xl tw-flex tw-items-center tw-justify-center tw-gap-4 tw-shadow-2xl tw-transition-all tw-duration-300 transform hover:tw-scale-105 disabled:tw-opacity-50 disabled:tw-cursor-not-allowed"
                    >
                      {paymentLoading ? (
                        <>
                          <div className="tw-w-6 tw-h-6 tw-border-2 tw-border-white tw-border-t-transparent tw-rounded-full tw-animate-spin"></div>
                          Processing Payment...
                        </>
                      ) : (
                        <>
                          <svg className="tw-w-8 tw-h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 5.5V7H9V5.5L3 7V9L5 9.5V15.5L3 16V18L9 16.5V18H15V16.5L21 18V16L19 15.5V9.5L21 9ZM15 16H9V14H15V16ZM15 12H9V10H15V12Z" /></svg>
                          {getPaymentButtonText()}
                        </>
                      )}
                    </button>

                    {form.countryCode !== "+91" && (
                      <div className="tw-mt-6 tw-p-6 tw-bg-black/40 tw-rounded-xl tw-border tw-border-blue-500">
                        <p className="tw-text-yellow-300 tw-text-center tw-font-semibold tw-mb-3">
                          How International Payments Work:
                        </p>
                        <ul className="tw-text-blue-300 tw-text-sm tw-space-y-2">
                          <li className="tw-flex tw-items-start">
                            <span className="tw-text-green-400 tw-mr-2">✓</span>
                            <span>You see prices in <strong>{convertToLocalCurrency(1).name} ({convertToLocalCurrency(1).symbol})</strong></span>
                          </li>
                          <li className="tw-flex tw-items-start">
                            <span className="tw-text-green-400 tw-mr-2">✓</span>
                            <span>Payment is processed in <strong>Indian Rupees (₹)</strong> via Razorpay</span>
                          </li>
                          <li className="tw-flex tw-items-start">
                            <span className="tw-text-green-400 tw-mr-2">✓</span>
                            <span>Your bank automatically converts to your local currency</span>
                          </li>
                          <li className="tw-flex tw-items-start">
                            <span className="tw-text-green-400 tw-mr-2">✓</span>
                            <span>You pay in {convertToLocalCurrency(1).code} - conversion handled by your bank</span>
                          </li>
                        </ul>
                        <p className="tw-text-gray-400 tw-text-xs tw-mt-3 tw-text-center">
                          Exchange rates are approximate. Final amount may vary slightly based on your bank's rates.
                        </p>
                      </div>
                    )}
                  </div>

                  {!allFieldsValid() && form.submitted && (
                    <p className="tw-text-red-500 tw-text-center tw-font-bold tw-text-xl tw-mt-6 tw-animate-pulse">
                      Please fill ALL fields correctly to proceed with payment
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
};

export default Service;