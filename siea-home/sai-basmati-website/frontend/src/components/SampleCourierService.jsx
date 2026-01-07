// src/components/SampleCourierService.jsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { db } from "../firebase";
import { ref, get } from "firebase/database";

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

const SampleCourierService = React.memo(() => {
  const location = useLocation();

  // Split form state to reduce re-renders
  const [contactInfo, setContactInfo] = useState({
    name: "", company: "", email: "", phone: "", countryCode: "+91"
  });

  const [address, setAddress] = useState({
    doorNo: "", area: "", town: "", city: "", district: "",
    pincode: "", landmark: ""
  });

  const [selectedItems, setSelectedItems] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [shippingMethod, setShippingMethod] = useState("airways");

  const [phoneError, setPhoneError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [varietyOptions, setVarietyOptions] = useState([]);
  const [gradeMap, setGradeMap] = useState({});
  const [productsRaw, setProductsRaw] = useState([]);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [apiLoading, setApiLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [visibleProducts, setVisibleProducts] = useState(4);
  const [isLoading, setIsLoading] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://siea.onrender.com";

  // Use refs for values that don't need to trigger re-renders
  const resizeTimeoutRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Reset form when navigating to this component
  useEffect(() => {
    if (location.state?.resetService) {
      resetForm();
    }
  }, [location]);

  // Mobile detection with debouncing
  useEffect(() => {
    const handleResize = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }

      resizeTimeoutRef.current = setTimeout(() => {
        const mobile = window.innerWidth < 768;
        if (mobile !== isMobile) {
          setIsMobile(mobile);
        }
      }, 200);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [isMobile]);

  // Load products from Firebase (optimized)
  useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    const loadProducts = async () => {
      try {
        const snap = await get(ref(db, "products"));
        if (!mounted) return;

        const val = snap.val() || {};

        // Use requestAnimationFrame for non-blocking UI updates
        animationFrameRef.current = requestAnimationFrame(() => {
          if (!mounted) return;

          // Simplified processing
          const list = [];
          const varietiesSet = new Set();
          const gmap = {};

          Object.keys(val).forEach((key, index) => {
            const prod = val[key];
            if (!prod) return;

            // Process in chunks for better performance
            if (index % 10 === 0) {
              // Yield to UI thread
              setTimeout(() => { }, 0);
            }

            const varietyName =
              safeString(prod.name) ||
              safeString(prod.productName) ||
              safeString(prod.variety) ||
              `Product ${key}`;

            list.push({ key, ...prod });
            varietiesSet.add(varietyName);

            // Simplified grade processing
            const grades = prod.grades || prod.grade || [];
            if (Array.isArray(grades) && grades.length) {
              gmap[varietyName] = grades.map(g => {
                if (typeof g === 'string') {
                  return { name: g, price: 0 };
                }
                return {
                  name: safeString(g.name || g.grade || g.gradeName || 'Unknown'),
                  price: Number(g.price || g.price_inr || g.priceINR || 0)
                };
              });
            } else if (prod.price || prod.price_inr) {
              gmap[varietyName] = [{
                name: 'Standard',
                price: Number(prod.price || prod.price_inr || 0)
              }];
            }
          });

          const varietiesArr = Array.from(varietiesSet);
          setProductsRaw(list);
          setVarietyOptions(varietiesArr);
          setGradeMap(gmap);

          // Set first category
          if (varietiesArr.length > 0 && !selectedCategory) {
            setSelectedCategory(varietiesArr[0]);
          }

          setIsLoading(false);
        });

      } catch (err) {
        console.error("Failed to load products:", err);
        if (mounted) setIsLoading(false);
      }
    };

    loadProducts();

    return () => {
      mounted = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, []);

  // Calculate shipping charges
  const calculateShippingCharges = useMemo(() => {
    const isInternational = contactInfo.countryCode !== "+91";
    const charges = isInternational ? shippingCharges.international : shippingCharges.india;
    return charges[shippingMethod] || 0;
  }, [contactInfo.countryCode, shippingMethod]);

  // Calculate item price
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

  // Calculate total price
  const totalAmountINR = useMemo(() => {
    const riceTotal = selectedItems.reduce((total, item) => {
      return total + (item.price || calculateItemPrice(item.variety, item.grade, item.quantity));
    }, 0);
    return riceTotal + calculateShippingCharges;
  }, [selectedItems, calculateShippingCharges, calculateItemPrice]);

  // Currency conversion
  const convertToLocalCurrency = useCallback((amountINR) => {
    const currencyInfo = CURRENCY_RATES[contactInfo.countryCode] || CURRENCY_RATES["+1"];
    const amount = amountINR * currencyInfo.rate;
    return {
      ...currencyInfo,
      amount: Math.round(amount * 100) / 100,
      amountINR: amountINR
    };
  }, [contactInfo.countryCode]);

  // Validate email
  const validateEmail = useCallback((email) => {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test((email || "").trim());
  }, []);

  // Reset form
  const resetForm = useCallback(() => {
    setContactInfo({
      name: "", company: "", email: "", phone: "", countryCode: "+91"
    });
    setAddress({
      doorNo: "", area: "", town: "", city: "", district: "",
      pincode: "", landmark: ""
    });
    setSelectedItems([]);
    setSubmitted(false);
    setShippingMethod("airways");
    setPhoneError("");
    setEmailError("");
    setSelectedCategory(varietyOptions[0] || null);
    setVisibleProducts(4);
  }, [varietyOptions]);

  // Input handlers
  const handleContactChange = useCallback((e) => {
    const { name, value } = e.target;

    if (name === "phone") {
      const digitsOnly = value.replace(/\D/g, "");
      const maxLength = countryCodeRules[contactInfo.countryCode]?.length || 10;
      setPhoneError(digitsOnly.length > maxLength ? `Enter exactly ${maxLength} digits` : "");
      setContactInfo(prev => ({ ...prev, phone: digitsOnly }));
      return;
    }

    if (name === "countryCode") {
      setContactInfo(prev => ({
        ...prev,
        countryCode: value,
        phone: "",
      }));
      setPhoneError("");
      return;
    }

    if (name === "email") {
      setContactInfo(prev => ({ ...prev, email: value }));
      setEmailError(value.trim() && !validateEmail(value) ? "Invalid email" : "");
      return;
    }

    setContactInfo(prev => ({ ...prev, [name]: value }));
  }, [contactInfo.countryCode, validateEmail]);

  const handleAddressChange = useCallback((e) => {
    const { name, value } = e.target;

    if (name === "pincode") {
      let cleaned = value;
      if (contactInfo.countryCode === "+44") {
        cleaned = value.toUpperCase().replace(/[^A-Z0-9\s]/g, "");
      } else {
        cleaned = value.replace(/\D/g, "").slice(0, 10);
      }
      setAddress(prev => ({ ...prev, pincode: cleaned }));
      return;
    }

    setAddress(prev => ({ ...prev, [name]: value }));
  }, [contactInfo.countryCode]);

  // Toggle item selection
  const toggleItem = useCallback(
    (variety, grade) => {
      const key = `${variety}:::${grade}`;
      const exists = selectedItems.find((i) => i.key === key);

      if (exists) {
        setSelectedItems(prev => prev.filter((i) => i.key !== key));
      } else {
        const price = calculateItemPrice(variety, grade, "1 kg");
        setSelectedItems(prev => [...prev, {
          variety,
          grade,
          quantity: "1 kg",
          key,
          price
        }]);
      }
    },
    [selectedItems, calculateItemPrice]
  );

  // Update quantity
  const updateQuantity = useCallback(
    (key, newQuantity) => {
      setSelectedItems(prev => prev.map((item) => {
        if (item.key === key) {
          const newPrice = calculateItemPrice(item.variety, item.grade, newQuantity);
          return { ...item, quantity: newQuantity, price: newPrice };
        }
        return item;
      }));
    },
    [calculateItemPrice]
  );

  // Remove item
  const removeItem = useCallback((key) => {
    setSelectedItems(prev => prev.filter((item) => item.key !== key));
  }, []);

  // Save sample quote
  const saveSampleQuoteToFirebase = useCallback(async (payload) => {
    try {
      const { submitQuote } = await import("../firebase");
      if (submitQuote) await submitQuote(payload);
    } catch (err) {
      console.error("Failed to save sample order:", err);
    }
  }, []);

  // Validate all fields
  const allFieldsValid = useMemo(() => {
    const currentLength = countryCodeRules[contactInfo.countryCode]?.length || 10;
    const contactFields = ["name", "company", "phone", "email"];
    const addressFields = ["doorNo", "area", "town", "city", "district", "pincode"];

    const contactValid = contactFields.every(f => contactInfo[f]?.trim());
    const addressValid = addressFields.every(f => address[f]?.trim());
    const phoneValid = contactInfo.phone.length === currentLength && !phoneError;
    const emailValid = validateEmail(contactInfo.email);
    const itemsValid = selectedItems.length > 0;
    const pincodeValid = address.pincode.length >= 4;

    return contactValid && addressValid && phoneValid && emailValid && itemsValid && pincodeValid;
  }, [contactInfo, address, phoneError, selectedItems, validateEmail]);

  // Send to WhatsApp
  const sendToWhatsApp = useCallback(
    async (currency = "INR", amount = null, paymentMethod = "Razorpay") => {
      const fullPhone = contactInfo.countryCode + contactInfo.phone;
      const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER || "919247485871";
      const addressStr = `${address.doorNo}, ${address.area}, ${address.town}, ${address.city}, ${address.district} - ${address.pincode}${address.landmark ? ` (Landmark: ${address.landmark})` : ""}`;

      const itemsList = selectedItems
        .map(
          (item, i) =>
            `${i + 1}. *Variety*: ${item.variety}\n   *Grade*: ${item.grade}\n   *Weight*: ${item.quantity}\n   *Price*: ₹${item.price.toFixed(2)}`
        )
        .join("\n\n");

      const totalRicePrice = selectedItems.reduce((s, it) => s + Number(it.price || 0), 0);
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
        `*Name*: ${contactInfo.name}\n` +
        `*Company*: ${contactInfo.company}\n` +
        `*Full Address*: ${addressStr}\n` +
        `*Country*: ${countryCodeRules[contactInfo.countryCode]?.name || "India"}\n` +
        `*Phone*: ${fullPhone}\n` +
        `*Email*: ${contactInfo.email}\n\n` +
        `*Shipping Method*: ${shippingMethod.toUpperCase()}\n` +
        `*Payment Status*: Paid (${paymentAmount})\n` +
        `*Payment Method*: ${paymentMethod}\n` +
        `*Time*: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`.trim();

      // Save to firebase
      saveSampleQuoteToFirebase({
        type: "sample_courier",
        name: contactInfo.name,
        company: contactInfo.company,
        email: contactInfo.email,
        phone: fullPhone,
        address: addressStr,
        country: countryCodeRules[contactInfo.countryCode]?.name || "India",
        items: selectedItems,
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

      // Reset form
      resetForm();

      return true;
    },
    [contactInfo, address, selectedItems, shippingMethod, calculateShippingCharges, saveSampleQuoteToFirebase, resetForm]
  );

  // Razorpay payment
  const startRazorpayPayment = useCallback(async () => {
    setSubmitted(true);
    if (!allFieldsValid) {
      alert("Please fill all required fields correctly before making payment.");
      return;
    }

    setPaymentLoading(true);
    setApiLoading(true);

    try {
      const sdkLoaded = await loadRazorpay();
      if (!sdkLoaded) {
        alert("Payment SDK failed to load");
        return;
      }

      const riceTotal = selectedItems.reduce((s, it) => s + Number(it.price || 0), 0);
      const shipping = calculateShippingCharges;
      const totalAmountINR = riceTotal + shipping;

      // Always use INR for Razorpay
      const amount = Math.round(totalAmountINR * 100);

      const orderRes = await fetch(`${API_BASE_URL}/create-razorpay-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          amount: amount,
          currency: "INR",
          countryCode: contactInfo.countryCode,
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
          name: contactInfo.name,
          email: contactInfo.email,
          contact: contactInfo.countryCode + contactInfo.phone,
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
  }, [API_BASE_URL, allFieldsValid, contactInfo, selectedItems, sendToWhatsApp, calculateShippingCharges, convertToLocalCurrency]);

  const startPayment = useCallback(() => {
    startRazorpayPayment();
  }, [startRazorpayPayment]);

  // Shipping options
  const shippingOptionsToShow = useMemo(() => {
    const localCurrency = convertToLocalCurrency(1);

    if (contactInfo.countryCode === "+91") {
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
  }, [contactInfo.countryCode, convertToLocalCurrency]);

  // Current phone length
  const currentLength = countryCodeRules[contactInfo.countryCode]?.length || 10;

  // Payment button text
  const getPaymentButtonText = useCallback(() => {
    const localCurrency = convertToLocalCurrency(totalAmountINR);

    if (contactInfo.countryCode === "+91") {
      return `Pay Now: ₹${totalAmountINR.toFixed(2)}`;
    } else {
      return `Pay Now: ${localCurrency.symbol}${localCurrency.amount.toFixed(2)} ${localCurrency.code}`;
    }
  }, [contactInfo.countryCode, totalAmountINR, convertToLocalCurrency]);

  // Loading state
  if (isLoading) {
    return (
      <div className="service-section">
        <div className="container">
          <div className="tw-p-8 tw-text-center">
            <div className="tw-inline-block tw-w-12 tw-h-12 tw-border-4 tw-border-yellow-400 tw-border-t-transparent tw-rounded-full tw-animate-spin"></div>
            <p className="tw-mt-4 tw-text-yellow-300">Loading products...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <section className="service-section">
        <div className="container">
          <h1 className="tw-text-3xl tw-font-bold tw-text-yellow-400 tw-mb-8 tw-text-center service-heading">
            Rice Sample Courier Service
          </h1>

          <div className={`tw-mt-8 tw-max-w-6xl tw-mx-auto tw-p-4 md:tw-p-10 ${isMobile ? 'tw-bg-black/90' : 'tw-bg-black/40 tw-backdrop-blur-xl'} tw-rounded-3xl tw-shadow-lg tw-border-4 tw-border-yellow-400 tw-relative`}>
            <div className="tw-absolute tw-inset-0 tw-border-4 tw-border-yellow-500 tw-rounded-3xl tw-pointer-events-none tw-opacity-30"></div>

            <h4 className="tw-text-2xl md:tw-text-4xl tw-font-extrabold tw-text-yellow-400 tw-mb-6 md:tw-mb-10 tw-text-center">
              Request Multiple Rice Samples
            </h4>

            <div className="tw-space-y-6 md:tw-space-y-8">
              {/* Contact Inputs */}
              <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-4 md:tw-gap-8">
                <div>
                  <input
                    type="text"
                    name="name"
                    placeholder="Your Name *"
                    value={contactInfo.name}
                    onChange={handleContactChange}
                    className="tw-w-full tw-px-4 md:tw-px-6 tw-py-3 md:tw-py-5 tw-rounded-xl md:tw-rounded-2xl tw-bg-black/60 tw-text-yellow-100 placeholder:tw-text-yellow-500 tw-border-2 tw-border-yellow-600 focus:tw-outline-none focus:tw-ring-2 md:focus:tw-ring-4 focus:tw-ring-yellow-400 tw-shadow"
                  />
                  {!contactInfo.name && submitted && <p className="tw-text-red-400 tw-text-xs md:tw-text-sm tw-mt-1 md:tw-mt-2">Required</p>}
                </div>
                <div>
                  <input
                    type="text"
                    name="company"
                    placeholder="Company Name *"
                    value={contactInfo.company}
                    onChange={handleContactChange}
                    className="tw-w-full tw-px-4 md:tw-px-6 tw-py-3 md:tw-py-5 tw-rounded-xl md:tw-rounded-2xl tw-bg-black/60 tw-text-yellow-100 placeholder:tw-text-yellow-500 tw-border-2 tw-border-yellow-600 focus:tw-outline-none focus:tw-ring-2 md:focus:tw-ring-4 focus:tw-ring-yellow-400 tw-shadow"
                  />
                  {!contactInfo.company && submitted && <p className="tw-text-red-400 tw-text-xs md:tw-text-sm tw-mt-1 md:tw-mt-2">Required</p>}
                </div>
              </div>

              <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-4 md:tw-gap-8">
                <div>
                  <div className="tw-flex tw-rounded-xl md:tw-rounded-2xl tw-overflow-hidden tw-border-2 tw-border-yellow-600">
                    <select
                      name="countryCode"
                      value={contactInfo.countryCode}
                      onChange={handleContactChange}
                      className="tw-px-2 md:tw-px-3 tw-py-3 md:tw-py-5 tw-w-24 md:tw-w-32 tw-bg-black/70 tw-text-yellow-100 tw-border-r-2 tw-border-r-yellow-600 tw-outline-none tw-text-xs md:tw-text-sm"
                    >
                      {Object.keys(countryCodeRules).map(code => (
                        <option key={code} value={code} className="tw-bg-black">
                          {code} {countryCodeRules[code].name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      name="phone"
                      placeholder={`Enter ${currentLength} digits *`}
                      value={contactInfo.phone}
                      onChange={handleContactChange}
                      maxLength={currentLength}
                      className="tw-flex-1 tw-px-4 md:tw-px-5 tw-py-3 md:tw-py-5 tw-bg-black/60 tw-text-yellow-100 placeholder:tw-text-yellow-500 tw-outline-none"
                    />
                  </div>
                  {phoneError && <p className="tw-text-red-400 tw-text-xs md:tw-text-sm tw-mt-1 md:tw-mt-2">{phoneError}</p>}
                  {!contactInfo.phone && submitted && <p className="tw-text-red-400 tw-text-xs md:tw-text-sm tw-mt-1 md:tw-mt-2">Required</p>}
                </div>
                <div>
                  <input
                    type="email"
                    name="email"
                    placeholder="Email Address *"
                    value={contactInfo.email}
                    onChange={handleContactChange}
                    className="tw-w-full tw-px-4 md:tw-px-6 tw-py-3 md:tw-py-5 tw-rounded-xl md:tw-rounded-2xl tw-bg-black/60 tw-text-yellow-100 placeholder:tw-text-yellow-500 tw-border-2 tw-border-yellow-600 focus:tw-outline-none focus:tw-ring-2 md:focus:tw-ring-4 focus:tw-ring-yellow-400 tw-shadow"
                  />
                  {emailError && <p className="tw-text-red-400 tw-text-xs md:tw-text-sm tw-mt-1 md:tw-mt-2">{emailError}</p>}
                  {!contactInfo.email && submitted && <p className="tw-text-red-400 tw-text-xs md:tw-text-sm tw-mt-1 md:tw-mt-2">Required</p>}
                </div>
              </div>

              {/* Shipping Method */}
              <div className={`tw-p-4 md:tw-p-8 tw-rounded-xl md:tw-rounded-3xl tw-border-2 tw-border-yellow-600 ${isMobile ? 'tw-bg-black/80' : 'tw-bg-black/50 tw-backdrop-blur-lg'}`}>
                <h5 className="tw-text-lg md:tw-text-xl tw-font-bold tw-text-yellow-400 tw-mb-4 md:tw-mb-6 tw-text-center">Shipping Method</h5>
                <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-3 md:tw-gap-6">
                  {shippingOptionsToShow.map((opt) => (
                    <div key={opt.value}>
                      <label className="tw-flex tw-items-center tw-space-x-3 md:tw-space-x-4 tw-cursor-pointer">
                        <input
                          type="radio"
                          name="shippingMethod"
                          value={opt.value}
                          checked={shippingMethod === opt.value}
                          onChange={(e) => setShippingMethod(e.target.value)}
                          className="tw-w-4 md:tw-w-5 tw-h-4 md:tw-h-5 tw-text-yellow-400"
                        />
                        <div className="tw-flex-1">
                          <span className="tw-text-yellow-100 tw-font-semibold tw-text-base md:tw-text-lg">{opt.label}</span>
                          <p className="tw-text-gray-400 tw-text-xs md:tw-text-sm">
                            {opt.localInfo} - {opt.label === "Ship" ? "Economical (10-20 days)" : "Faster delivery (3-10 days)"}
                          </p>
                          {contactInfo.countryCode !== "+91" && (
                            <p className="tw-text-xs tw-text-blue-300 tw-mt-1">({opt.info} INR)</p>
                          )}
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery Address */}
              <div className={`tw-p-4 md:tw-p-8 tw-rounded-xl md:tw-rounded-3xl tw-border-2 tw-border-yellow-600 ${isMobile ? 'tw-bg-black/80' : 'tw-bg-black/50 tw-backdrop-blur-lg'}`}>
                <h5 className="tw-text-lg md:tw-text-xl tw-font-bold tw-text-yellow-400 tw-mb-4 md:tw-mb-6 tw-text-center">Delivery Address</h5>
                <div className="tw-grid tw-grid-cols-1 sm:tw-grid-cols-2 tw-gap-3 md:tw-gap-6">
                  <div>
                    <input
                      type="text"
                      name="doorNo"
                      placeholder="Door No / Apt / Plot *"
                      value={address.doorNo}
                      onChange={handleAddressChange}
                      className="tw-w-full tw-px-4 md:tw-px-5 tw-py-2 md:tw-py-4 tw-rounded-lg md:tw-rounded-xl tw-bg-black/60 tw-text-yellow-100 placeholder:tw-text-yellow-500 tw-border tw-border-yellow-700 focus:tw-outline-none focus:tw-ring-2 md:focus:tw-ring-4 focus:tw-ring-yellow-400"
                    />
                    {!address.doorNo && submitted && <p className="tw-text-red-400 tw-text-xs tw-mt-1">Required</p>}
                  </div>
                  <div>
                    <input
                      type="text"
                      name="area"
                      placeholder="Area / Street / Locality *"
                      value={address.area}
                      onChange={handleAddressChange}
                      className="tw-w-full tw-px-4 md:tw-px-5 tw-py-2 md:tw-py-4 tw-rounded-lg md:tw-rounded-xl tw-bg-black/60 tw-text-yellow-100 placeholder:tw-text-yellow-500 tw-border tw-border-yellow-700 focus:tw-outline-none focus:tw-ring-2 md:focus:tw-ring-4 focus:tw-ring-yellow-400"
                    />
                    {!address.area && submitted && <p className="tw-text-red-400 tw-text-xs tw-mt-1">Required</p>}
                  </div>
                  <div>
                    <input
                      type="text"
                      name="town"
                      placeholder="Town / Suburb / Mandal *"
                      value={address.town}
                      onChange={handleAddressChange}
                      className="tw-w-full tw-px-4 md:tw-px-5 tw-py-2 md:tw-py-4 tw-rounded-lg md:tw-rounded-xl tw-bg-black/60 tw-text-yellow-100 placeholder:tw-text-yellow-500 tw-border tw-border-yellow-700 focus:tw-outline-none focus:tw-ring-2 md:focus:tw-ring-4 focus:tw-ring-yellow-400"
                    />
                    {!address.town && submitted && <p className="tw-text-red-400 tw-text-xs tw-mt-1">Required</p>}
                  </div>
                  <div>
                    <input
                      type="text"
                      name="city"
                      placeholder="City *"
                      value={address.city}
                      onChange={handleAddressChange}
                      className="tw-w-full tw-px-4 md:tw-px-5 tw-py-2 md:tw-py-4 tw-rounded-lg md:tw-rounded-xl tw-bg-black/60 tw-text-yellow-100 placeholder:tw-text-yellow-500 tw-border tw-border-yellow-700 focus:tw-outline-none focus:tw-ring-2 md:focus:tw-ring-4 focus:tw-ring-yellow-400"
                    />
                    {!address.city && submitted && <p className="tw-text-red-400 tw-text-xs tw-mt-1">Required</p>}
                  </div>
                  <div>
                    <input
                      type="text"
                      name="district"
                      placeholder="District / County *"
                      value={address.district}
                      onChange={handleAddressChange}
                      className="tw-w-full tw-px-4 md:tw-px-5 tw-py-2 md:tw-py-4 tw-rounded-lg md:tw-rounded-xl tw-bg-black/60 tw-text-yellow-100 placeholder:tw-text-yellow-500 tw-border tw-border-yellow-700 focus:tw-outline-none focus:tw-ring-2 md:focus:tw-ring-4 focus:tw-ring-yellow-400"
                    />
                    {!address.district && submitted && <p className="tw-text-red-400 tw-text-xs tw-mt-1">Required</p>}
                  </div>
                  <div>
                    <input
                      type="text"
                      name="pincode"
                      placeholder={contactInfo.countryCode === "+44" ? "Postcode (e.g. SW1A 1AA) *" : "Zip / Postal Code *"}
                      value={address.pincode}
                      onChange={handleAddressChange}
                      maxLength="12"
                      className="tw-w-full tw-px-4 md:tw-px-5 tw-py-2 md:tw-py-4 tw-rounded-lg md:tw-rounded-xl tw-bg-black/60 tw-text-yellow-100 placeholder:tw-text-yellow-500 tw-border tw-border-yellow-700 focus:tw-outline-none focus:tw-ring-2 md:focus:tw-ring-4 focus:tw-ring-yellow-400"
                    />
                    {address.pincode && address.pincode.length < 4 && submitted && <p className="tw-text-red-400 tw-text-xs tw-mt-1">Too short</p>}
                    {!address.pincode && submitted && <p className="tw-text-red-400 tw-text-xs tw-mt-1">Required</p>}
                  </div>
                  <div className="sm:tw-col-span-2">
                    <input
                      type="text"
                      name="landmark"
                      placeholder="Landmark / Nearby Place (Optional)"
                      value={address.landmark}
                      onChange={handleAddressChange}
                      className="tw-w-full tw-px-4 md:tw-px-5 tw-py-2 md:tw-py-4 tw-rounded-lg md:tw-rounded-xl tw-bg-black/60 tw-text-yellow-100 placeholder:tw-text-yellow-500 tw-border tw-border-yellow-700 focus:tw-outline-none focus:tw-ring-2 md:focus:tw-ring-4 focus:tw-ring-yellow-400"
                    />
                    <p className="tw-text-gray-400 tw-text-xs tw-mt-1">Help delivery partners locate your address easily</p>
                  </div>
                </div>
              </div>

              {/* Sample Selection */}
              <div className={`tw-p-4 md:tw-p-8 tw-rounded-xl md:tw-rounded-3xl tw-border-2 tw-border-yellow-500 ${isMobile ? 'tw-bg-black/80' : 'tw-bg-black/50 tw-backdrop-blur-lg'}`}>
                <h5 className="tw-text-xl md:tw-text-2xl tw-font-bold tw-text-yellow-400 tw-mb-4 md:tw-mb-6 tw-text-center">Select Samples & Quantity</h5>

                {/* Category Tabs */}
                <div className="tw-mb-6 md:tw-mb-8">
                  <div className="tw-flex tw-flex-wrap tw-gap-2 md:tw-gap-3 tw-justify-center tw-overflow-x-auto tw-pb-2">
                    {varietyOptions.map((category) => (
                      <button
                        key={category}
                        onClick={() => {
                          setSelectedCategory(category);
                          if (isMobile) setVisibleProducts(4);
                        }}
                        className={`tw-px-3 md:tw-px-5 tw-py-2 md:tw-py-3 tw-rounded-lg md:tw-rounded-xl tw-font-semibold tw-whitespace-nowrap tw-transition-all ${selectedCategory === category
                          ? "tw-bg-yellow-500 tw-text-black"
                          : "tw-bg-black/60 tw-text-yellow-300 hover:tw-bg-yellow-600 hover:tw-text-black"
                          }`}
                      >
                        {category.length > 15 && isMobile ? `${category.slice(0, 25)}` : category}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Products Grid */}
                <div className="tw-space-y-4 md:tw-space-y-6">
                  {selectedCategory && gradeMap[selectedCategory] && gradeMap[selectedCategory].length > 0 ? (
                    <>
                      <div className="tw-grid tw-grid-cols-1 sm:tw-grid-cols-2 lg:tw-grid-cols-3 tw-gap-3 md:tw-gap-6">
                        {gradeMap[selectedCategory]
                          ?.slice(0, isMobile ? visibleProducts : gradeMap[selectedCategory].length)
                          .map((gradeObj, index) => {
                            const gradeName = safeString(gradeObj.name || "Unknown");
                            const key = `${selectedCategory}:::${gradeName}`;
                            const item = selectedItems.find((i) => i.key === key);
                            const isChecked = !!item;
                            const pricePerKg = Number(gradeObj.price || 0);
                            const localCurrency = convertToLocalCurrency(1);
                            const localPricePerKg = pricePerKg * localCurrency.rate;

                            return (
                              <div
                                key={`${selectedCategory}-${gradeName}-${index}`}
                                className={`tw-rounded-lg md:tw-rounded-2xl tw-p-3 md:tw-p-5 tw-border-2 tw-transition-all tw-cursor-pointer ${isChecked
                                  ? "tw-border-yellow-400 tw-bg-yellow-900/30"
                                  : "tw-border-yellow-700 tw-bg-black/40 hover:tw-border-yellow-500"
                                  }`}
                                onClick={() => toggleItem(selectedCategory, gradeName)}
                              >
                                <div className="tw-flex tw-items-start tw-justify-between tw-mb-2 md:tw-mb-3">
                                  <div className="tw-flex-1">
                                    <h6 className="tw-text-base md:tw-text-lg tw-font-bold tw-text-yellow-200 tw-truncate">
                                      {gradeName}
                                    </h6>
                                    <p className="tw-text-yellow-400 tw-text-sm">
                                      ₹{pricePerKg}/kg
                                      {contactInfo.countryCode !== "+91" && (
                                        <span className="tw-text-blue-300 tw-text-xs tw-block">
                                          ≈ {localCurrency.symbol}{localPricePerKg.toFixed(2)}/kg
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                  <div className={`tw-w-5 md:tw-w-6 tw-h-5 md:tw-h-6 tw-rounded tw-flex tw-items-center tw-justify-center tw-flex-shrink-0 ${isChecked ? "tw-bg-yellow-400" : "tw-bg-gray-700"}`}>
                                    {isChecked && (
                                      <svg className="tw-w-3 md:tw-w-4 tw-h-3 md:tw-h-4 tw-text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </div>
                                </div>

                                {isChecked && (
                                  <div className="tw-mt-3 md:tw-mt-4">
                                    <label className="tw-block tw-text-yellow-300 tw-text-xs md:tw-text-sm tw-mb-1 md:tw-mb-2">Select Quantity:</label>
                                    <select
                                      value={item?.quantity}
                                      onChange={(e) => updateQuantity(key, e.target.value)}
                                      onClick={(e) => e.stopPropagation()}
                                      className="tw-w-full tw-px-2 md:tw-px-3 tw-py-1 md:tw-py-2 tw-bg-black/70 tw-text-yellow-100 tw-border tw-border-yellow-600 tw-rounded md:tw-rounded-lg tw-text-xs md:tw-text-sm focus:tw-outline-none focus:tw-ring-1 md:focus:tw-ring-2 focus:tw-ring-yellow-400"
                                    >
                                      {quantityOptions.slice(0, isMobile ? 5 : quantityOptions.length).map((q) => {
                                        const itemPriceINR = pricePerKg * q.kg;
                                        const localItemPrice = itemPriceINR * localCurrency.rate;
                                        return (
                                          <option key={q.value} value={q.value} className="tw-bg-black">
                                            {q.label}
                                            {contactInfo.countryCode === "+91"
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

                      {isMobile && gradeMap[selectedCategory]?.length > visibleProducts && (
                        <button
                          onClick={() => setVisibleProducts(prev => prev + 4)}
                          className="tw-w-full tw-py-2 tw-bg-yellow-600 tw-text-black tw-font-semibold tw-rounded-lg"
                        >
                          Load More
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="tw-text-center tw-py-6 md:tw-py-10">
                      <p className="tw-text-gray-400">No products available in this category.</p>
                    </div>
                  )}
                </div>

                {/* Selected Items */}
                {selectedItems.length > 0 && (
                  <div className="tw-mt-6 md:tw-mt-10 tw-p-4 md:tw-p-6 tw-rounded-xl md:tw-rounded-2xl tw-border-2 tw-border-yellow-500 tw-bg-gradient-to-br tw-from-yellow-900/50 tw-to-black/70">
                    <div className="tw-flex tw-items-center tw-justify-between tw-mb-4 md:tw-mb-6">
                      <h6 className="tw-text-lg md:tw-text-2xl tw-font-bold tw-text-yellow-300">
                        Selected Items ({selectedItems.length})
                      </h6>
                      <button
                        onClick={() => {
                          if (window.confirm("Remove all selected items?")) {
                            setSelectedItems([]);
                          }
                        }}
                        className="tw-px-3 md:tw-px-4 tw-py-1 md:tw-py-2 tw-bg-red-600/30 tw-text-red-300 hover:tw-bg-red-600/50 tw-rounded-lg tw-transition-colors tw-text-sm md:tw-text-base"
                      >
                        Clear All
                      </button>
                    </div>

                    <div className="tw-space-y-3 md:tw-space-y-4">
                      {selectedItems.map((item) => {
                        const localCurrency = convertToLocalCurrency(item.price);
                        return (
                          <div key={item.key} className="tw-flex tw-items-center tw-justify-between tw-p-3 md:tw-p-4 tw-bg-black/40 tw-rounded-lg md:tw-rounded-xl tw-border tw-border-yellow-600">
                            <div className="tw-flex-1 tw-min-w-0">
                              <p className="tw-text-yellow-200 tw-font-semibold tw-truncate">
                                {item.variety} - {item.grade}
                              </p>
                              <p className="tw-text-yellow-300 tw-text-xs md:tw-text-sm">
                                Quantity: {item.quantity}
                              </p>
                            </div>
                            <div className="tw-flex tw-items-center tw-gap-2 md:tw-gap-4">
                              <div className="tw-text-right">
                                <p className="tw-text-green-400 tw-font-bold tw-text-sm md:tw-text-base">₹{Number(item.price).toFixed(2)}</p>
                                {contactInfo.countryCode !== "+91" && (
                                  <p className="tw-text-blue-300 tw-text-xs">
                                    ≈ {localCurrency.symbol}{localCurrency.amount.toFixed(2)} {localCurrency.code}
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={() => removeItem(item.key)}
                                className="tw-p-1 md:tw-p-2 tw-text-red-400 hover:tw-bg-red-900/30 tw-rounded md:tw-rounded-lg tw-transition-colors"
                              >
                                <svg className="tw-w-4 md:tw-w-5 tw-h-4 md:tw-h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Price Summary */}
                    <div className="tw-mt-4 md:tw-mt-8 tw-p-4 md:tw-p-6 tw-bg-black/50 tw-rounded-lg md:tw-rounded-xl tw-border tw-border-yellow-600">
                      <h6 className="tw-text-lg md:tw-text-xl tw-font-bold tw-text-yellow-300 tw-mb-3 md:tw-mb-4">Price Summary</h6>
                      <div className="tw-space-y-2 md:tw-space-y-3">
                        <div className="tw-flex tw-justify-between">
                          <span className="tw-text-yellow-100 tw-text-sm md:tw-text-base">Rice Total:</span>
                          <span className="tw-text-yellow-300 tw-font-semibold tw-text-sm md:tw-text-base">
                            ₹{selectedItems.reduce((s, it) => s + Number(it.price || 0), 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="tw-flex tw-justify-between">
                          <span className="tw-text-yellow-100 tw-text-sm md:tw-text-base">Shipping ({shippingMethod}):</span>
                          <span className="tw-text-yellow-300 tw-font-semibold tw-text-sm md:tw-text-base">
                            ₹{calculateShippingCharges.toFixed(2)}
                          </span>
                        </div>
                        <div className="tw-border-t tw-border-yellow-600 tw-pt-2 md:tw-pt-3 tw-mt-2 md:tw-mt-3">
                          <div className="tw-flex tw-justify-between tw-items-center">
                            <span className="tw-text-base md:tw-text-lg tw-font-bold tw-text-yellow-300">Total Amount:</span>
                            <div className="tw-text-right">
                              <p className="tw-text-xl md:tw-text-2xl tw-font-bold tw-text-yellow-400">
                                ₹{totalAmountINR.toFixed(2)}
                              </p>
                              {contactInfo.countryCode !== "+91" && (
                                <p className="tw-text-blue-300 tw-text-xs md:tw-text-sm">
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

              {/* Payment Section */}
              <div className={`tw-p-4 md:tw-p-8 tw-rounded-xl md:tw-rounded-3xl tw-border-2 tw-border-yellow-500 ${isMobile ? 'tw-bg-black/80' : 'tw-bg-black/50 tw-backdrop-blur-lg'}`}>
                <h5 className="tw-text-lg md:tw-text-2xl tw-font-bold tw-text-yellow-400 tw-mb-4 md:tw-mb-6 tw-text-center">
                  {contactInfo.countryCode === "+91"
                    ? "Secure Payment (Razorpay)"
                    : `International Payment (${convertToLocalCurrency(1).name} → INR)`
                  }
                </h5>

                {apiLoading && (
                  <div className="tw-flex tw-items-center tw-justify-center tw-mb-3 md:tw-mb-4">
                    <div className="tw-w-5 md:tw-w-6 tw-h-5 md:tw-h-6 tw-border-2 tw-border-yellow-400 tw-border-t-transparent tw-rounded-full tw-animate-spin"></div>
                    <span className="tw-ml-2 tw-text-yellow-400 tw-text-sm md:tw-text-base">Creating order...</span>
                  </div>
                )}

                <button
                  onClick={startPayment}
                  disabled={!allFieldsValid || paymentLoading || apiLoading}
                  className="tw-w-full tw-py-3 md:tw-py-6 tw-bg-green-500 hover:tw-bg-green-600 tw-text-white tw-font-extrabold tw-text-lg md:tw-text-2xl tw-rounded-xl md:tw-rounded-2xl tw-flex tw-items-center tw-justify-center tw-gap-2 md:tw-gap-4 tw-shadow-lg tw-transition-all disabled:tw-opacity-50 disabled:tw-cursor-not-allowed active:tw-scale-95"
                >
                  {paymentLoading ? (
                    <>
                      <div className="tw-w-5 md:tw-w-6 tw-h-5 md:tw-h-6 tw-border-2 tw-border-white tw-border-t-transparent tw-rounded-full tw-animate-spin"></div>
                      Processing Payment...
                    </>
                  ) : (
                    <>
                      <svg className="tw-w-6 md:tw-w-8 tw-h-6 md:tw-h-8" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 5.5V7H9V5.5L3 7V9L5 9.5V15.5L3 16V18L9 16.5V18H15V16.5L21 18V16L19 15.5V9.5L21 9ZM15 16H9V14H15V16ZM15 12H9V10H15V12Z" />
                      </svg>
                      {getPaymentButtonText()}
                    </>
                  )}
                </button>

                {contactInfo.countryCode !== "+91" && (
                  <div className="tw-mt-4 md:tw-mt-6 tw-p-4 md:tw-p-6 tw-bg-black/40 tw-rounded-lg md:tw-rounded-xl tw-border tw-border-blue-500">
                    <p className="tw-text-yellow-300 tw-text-center tw-font-semibold tw-mb-2 md:tw-mb-3 tw-text-sm md:tw-text-base">
                      How International Payments Work:
                    </p>
                    <ul className="tw-text-blue-300 tw-text-xs md:tw-text-sm tw-space-y-1 md:tw-space-y-2">
                      <li className="tw-flex tw-items-start">
                        <span className="tw-text-green-400 tw-mr-1 md:tw-mr-2">✓</span>
                        <span>You see prices in <strong>{convertToLocalCurrency(1).name} ({convertToLocalCurrency(1).symbol})</strong></span>
                      </li>
                      <li className="tw-flex tw-items-start">
                        <span className="tw-text-green-400 tw-mr-1 md:tw-mr-2">✓</span>
                        <span>Payment is processed in <strong>Indian Rupees (₹)</strong> via Razorpay</span>
                      </li>
                      <li className="tw-flex tw-items-start">
                        <span className="tw-text-green-400 tw-mr-1 md:tw-mr-2">✓</span>
                        <span>Your bank automatically converts to your local currency</span>
                      </li>
                      <li className="tw-flex tw-items-start">
                        <span className="tw-text-green-400 tw-mr-1 md:tw-mr-2">✓</span>
                        <span>You pay in {convertToLocalCurrency(1).code} - conversion handled by your bank</span>
                      </li>
                    </ul>
                    <p className="tw-text-gray-400 tw-text-xs tw-mt-2 md:tw-mt-3 tw-text-center">
                      Exchange rates are approximate. Final amount may vary slightly based on your bank's rates.
                    </p>
                  </div>
                )}
              </div>

              {!allFieldsValid && submitted && (
                <p className="tw-text-red-500 tw-text-center tw-font-bold tw-text-base md:tw-text-xl tw-mt-4 md:tw-mt-6 tw-animate-pulse">
                  Please fill ALL fields correctly to proceed with payment
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Mobile-specific styles */}
      <style>{`
        @media (max-width: 768px) {
          .service-section .service-card {
            transform: translateZ(0);
            backface-visibility: hidden;
          }
          
          .service-section .tw-backdrop-blur-xl,
          .service-section .tw-backdrop-blur-lg,
          .service-section .tw-backdrop-blur-md {
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            background: rgba(0, 0, 0, 0.85) !important;
          }
          
          .service-section .tw-shadow-2xl,
          .service-section .tw-shadow-xl {
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3) !important;
          }
          
          /* Improve scrolling performance */
          .service-section * {
            -webkit-tap-highlight-color: transparent;
          }
          
          /* Optimize animations */
          .service-section {
            will-change: transform;
          }
        }
        
        /* Prevent layout shifts during loading */
        .service-image-wrapper {
          min-height: 200px;
        }
        
        @media (max-width: 480px) {
          .service-image-wrapper {
            min-height: 150px;
          }
        }
      `}</style>
    </>
  );
});

export default SampleCourierService;