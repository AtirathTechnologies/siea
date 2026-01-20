// BuyModal.jsx - UPDATED to support both single product AND cart orders
import React, { useState, useEffect, useRef } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import ThankYouPopup from "../components/ThankYouPopup";
import { submitQuote } from "../firebase";
import { transportPricing, getTransportPrice, getAvailablePortsForState } from "../components/Transport";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";

const portDisplayMap = {
  Mundra: "Mundra Port",
  Kandla: "Kandla Port",
  "Nhava Sheva": "Nhava Sheva",
  Chennai: "Chennai",
  Vizag: "Vizag",
  Kolkata: "Kolkata",
};

// ADD NEW PROPS FOR CART SUPPORT
const BuyModal = ({
  isOpen,
  onClose,
  product,
  profile,
  isCartOrder = false,          // NEW: Flag to indicate this is a cart order
  cartItems = [],               // NEW: Cart items data
  cartTotal = 0,                // NEW: Cart total amount
  onSubmitCartOrder = null      // NEW: Custom submit function for cart orders
}) => {
  const { t } = useLanguage();

  const [grade, setGrade] = useState("");
  const [packing, setPacking] = useState("");
  const [quantity, setQuantity] = useState("");
  const [port, setPort] = useState("");
  const [state, setState] = useState("");
  const [cif, setCif] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [customLogo, setCustomLogo] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [addressCountry, setAddressCountry] = useState("");
  const [pincode, setPincode] = useState("");

  const [grades, setGrades] = useState([]);
  const [liveGradePricePerKg, setLiveGradePricePerKg] = useState(0);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [showThankYou, setShowThankYou] = useState(false);

  const [gradePrice, setGradePrice] = useState(0);
  const [packingPrice, setPackingPrice] = useState(0);
  const [quantityPrice, setQuantityPrice] = useState(0);
  const [logoPrice, setLogoPrice] = useState(0);
  const [insurancePrice, setInsurancePrice] = useState(0);
  const [freightPrice, setFreightPrice] = useState(0);
  const [transportPrice, setTransportPrice] = useState(0);
  const [transportTotal, setTransportTotal] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);

  const [exchangeRates] = useState({
    INR: 1,
    USD: 1 / 87.98,
    EUR: 1 / 102.33,
    GBP: 1 / 117.64,
  });

  const canvasRef = useRef(null);

  const countryOptions = [
    { value: "+91", flag: "India", name: "India", length: 10 },
    { value: "+1", flag: "USA", name: "USA", length: 10 },
    { value: "+44", flag: "UK", name: "UK", length: 10 },
    { value: "+971", flag: "UAE", name: "UAE", length: 9 },
    { value: "+61", flag: "Australia", name: "Australia", length: 9 },
    { value: "+98", flag: "Iran", name: "Iran", length: 10 },
  ];

  const quantityOptions = ["5kg", "10kg", "25kg", "50kg", "100kg", "1ton"];

  const stateOptions = transportPricing.map(s => ({
    value: s.state,
    label: t(s.state.toLowerCase().replace(/\s/g, "_"))
  }));

  const availablePorts = state ? getAvailablePortsForState(state) : [];
  const portOptions = availablePorts.map(p => ({
    value: p,
    label: t(p.toLowerCase().replace(/\s/g, "_"))
  }));

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

  const freightPriceMap = {
    Mundra: 4399,
    Kandla: 4839,
    "Nhava Sheva": 5279,
    Chennai: 5719,
    Vizag: 6159,
    Kolkata: 6599,
  };

  // MODIFIED: Only fetch grades if it's NOT a cart order AND product has firebaseId
  useEffect(() => {
    if (isCartOrder || !product?.firebaseId) return;

    const productRef = ref(db, `products/${product.firebaseId}/grades`);

    const unsubscribe = onValue(productRef, (snap) => {
      if (snap.exists()) {
        const gradesData = snap.val();
        const gradesArray = Object.keys(gradesData).map(key => ({
          id: key,
          ...gradesData[key]
        }));

        const gradeNames = gradesArray.map(g => g.grade).filter(Boolean);
        const selectedGradeObj = gradesArray.find(g => g.grade === grade);

        setGrades(gradeNames);
        setLiveGradePricePerKg(selectedGradeObj?.price_inr_per_kg || selectedGradeObj?.price_inr || 0);
      } else {
        setGrades([]);
        setLiveGradePricePerKg(0);
      }
    });

    return () => unsubscribe();
  }, [product?.firebaseId, grade, isCartOrder]);

  // Profile pre-fill
  useEffect(() => {
    if (!isOpen || !profile?.uid) return;

    const usersRef = ref(db, "users");

    const unsubscribe = onValue(usersRef, (snap) => {
      const data = snap.val() || {};

      let matched = null;
      Object.keys(data).forEach((key) => {
        if (data[key].uid === profile.uid) {
          matched = data[key];
        }
      });

      if (matched) {
        setFullName(prev => prev || matched.fullName || "");
        setEmail(prev => prev || matched.email || profile.email || "");

        if (matched.phone) {
          const cleaned = matched.phone.replace(/\s+/g, "").replace(/[^+\d]/g, "");
          const matchedCountry = countryOptions.find(c => cleaned.startsWith(c.value));
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

  useEffect(() => {
    setPort("");
  }, [state]);

  // MODIFIED PRICE CALCULATION: Handle cart orders differently
  useEffect(() => {
    const exchangeRate = exchangeRates[currency] || 1;

    if (isCartOrder) {
      // For cart orders, use cart total as base
      const cartTotalINR = cartTotal;

      // Calculate other prices based on cart total
      const pPriceINR = packing ? packingPriceMap[packing] || 0 : 0;
      const lPriceINR = customLogo === "Yes" ? 879.80 : 0;
      const iPriceINR = cif === "Yes" ? cartTotalINR * 0.01 : 0;

      let fPriceINR = 0;
      let transportPerQtlINR = 0;
      let transportTotalINR = 0;

      // For cart, estimate quantities based on total
      const estimatedQtyInQuintals = cartTotalINR > 0 ? Math.ceil(cartTotalINR / 10000) : 1;

      if (cif === "Yes" && port) {
        fPriceINR = (freightPriceMap[port] || 0) * estimatedQtyInQuintals;

        if (state && port) {
          const displayPort = portDisplayMap[port];
          transportPerQtlINR = getTransportPrice(state, displayPort) || 0;
          transportTotalINR = transportPerQtlINR * estimatedQtyInQuintals;
        }
      }

      const totalINR = cartTotalINR + pPriceINR + lPriceINR + iPriceINR + fPriceINR + transportTotalINR;

      setGradePrice(0); // No grade price for cart
      setPackingPrice(pPriceINR * exchangeRate);
      setQuantityPrice(cartTotalINR * exchangeRate);
      setLogoPrice(lPriceINR * exchangeRate);
      setInsurancePrice(iPriceINR * exchangeRate);
      setFreightPrice(fPriceINR * exchangeRate);
      setTransportPrice(transportPerQtlINR * exchangeRate);
      setTransportTotal(transportTotalINR * exchangeRate);
      setTotalPrice(totalINR * exchangeRate);
    } else {
      // Original logic for single products
      const basePricePerQtlINR = liveGradePricePerKg * 100;

      let qtyInKg = quantity === "1ton" ? 1000 : parseFloat(quantity.replace("kg", "")) || 0;
      const qtyInQuintals = qtyInKg / 100;
      const qPriceINR = basePricePerQtlINR * qtyInQuintals;

      const pPriceINR = packing ? packingPriceMap[packing] || 0 : 0;
      const lPriceINR = customLogo === "Yes" ? 879.80 : 0;
      const iPriceINR = cif === "Yes" ? qPriceINR * 0.01 : 0;
      const fPriceINR = cif === "Yes" && port ? (freightPriceMap[port] || 0) * (qtyInKg / 1000) : 0;

      let transportPerQtlINR = 0;
      if (state && port && cif === "Yes") {
        const displayPort = portDisplayMap[port];
        transportPerQtlINR = getTransportPrice(state, displayPort) || 0;
      }
      const transportTotalINR = transportPerQtlINR * qtyInQuintals;

      const totalINR = qPriceINR + pPriceINR + lPriceINR + iPriceINR + fPriceINR + transportTotalINR;

      setGradePrice(basePricePerQtlINR * exchangeRate);
      setPackingPrice(pPriceINR * exchangeRate);
      setQuantityPrice(qPriceINR * exchangeRate);
      setLogoPrice(lPriceINR * exchangeRate);
      setInsurancePrice(iPriceINR * exchangeRate);
      setFreightPrice(fPriceINR * exchangeRate);
      setTransportPrice(transportPerQtlINR * exchangeRate);
      setTransportTotal(transportTotalINR * exchangeRate);
      setTotalPrice(totalINR * exchangeRate);
    }
  }, [
    liveGradePricePerKg, cif, grade, packing, quantity, port, state, currency, customLogo, product, t, isCartOrder, cartTotal
  ]);

  const validatePhoneNumber = (num, code) => {
    const country = countryOptions.find(o => o.value === code);
    const len = country?.length || 10;
    if (!num) { setPhoneError(t("phone_required")); return false; }
    if (num.length !== len) { setPhoneError(t("phone_length_error").replace("{length}", len)); return false; }
    if (!/^\d+$/.test(num)) { setPhoneError(t("phone_digits_error")); return false; }
    setPhoneError(""); return true;
  };

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) { setEmailError(t("email_required")); return false; }
    if (!re.test(email)) { setEmailError(t("email_invalid")); return false; }
    setEmailError(""); return true;
  };

  const handleCountryChange = e => { if (!profile) { setCountryCode(e.target.value); validatePhoneNumber(phoneNumber, e.target.value); } };
  const handlePhoneChange = e => { if (!profile) { const v = e.target.value.replace(/\D/g, ""); setPhoneNumber(v); validatePhoneNumber(v, countryCode); } };
  const handleEmailChange = e => { if (!profile) { setEmail(e.target.value); validateEmail(e.target.value); } };
  const handleFullNameChange = e => { if (!profile) setFullName(e.target.value); };

  // MODIFIED SUBMIT HANDLER: Handle both cart and single product orders
  const handleSubmit = async () => {
    // Common validation
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

    // Cart order validation (different from single product)
    if (isCartOrder) {
      if (!packing || !currency || !customLogo) {
        alert(t("fill_required_fields"));
        return;
      }

      // If this is a cart order and we have a custom submit function, use it
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
          port,
          state,
          cif,
          currency,
          customLogo,
          additionalInfo,
          gradePrice,
          packingPrice,
          quantityPrice,
          logoPrice,
          insurancePrice,
          freightPrice,
          transportPrice,
          transportTotal,
          totalPrice
        };

        await onSubmitCartOrder(formData);
        return;
      }
    }
    // Single product validation
    else {
      if (!quantity || !packing || !port || !state || !grade || !cif || !currency || !customLogo) {
        alert(t("fill_required_fields"));
        return;
      }
    }

    const fullPhone = `${countryCode} ${phoneNumber}`;
    const sym = currencyOptions.find(o => o.value === currency)?.symbol || "$";

    // MODIFIED MESSAGE: Different format for cart vs single product
    let message = "";

    if (isCartOrder) {
      message = `**${t("cart_order_request")}**\n\n` +
        `1. **${t("customer_information")}**\n` +
        ` - ${t("full_name")}: ${fullName}\n` +
        ` - ${t("email_address")}: ${email}\n` +
        ` - ${t("phone_number")}: ${fullPhone}\n` +
        ` - ${t("address")}: ${street}, ${city}, ${addressState}, ${addressCountry} - ${pincode}\n\n` +
        `2. **${t("order_type")}**\n` +
        ` - ${t("type")}: Shopping Cart Order\n` +
        ` - ${t("packing")}: ${t(packing.toLowerCase().replace(/\s/g, "_"))}\n` +
        ` - ${t("state")}: ${state}\n` +
        ` - ${t("port")}: ${t(port.toLowerCase().replace(/\s/g, "_"))}\n` +
        ` - ${t("cif")}: ${cif === "Yes" ? t("yes") : t("no")}\n` +
        ` - ${t("currency")}: ${currency} (${sym})\n\n`;
    } else {
      message = `**${t("quotation_request")}**\n\n` +
        `1. **${t("customer_information")}**\n` +
        ` - ${t("full_name")}: ${fullName}\n` +
        ` - ${t("email_address")}: ${email}\n` +
        ` - ${t("phone_number")}: ${fullPhone}\n` +
        ` - ${t("address")}: ${street}, ${city}, ${addressState}, ${addressCountry} - ${pincode}\n\n` +
        `2. **${t("product_details")}**\n` +
        ` - ${t("variety")}: ${product?.name?.en || "N/A"}\n` +
        ` - ${t("grade")}: ${grade}\n` +
        ` - ${t("packing")}: ${t(packing.toLowerCase().replace(/\s/g, "_"))}\n` +
        ` - ${t("quantity")}: ${quantity}\n` +
        ` - ${t("state")}: ${state}\n` +
        ` - ${t("port")}: ${t(port.toLowerCase().replace(/\s/g, "_"))}\n` +
        ` - ${t("cif")}: ${cif === "Yes" ? t("yes") : t("no")}\n` +
        ` - ${t("currency")}: ${currency} (${sym})\n\n`;
    }

    message += `3. **${t("customization")}**\n` +
      ` - ${t("custom_logo")}: ${customLogo === "Yes" ? t("yes") : t("no")}\n\n` +
      `4. **${t("pricing_breakdown")}**\n`;

    if (!isCartOrder) {
      message += ` - ${t("grade_price")}: ${sym}${gradePrice.toFixed(2)} ${t("per")} ${t("quintal")}\n`;
    }

    message += ` - ${t("packing_price")}: ${sym}${packingPrice.toFixed(2)} ${t("per")} ${t("bag")}\n` +
      ` - ${t("quantity_price")}: ${sym}${quantityPrice.toFixed(2)}\n`;

    if (cif === "Yes") {
      message += ` - ${t("insurance_price")}: ${sym}${insurancePrice.toFixed(2)}\n` +
        ` - ${t("freight_price")}: ${sym}${freightPrice.toFixed(2)}\n`;

      if (transportPrice > 0) {
        message += ` - ${t("transport_price")}: ${sym}${transportPrice.toFixed(2)} ${t("per")} ${t("quintal")} (${sym}${transportTotal.toFixed(2)} ${t("total")})\n`;
      }
    }

    message += ` - ${t("total_price")}: ${sym}${totalPrice.toFixed(2)} (${cif === "Yes" ? t("cif_term") : t("fob_term")})\n\n` +
      `5. **${t("additional_information")}**\n` +
      ` ${additionalInfo || t("none")}\n\n${t("thank_you")}\n\n${t("best_regards")},\n${fullName}`;

    const quoteData = {
      name: fullName,
      email,
      phone: fullPhone,
      product: isCartOrder ? 'Shopping Cart' : (product?.name?.en || ""),
      grade: isCartOrder ? 'Multiple Grades' : grade,
      packing,
      quantity: isCartOrder ? `${cartItems.length} items` : quantity,
      state,
      port,
      cif,
      currency,
      exchangeRate: exchangeRates[currency],
      customLogo,
      street,
      city,
      addressState,
      addressCountry,
      pincode,
      gradePrice: isCartOrder ? 0 : gradePrice,
      packingPrice,
      quantityPrice,
      insurancePrice: cif === "Yes" ? insurancePrice : null,
      freightPrice: cif === "Yes" ? freightPrice : null,
      transportPrice: cif === "Yes" ? transportPrice : null,
      transportTotal: cif === "Yes" ? transportTotal : null,
      totalPrice,
      additionalInfo: additionalInfo || "",
      timestamp: Date.now(),
      type: isCartOrder ? "cart_order" : "bulk"
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

  const handleClose = () => {
    setGrade(""); setPacking(""); setQuantity(""); setPort(""); setState(""); setCif(""); setCurrency("USD");
    setCustomLogo(""); setAdditionalInfo(""); setFullName(""); setEmail(""); setPhoneNumber("");
    setCountryCode("+91");
    setEmailError(""); setShowThankYou(false);
    setGradePrice(0); setPackingPrice(0); setQuantityPrice(0); setLogoPrice(0);
    setInsurancePrice(0); setFreightPrice(0); setTransportPrice(0); setTransportTotal(0); setTotalPrice(0);
    onClose();
    setStreet("");
    setCity("");
    setAddressState("");
    setAddressCountry("");
    setPincode("");
  };

  const getCurrentCountry = () => countryOptions.find(o => o.value === countryCode);

  if (!isOpen) return null;

  return (
    <div className="buy-modal-overlay">
      <div className="buy-modal-container">
        <canvas ref={canvasRef} className="buy-modal-canvas" />
        <button className="buy-modal-close-btn" onClick={handleClose} aria-label={t("close_modal")}>×</button>
        <div className="buy-modal-header">
          <h2 className="buy-modal-title">
            {isCartOrder ? t("checkout_cart") : t("get_quote")}
          </h2>
        </div>
        <div className="buy-modal-body">
          <div className="buy-modal-content">
            <div className="form-container">
              <form onSubmit={e => { e.preventDefault(); handleSubmit(); }}>
                {/* Contact */}
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

                <section className="form-section">
                  <h3>{t("address_information")}</h3>
                  <label>{t("street")} * <input type="text" className="input-field" value={street} onChange={e => setStreet(e.target.value)} required /></label>
                  <label>{t("city")} * <input type="text" className="input-field" value={city} onChange={e => setCity(e.target.value)} required /></label>
                  <label>{t("state")} * <input type="text" className="input-field" value={addressState} onChange={e => setAddressState(e.target.value)} required /></label>
                  <label>{t("country")} * <input type="text" className="input-field" value={addressCountry} onChange={e => setAddressCountry(e.target.value)} required /></label>
                  <label>{t("pincode")} * <input type="text" className="input-field" value={pincode} onChange={e => setPincode(e.target.value)} required /></label>
                </section>

                {/* Product Information - Modified for cart orders */}
                <section className="form-section">
                  <h3>{t("product_information")}</h3>

                  {/* ================= CART ORDER ================= */}
                  {isCartOrder ? (
                    <>
                      <label>
                        {t("order_type")}
                        <input
                          type="text"
                          value={t("shopping_cart")}
                          disabled
                          className="input-field"
                        />
                      </label>

                      <label>
                        {t("total_items")}
                        <input
                          type="text"
                          value={`${cartItems.length} ${t("items")}`}
                          disabled
                          className="input-field"
                        />
                      </label>

                      {/* ===== CART PRODUCTS WITH IMAGES ===== */}
                      <div className="tw-mt-4 tw-space-y-3">
                        <h4 className="tw-text-yellow-400 tw-font-semibold">
                          {t("selected_products")}
                        </h4>

                        {cartItems.map((item, index) => (
                          <div
                            key={`${item.id}-${index}`}
                            className="tw-flex tw-gap-3 tw-bg-black/40 tw-border tw-border-yellow-400/20 tw-rounded-lg tw-p-3"
                          >
                            <img
                              src={item.image}
                              alt={item.name}
                              className="tw-w-16 tw-h-16 tw-object-cover tw-rounded-md tw-border tw-border-yellow-400/30"
                              onError={(e) => {
                                e.target.src = "/img/placeholder-rice.jpg";
                              }}
                            />

                            <div className="tw-flex-1 tw-flex tw-justify-between tw-gap-4">
                              <div>
                                <p className="tw-text-yellow-300 tw-font-semibold">
                                  {index + 1}. {item.name}
                                </p>

                                {item.grade && (
                                  <p className="tw-text-xs tw-text-yellow-200/70">
                                    Grade: {item.grade}
                                  </p>
                                )}

                                <p className="tw-text-xs tw-text-yellow-200/70">
                                  Qty: {item.quantityUnit || `${item.quantity} unit`}
                                </p>
                              </div>

                              <div className="tw-text-right">
                                <p className="tw-text-yellow-400 tw-font-semibold">
                                  ₹{(item.totalPrice || item.subtotal || 0).toLocaleString("en-IN")}
                                </p>
                                <p className="tw-text-[10px] tw-text-yellow-200/50">
                                  {item.price || "Price on request"}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      {/* ================= SINGLE PRODUCT ================= */}
                      <div className="tw-flex tw-gap-4 tw-items-center tw-bg-black/40 tw-border tw-border-yellow-400/20 tw-rounded-lg tw-p-3 tw-mb-4">
                        <img
                          src={product?.image}
                          alt={product?.name?.en}
                          className="tw-w-20 tw-h-20 tw-object-cover tw-rounded-md tw-border tw-border-yellow-400/30"
                          onError={(e) => {
                            e.target.src = "/img/placeholder-rice.jpg";
                          }}
                        />

                        <div>
                          <p className="tw-text-yellow-300 tw-font-semibold">
                            {product?.name?.en}
                          </p>
                          <p className="tw-text-xs tw-text-yellow-200/70">
                            {product?.category}
                          </p>
                        </div>
                      </div>

                      <label>
                        {t("category")}
                        <select
                          disabled
                          value={product?.category}
                          className="select-field no-arrow"
                        >
                          <option>{product?.category}</option>
                        </select>
                      </label>

                      <label>
                        {t("grade")} *
                        <select
                          value={grade}
                          onChange={e => setGrade(e.target.value)}
                          required
                          className="select-field"
                        >
                          <option value="">{t("select_grade")}</option>
                          {grades.map((g, i) => (
                            <option key={i} value={g}>
                              {g}
                            </option>
                          ))}
                        </select>
                      </label>
                    </>
                  )}

                  {/* ================= COMMON FIELDS ================= */}
                  <label>
                    {t("packing")} *
                    <select
                      value={packing}
                      onChange={e => setPacking(e.target.value)}
                      required
                      className="select-field"
                    >
                      <option value="">{t("select_packing")}</option>
                      <option value="PP (Polypropylene Woven Bags)">{t("pp_bags")}</option>
                      <option value="Non-Woven Bags">{t("non_woven_bags")}</option>
                      <option value="Jute Bags">{t("jute_bags")}</option>
                      <option value="BOPP (Biaxially Oriented Polypropylene) Laminated Bags">
                        {t("bopp_bags")}
                      </option>
                      <option value="LDPE (Low Density Polyethylene) Pouches">
                        {t("ldpe_pouches")}
                      </option>
                    </select>
                  </label>

                  {!isCartOrder && (
                    <label>
                      {t("quantity")} *
                      <select
                        value={quantity}
                        onChange={e => setQuantity(e.target.value)}
                        required
                        className="select-field"
                      >
                        <option value="">{t("select_quantity")}</option>
                        {quantityOptions.map((q, i) => (
                          <option key={i} value={q}>
                            {q}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  <label>
                    {t("state")} *
                    <select
                      value={state}
                      onChange={e => setState(e.target.value)}
                      required
                      className="select-field"
                    >
                      <option value="">{t("select_state")}</option>
                      {stateOptions.map(s => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    {t("port")} *
                    <select
                      value={port}
                      onChange={e => setPort(e.target.value)}
                      required
                      className="select-field"
                      disabled={!state}
                    >
                      <option value="">
                        {state ? t("select_port") : t("select_state_first")}
                      </option>
                      {portOptions.map(p => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    {t("cif")} *
                    <select
                      value={cif}
                      onChange={e => setCif(e.target.value)}
                      required
                      className="select-field"
                    >
                      <option value="">{t("select_cif")}</option>
                      <option value="Yes">{t("yes")}</option>
                      <option value="No">{t("no")}</option>
                    </select>
                  </label>

                  <label>
                    {t("currency")} *
                    <select
                      value={currency}
                      onChange={e => setCurrency(e.target.value)}
                      required
                      className="select-field"
                    >
                      <option value="">{t("select_currency")}</option>
                      {currencyOptions.map((c, i) => (
                        <option key={i} value={c.value}>
                          {c.value} ({c.symbol})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    {t("custom_logo")} *
                    <select
                      value={customLogo}
                      onChange={e => setCustomLogo(e.target.value)}
                      required
                      className="select-field"
                    >
                      <option value="">{t("select_logo")}</option>
                      <option value="Yes">{t("yes")}</option>
                      <option value="No">{t("no")}</option>
                    </select>
                  </label>

                  <label>
                    {t("additional_info")}
                    <textarea
                      value={additionalInfo}
                      onChange={e => setAdditionalInfo(e.target.value)}
                      className="textarea-field"
                    />
                  </label>
                </section>
                <button type="submit" className="submit-btn">
                  {isCartOrder ? t("place_order") : t("get_quote")}
                </button>
              </form>
            </div>

            {/* BILL - Modified for cart orders */}
            <div className="bill-container">
              <h3>{t("estimated_bill")}</h3>
              <div className="bill-breakdown">
                {!isCartOrder && (
                  <div className="bill-item">
                    <span>{t("grade_price")}:</span>
                    <span>{currencyOptions.find(o => o.value === currency)?.symbol}{gradePrice.toFixed(2)} {t("per")} {t("quintal")}</span>
                  </div>
                )}

                {cif === "Yes" && (
                  <>
                    <div className={`bill-item ${transportPrice > 0 ? 'text-yellow-300' : 'text-gray-500'}`}>
                      <span>{t("transport_price")} ({state || '?'} to {port || '?'}) :</span>
                      <span>
                        {transportPrice > 0
                          ? `${currencyOptions.find(o => o.value === currency)?.symbol}${transportPrice.toFixed(2)} ${t("per")} ${t("quintal")}`
                          : t("transport_price_not_available")}
                      </span>
                    </div>
                    <div className="tw-border-t tw-border-yellow-400/50 tw-my-2"></div>
                  </>
                )}

                <div className="bill-item">
                  <span>{t("packing_price")}:</span>
                  <span>{currencyOptions.find(o => o.value === currency)?.symbol}{packingPrice.toFixed(2)} {t("per")} {t("bag")}</span>
                </div>

                <div className="bill-item">
                  <span>{isCartOrder ? t("cart_total") : t("quantity_price")}:</span>
                  <span>{currencyOptions.find(o => o.value === currency)?.symbol}{quantityPrice.toFixed(2)}</span>
                </div>

                {cif === "Yes" && (
                  <>
                    <div className="bill-item">
                      <span>{t("insurance_price")}:</span>
                      <span>{currencyOptions.find(o => o.value === currency)?.symbol}{insurancePrice.toFixed(2)}</span>
                    </div>
                    <div className="bill-item">
                      <span>{t("freight_price")}:</span>
                      <span>{currencyOptions.find(o => o.value === currency)?.symbol}{freightPrice.toFixed(2)}</span>
                    </div>
                  </>
                )}

                {cif === "Yes" && transportPrice > 0 && (
                  <div className="bill-item text-green-400 font-semibold">
                    <span>{t("total_transport_price")}:</span>
                    <span>{currencyOptions.find(o => o.value === currency)?.symbol}{transportTotal.toFixed(2)}</span>
                  </div>
                )}

                <div className="tw-border-t tw-border-yellow-400/50 tw-my-2"></div>

                <div className="bill-item total">
                  <span>{t("total_price")}:</span>
                  <span>{currencyOptions.find(o => o.value === currency)?.symbol}{totalPrice.toFixed(2)} ({cif === "Yes" ? t("cif_term") : t("fob_term")})</span>
                </div>
              </div>

              <div className="tw-mt-4 tw-text-xs tw-text-white-400 tw-leading-relaxed">
                <strong>
                  {t("NOTE")} : {" "}
                  {t("This is an estimated cost. Actual costs may vary based on additional requirements and market conditions.")}
                </strong>
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