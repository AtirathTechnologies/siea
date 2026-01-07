// BuyModal.jsx - FULL CODE with Firebase Live Grade Prices
import React, { useState, useEffect, useRef } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import ThankYouPopup from "../components/ThankYouPopup";
// import { submitQuote } from "../firebasequote";
import { submitQuote } from "../firebase";
import { transportPricing, getTransportPrice, getAvailablePortsForState } from "../components/Transport";
import { db } from "../firebase";                        // <-- ADD THIS
import { ref, onValue } from "firebase/database";        // <-- ADD THIS

const portDisplayMap = {
  Mundra: "Mundra Port",
  Kandla: "Kandla Port",
  "Nhava Sheva": "Nhava Sheva",
  Chennai: "Chennai",
  Vizag: "Vizag",
  Kolkata: "Kolkata",
};

const BuyModal = ({ isOpen, onClose, product, profile }) => {
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
  const [liveGradePricePerKg, setLiveGradePricePerKg] = useState(0); // live price per kg

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

  useEffect(() => {
    if (!product?.firebaseId) return;

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
  }, [product?.firebaseId, grade]); // Depend on firebaseId, not product.id


  // Profile pre-fill
  // AUTO-FILL PHONE FROM FIREBASE /users BASED ON UID
  useEffect(() => {
    if (!isOpen || !profile?.uid) return;

    const usersRef = ref(db, "users");

    const unsubscribe = onValue(usersRef, (snap) => {
      const data = snap.val() || {};

      // Find user by Firebase UID
      let matched = null;
      Object.keys(data).forEach((key) => {
        if (data[key].uid === profile.uid) {
          matched = data[key];
        }
      });

      if (matched) {
        setFullName(prev => prev || matched.fullName || "");
        setEmail(prev => prev || matched.email || profile.email || "");

        // PHONE (already correct)
        if (matched.phone) {
          const cleaned = matched.phone.replace(/\s+/g, "").replace(/[^+\d]/g, "");
          const matchedCountry = countryOptions.find(c => cleaned.startsWith(c.value));
          if (matchedCountry) {
            setCountryCode(matchedCountry.value);
            setPhoneNumber(cleaned.replace(matchedCountry.value, ""));
          }
        }

        // ⭐ ADDRESS AUTO-FILL
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

  // PRICE CALCULATION - NOW USING LIVE PRICE FROM FIREBASE
  useEffect(() => {
    const exchangeRate = exchangeRates[currency] || 1;

    // Use live price per kg → convert to per quintal
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
  }, [
    liveGradePricePerKg, cif, grade, packing, quantity, port, state, currency, customLogo, product, t
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

  const handleSubmit = async () => {
    if (!quantity || !packing || !port || !state || !grade || !fullName || !cif || !currency || !customLogo) {
      alert(t("fill_required_fields"));
      return;
    }
    const phoneOk = validatePhoneNumber(phoneNumber, countryCode);
    const emailOk = validateEmail(email);
    if (!phoneOk || !emailOk) { alert(t("phone_invalid") + " " + t("email_invalid")); return; }

    const fullPhone = `${countryCode} ${phoneNumber}`;
    const sym = currencyOptions.find(o => o.value === currency)?.symbol || "$";

    const message = `**${t("quotation_request")}**\n\n` +
      `1. **${t("customer_information")}**\n - ${t("full_name")}: ${fullName}\n - ${t("email_address")}: ${email}\n - ${t("phone_number")}: ${fullPhone}\n\n` +
      `2. **${t("product_details")}**\n - ${t("variety")}: ${product?.name?.en || "N/A"}\n - ${t("grade")}: ${grade}\n - ${t("packing")}: ${t(packing.toLowerCase().replace(/\s/g, "_"))}\n - ${t("quantity")}: ${quantity}\n - ${t("state")}: ${state}\n - ${t("port")}: ${t(port.toLowerCase().replace(/\s/g, "_"))}\n - ${t("cif")}: ${cif === "Yes" ? t("yes") : t("no")}\n - ${t("currency")}: ${currency} (${sym})\n\n` +
      `3. **${t("customization")}**\n - ${t("custom_logo")}: ${customLogo === "Yes" ? t("yes") : t("no")}\n\n` +
      `4. **${t("pricing_breakdown")}**\n - ${t("grade_price")}: ${sym}${gradePrice.toFixed(2)} ${t("per")} ${t("quintal")}\n - ${t("packing_price")}: ${sym}${packingPrice.toFixed(2)} ${t("per")} ${t("bag")}\n - ${t("quantity_price")}: ${sym}${quantityPrice.toFixed(2)}\n` +
      (cif === "Yes" ? ` - ${t("insurance_price")}: ${sym}${insurancePrice.toFixed(2)}\n - ${t("freight_price")}: ${sym}${freightPrice.toFixed(2)}\n - ${t("transport_price")}: ${transportPrice > 0 ? `${sym}${transportPrice.toFixed(2)} ${t("per")} ${t("quintal")} (${sym}${transportTotal.toFixed(2)} ${t("total")})` : t("transport_price_not_available")}\n` : "") +
      ` - ${t("total_price")}: ${sym}${totalPrice.toFixed(2)} (${cif === "Yes" ? t("cif_term") : t("fob_term")})\n\n` +
      `5. **${t("additional_information")}**\n ${additionalInfo || t("none")}\n\n${t("thank_you")}\n\n${t("best_regards")},\n${fullName}`;

    const quoteData = {
      name: fullName,
      email,
      phone: fullPhone,
      product: product?.name?.en || "",
      grade,
      packing,
      quantity,
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
      gradePrice,
      packingPrice,
      quantityPrice,
      insurancePrice: cif === "Yes" ? insurancePrice : null,
      freightPrice: cif === "Yes" ? freightPrice : null,
      transportPrice: cif === "Yes" ? transportPrice : null,
      transportTotal: cif === "Yes" ? transportTotal : null,
      totalPrice,
      additionalInfo: additionalInfo || "",
      timestamp: Date.now()
    };

    try {
      await submitQuote({
        type: "bulk",
        ...quoteData,
      });

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
    // setPhoneError(""); 
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
        <div className="buy-modal-header"><h2 className="buy-modal-title">{t("get_quote")}</h2></div>
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

                  <label>{t("street")} *
                    <input type="text" className="input-field"
                      value={street} onChange={e => setStreet(e.target.value)}
                      required />
                  </label>

                  <label>{t("city")} *
                    <input type="text" className="input-field"
                      value={city} onChange={e => setCity(e.target.value)}
                      required />
                  </label>

                  <label>{t("state")} *
                    <input type="text" className="input-field"
                      value={addressState} onChange={e => setAddressState(e.target.value)}
                      required />
                  </label>

                  <label>{t("country")} *
                    <input type="text" className="input-field"
                      value={addressCountry} onChange={e => setAddressCountry(e.target.value)}
                      required />
                  </label>

                  <label>{t("pincode")} *
                    <input type="text" className="input-field"
                      value={pincode} onChange={e => setPincode(e.target.value)}
                      required />
                  </label>
                </section>


                {/* Product */}
                <section className="form-section">
                  <h3>{t("product_information")}</h3>
                  <label>{t("category")} <select disabled value={product?.category} className="select-field no-arrow"><option>{product?.category}</option></select></label>

                  {/* GRADE FROM FIREBASE */}
                  <label>{t("grade")} *
                    <select value={grade} onChange={e => setGrade(e.target.value)} required className="select-field">
                      <option value="">{t("select_grade")}</option>
                      {grades.map((g, i) => <option key={i} value={g}>{g}</option>)}
                    </select>
                  </label>

                  <label>{t("packing")} * <select value={packing} onChange={e => setPacking(e.target.value)} required className="select-field">
                    <option value="">{t("select_packing")}</option>
                    <option value="PP (Polypropylene Woven Bags)">{t("pp_bags")}</option>
                    <option value="Non-Woven Bags">{t("non_woven_bags")}</option>
                    <option value="Jute Bags">{t("jute_bags")}</option>
                    <option value="BOPP (Biaxially Oriented Polypropylene) Laminated Bags">{t("bopp_bags")}</option>
                    <option value="LDPE (Low Density Polyethylene) Pouches">{t("ldpe_pouches")}</option>
                  </select></label>

                  <label>{t("quantity")} * <select value={quantity} onChange={e => setQuantity(e.target.value)} required className="select-field">
                    <option value="">{t("select_quantity")}</option>
                    {quantityOptions.map((q, i) => <option key={i} value={q}>{q}</option>)}
                  </select></label>

                  <label>{t("state")} * <select value={state} onChange={e => setState(e.target.value)} required className="select-field">
                    <option value="">{t("select_state")}</option>
                    {stateOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select></label>

                  <label>{t("port")} *
                    <select value={port} onChange={e => setPort(e.target.value)} required className="select-field" disabled={!state}>
                      <option value="">{state ? t("select_port") : t("select_state_first")}</option>
                      {portOptions.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </label>

                  <label>{t("cif")} * <select value={cif} onChange={e => setCif(e.target.value)} required className="select-field">
                    <option value="">{t("select_cif")}</option>
                    <option value="Yes">{t("yes")}</option>
                    <option value="No">{t("no")}</option>
                  </select></label>

                  <label>{t("currency")} * <select value={currency} onChange={e => setCurrency(e.target.value)} required className="select-field">
                    <option value="">{t("select_currency")}</option>
                    {currencyOptions.map((c, i) => <option key={i} value={c.value}>{c.value} ({c.symbol})</option>)}
                  </select></label>

                  <label>{t("custom_logo")} * <select value={customLogo} onChange={e => setCustomLogo(e.target.value)} required className="select-field">
                    <option value="">{t("select_logo")}</option>
                    <option value="Yes">{t("yes")}</option>
                    <option value="No">{t("no")}</option>
                  </select></label>

                  <label>{t("additional_info")} <textarea value={additionalInfo} onChange={e => setAdditionalInfo(e.target.value)} className="textarea-field" /></label>
                </section>

                <button type="submit" className="submit-btn">{t("get_quote")}</button>
              </form>
            </div>

            {/* BILL */}
            <div className="bill-container">
              <h3>{t("estimated_bill")}</h3>
              <div className="bill-breakdown">
                <div className="bill-item">
                  <span>{t("grade_price")}:</span>
                  <span>{currencyOptions.find(o => o.value === currency)?.symbol}{gradePrice.toFixed(2)} {t("per")} {t("quintal")}</span>
                </div>

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
                  <span>{t("quantity_price")}:</span>
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
              {/* NOTE BELOW ESTIMATED BILL */}
              <div className="tw-mt-4 tw-text-xs tw-text-yellow-400 tw-leading-relaxed">
                {t("note")}:{" "}
                {t(
                  "This is an estimated cost. Actual costs may vary based on additional requirements and market conditions.")}
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