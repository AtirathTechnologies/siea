// Prices.jsx - COMPLETE (modified handleSelectDestination)
import React, { useEffect, useState, useRef } from "react";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";
import { useNavigate } from "react-router-dom";

const Prices = () => {
  const [marketRatesData, setMarketRatesData] = useState({});
  const [cifRatesData, setCifRatesData] = useState([]);
  const [selectedState, setSelectedState] = useState("");
  const [loading, setLoading] = useState(true);
  const [exchangeRates, setExchangeRates] = useState({
    USD: 1,
    INR: 83.5,
    EUR: 0.92,
    GBP: 0.79,
    AED: 3.67,
  });

  const [showPackingDropdown, setShowPackingDropdown] = useState(false);
  const packingDropdownRef = useRef(null);
  const navigate = useNavigate();

  /* ------------------ CURRENCY CONVERTER ------------------ */
  const [currency, setCurrency] = useState(() => {
    const forceUSD = localStorage.getItem('forceCurrencyToUSD');
    const selectedCifDestination = localStorage.getItem('selectedCifDestination');

    if (forceUSD === 'true' && selectedCifDestination) {
      const parsedDestination = JSON.parse(selectedCifDestination);
      if (parsedDestination.port && parsedDestination.port !== "All Ports") {
        console.log("Initializing with USD because coming from SeaFreight with port:", parsedDestination.port);
        localStorage.removeItem('forceCurrencyToUSD');
        return 'USD';
      }
    }

    const savedCurrency = localStorage.getItem('selectedCurrency');
    return savedCurrency || "INR";
  });

  /* ------------------ PACKING OPTIONS ------------------ */
  const [packing, setPacking] = useState(() => {
    const savedPacking = localStorage.getItem('selectedPacking');
    return savedPacking || "50kg PP";
  });

  const packingOptions = [
    "50kg PP",
    "50lbs BOPP",
    "40Kg PP",
    "40kg Non-woven",
    "40kg Jute (Jute Inner)",
    "40kg Jute",
    "39kg Non-woven",
    "39kg BOPP",
    "36kg Non-Woven",
    "35kg Non-Woven",
    "35kg Jute",
    "30kg Non Woven",
    "30kg Jute (Jute inner)",
    "30kg Jute",
    "30kg PP",
    "25kg PP",
    "25kg Non-Woven",
    "25kg Jute",
    "25kg BOPP (Private Label)",
    "25kg BOPP",
    "24.5kg PP",
    "24.5kg Non-Woven",
    "20kg PP",
    "20kg Non-woven",
    "20kg Jute",
    "20kg BOPP (Private Label)",
    "20kg BOPP",
    "17/18Kg Non-woven",
    "4*10kg Non-woven",
    "4*10kg Jute",
    "4*10lbs Non-woven",
    "4*10lbs Jute",
    "4*10Kgs PP",
    "2*10kg Non-woven",
    "2*10kg Jute",
    "2*10kg BOPP with outer (Private Label)",
    "2*10kg BOPP with outer",
    "2*20lbs Non-woven",
    "2*25lbs BOPP",
    "4*5kg Non-woven",
    "4*5kg Jute",
    "4*5kg BOPP with outer (Private Label)",
    "4*5kg Pouch with outer (Private Label)",
    "4*5kg Pouch with carton (Private Label)",
    "4*5kg Pouch with carton",
    "8*5kg Non-woven",
    "8*5kg Jute",
    "8*5Kgs PP",
    "10*4Kgs Non Woven",
    "10*4Kg Non Woven",
    "10*2kg Non Woven",
    "20*1kg Non-woven",
    "20*1kg Jute",
    "20*1kg Pouch with carton (Private Label)",
    "20*1kg Pouch with outer (Private Label)",
    "20*1kg Pouch with carton",
    "One Jumbo liner bag"
  ];

  // Get selected destination from localStorage
  const [selectedCifDestination, setSelectedCifDestination] = useState(() => {
    const saved = localStorage.getItem('selectedCifDestination');
    return saved ? JSON.parse(saved) : {
      port: "Jebel Ali",
      country: "UAE",
      region: "Middle East",
      container: "20' Container"
    };
  });

  // Save to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('selectedCifDestination', JSON.stringify(selectedCifDestination));
  }, [selectedCifDestination]);

  // Save packing to localStorage
  useEffect(() => {
    localStorage.setItem('selectedPacking', packing);
  }, [packing]);

  // Basmati rice names
  const basmatiRiceNames = ["1121", "1509", "1401", "1718", "pusa", "basmati"];

  // Non-basmati rice names
  const nonBasmatiRiceNames = [
    "sugandha", "sharbati", "pr-11", "pr-14", "pr-06", "pr-47", "rh-10",
    "sona masoori", "long grain", "ir-8", "gr-11", "swarna", "kalizeera", "ponni"
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (packingDropdownRef.current && !packingDropdownRef.current.contains(event.target)) {
        setShowPackingDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle currency change
  const handleCurrencyChange = (e) => {
    const newCurrency = e.target.value;
    setCurrency(newCurrency);
    localStorage.setItem('selectedCurrency', newCurrency);
  };

  // Handle packing change
  const handlePackingChange = (newPacking) => {
    setPacking(newPacking);
    setShowPackingDropdown(false);
  };

  // Toggle packing dropdown
  const togglePackingDropdown = () => {
    setShowPackingDropdown(!showPackingDropdown);
  };

  // Fetch exchange rates from Firebase
  useEffect(() => {
    const ratesRef = ref(db, "exchangeRates/rates");

    onValue(ratesRef, (snapshot) => {
      if (snapshot.exists()) {
        setExchangeRates(snapshot.val());
        console.log("Exchange rates loaded from Firebase:", snapshot.val());
      }
    });
  }, []);

  // Fetch data based on selected currency
  useEffect(() => {
    setLoading(true);

    if (currency === "INR") {
      const marketRatesRef = ref(db, "market_rates/");
      console.log("Fetching INR data from market_rates");

      onValue(marketRatesRef, (snapshot) => {
        if (snapshot.exists()) {
          const allData = snapshot.val();
          console.log("Fetched market_rates data:", allData);
          setMarketRatesData(allData);
          setCifRatesData([]);

          const states = Object.keys(allData);
          if (states.length > 0) {
            setSelectedState(states[0]);
          }
        } else {
          console.log("No market_rates data found");
          setMarketRatesData({});
          setSelectedState("");
        }
        setLoading(false);
      }, (error) => {
        console.error("Market rates error:", error);
        setLoading(false);
      });
    } else {
      const cifRatesRef = ref(db, "cifRates/");
      console.log(`Fetching ${currency} data from cifRates`);

      onValue(cifRatesRef, (snapshot) => {
        if (snapshot.exists()) {
          const cifData = snapshot.val();
          console.log("Fetched cifRates data:", cifData);

          let dataArray = [];
          if (Array.isArray(cifData)) {
            dataArray = cifData;
          } else if (typeof cifData === 'object') {
            dataArray = Object.values(cifData);
          }

          console.log(`Processed ${dataArray.length} CIF records`);
          setCifRatesData(dataArray);
          setMarketRatesData({});
        } else {
          console.log("No cifRates data found");
          setCifRatesData([]);
        }
        setLoading(false);
      }, (error) => {
        console.error("CIF rates error:", error);
        setLoading(false);
      });
    }
  }, [currency]);

  // --- MODIFIED: navigate to SeaFreight with proper return URL ---
  const handleSelectDestination = () => {
    // Save current page state (optional)
    localStorage.setItem('pricesPageState', JSON.stringify({
      currency,
      selectedState,
      packing
    }));

    // --- IMPORTANT: Clear any leftover modal data (ensures BuyModal doesn't auto-open) ---
    localStorage.removeItem('seaFreightModalData');
    // --- Set return URL to this page ---
    localStorage.setItem('seaFreightReturnTo', '/market-rates');

    navigate('/sea-freight');
  };

  // Function to clear destination selection
  const handleClearDestination = () => {
    setSelectedCifDestination({
      port: "Jebel Ali",
      country: "UAE",
      region: "Middle East",
      container: "20' Container"
    });
  };

  const convertPrice = (priceRange) => {
    if (!priceRange) return "";

    const symbols = {
      INR: "₹",
      USD: "$",
      EUR: "€",
      GBP: "£",
      AED: "د.إ",
    };

    if (currency === "INR") return priceRange;

    const [low, high] = priceRange
      .replace(/[₹$€£د.إ]/g, "")
      .split("-")
      .map((n) => parseFloat(n.trim()));

    const rate = exchangeRates[currency] / exchangeRates.INR;

    return `${symbols[currency]}${(low * rate).toFixed(2)} - ${symbols[currency]}${(high * rate).toFixed(2)}`;
  };

  // Function to convert single price value from USD to selected currency
  const convertSinglePrice = (priceInUSD) => {
    if (!priceInUSD && priceInUSD !== 0) return "0";

    const price = parseFloat(priceInUSD);
    if (isNaN(price)) return "0";

    const convertedPrice = price * exchangeRates[currency];

    if (convertedPrice === Math.floor(convertedPrice)) {
      return convertedPrice.toFixed(0);
    } else {
      return convertedPrice.toFixed(2);
    }
  };

  // Get price adjustment factor based on packing
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
      "One Jumbo liner bag": 0.85
    };

    return packingAdjustments[packingOption] || 1.0;
  };

  // Process CIF data into organized structure by rice type
  const processCifData = () => {
    if (!Array.isArray(cifRatesData) || cifRatesData.length === 0) {
      return { basmati: [], nonBasmati: [] };
    }

    const basmatiItems = [];
    const nonBasmatiItems = [];

    const groupedByGrade = {};

    cifRatesData.forEach((item, dataIndex) => {
      const grade = item.Grade || item.grade || "Unknown";
      const gradeLower = grade.toLowerCase();

      let isBasmati = basmatiRiceNames.some(name => gradeLower.includes(name));

      if (!groupedByGrade[grade]) {
        groupedByGrade[grade] = {
          grade: grade,
          isBasmati: isBasmati,
          items: []
        };
      }

      let fobUSD, cifMinUSD, cifMaxUSD;

      if (item.FOB_USD !== undefined) {
        fobUSD = parseFloat(item.FOB_USD);
      } else if (item.FOB !== undefined) {
        fobUSD = parseFloat(item.FOB);
      } else {
        fobUSD = 0;
      }

      cifMinUSD = parseFloat(item.Region_Grade_CIF_Min || item.CIF_USD || item.CIF || 0);
      cifMaxUSD = parseFloat(item.Region_Grade_CIF_Max || item.CIF_USD || item.CIF || 0);

      if (cifMinUSD && !cifMaxUSD) {
        cifMaxUSD = cifMinUSD;
      }
      if (cifMaxUSD && !cifMinUSD) {
        cifMinUSD = cifMaxUSD;
      }
      if (!cifMinUSD && !cifMaxUSD) {
        cifMinUSD = 0;
        cifMaxUSD = 0;
      }

      const container = item.Container || item.container || "20' Container";
      const destinationPort = item["Destination Port"] || item.destinationPort || item.Destination || "Jebel Ali";
      const country = item.Country || item.country || "UAE";
      const region = item.Region || item.region || "Middle East";

      const matchesPort = selectedCifDestination.port === "All Ports" ||
        destinationPort === selectedCifDestination.port;
      const matchesContainer = selectedCifDestination.container === "All Containers" ||
        container === selectedCifDestination.container;

      if (matchesPort && matchesContainer) {
        const packingAdjustment = getPackingAdjustment(packing);

        const adjustedFobUSD = fobUSD * packingAdjustment;
        const adjustedCifMinUSD = cifMinUSD * packingAdjustment;
        const adjustedCifMaxUSD = cifMaxUSD * packingAdjustment;

        const fobPrice = convertSinglePrice(adjustedFobUSD);
        const cifMinPrice = convertSinglePrice(adjustedCifMinUSD);
        const cifMaxPrice = convertSinglePrice(adjustedCifMaxUSD);

        const fobMin = item.Origin_FOB_Min ? convertSinglePrice(parseFloat(item.Origin_FOB_Min) * packingAdjustment) : fobPrice;
        const fobMax = item.Origin_FOB_Max ? convertSinglePrice(parseFloat(item.Origin_FOB_Max) * packingAdjustment) : fobPrice;

        const fobPriceStr = fobMin === fobMax ? fobMin : `${fobMin}-${fobMax}`;

        let cifPriceStr;
        if (cifMinPrice === cifMaxPrice || cifMaxPrice === "0") {
          cifPriceStr = cifMinPrice;
        } else {
          cifPriceStr = `${cifMinPrice}-${cifMaxPrice}`;
        }

        groupedByGrade[grade].items.push({
          type: grade,
          destinationPort: destinationPort,
          country: country,
          region: region,
          container: container,
          originPort: item["Origin Port"] || item.originPort || "Mundra",
          fobPrice: fobPriceStr,
          cifPrice: cifPriceStr,
          fobUSD: fobUSD,
          cifMinUSD: cifMinUSD,
          cifMaxUSD: cifMaxUSD,
          packing: packing,
          packingAdjustment: packingAdjustment,
          dataIndex: dataIndex
        });
      }
    });

    Object.values(groupedByGrade).forEach(gradeGroup => {
      if (gradeGroup.items.length > 0) {
        if (gradeGroup.isBasmati) {
          basmatiItems.push(gradeGroup);
        } else {
          nonBasmatiItems.push(gradeGroup);
        }
      }
    });

    if (basmatiItems.length === 0 && nonBasmatiItems.length === 0 && cifRatesData.length > 0) {
      const firstItem = cifRatesData[0];
      const firstDestinationPort = firstItem["Destination Port"] || firstItem.destinationPort || firstItem.Destination || "Jebel Ali";
      const firstCountry = firstItem.Country || firstItem.country || "UAE";
      const firstRegion = firstItem.Region || firstItem.region || "Middle East";
      const firstContainer = firstItem.Container || firstItem.container || "20' Container";

      setSelectedCifDestination({
        port: firstDestinationPort,
        country: firstCountry,
        region: firstRegion,
        container: firstContainer
      });
    }

    return { basmati: basmatiItems, nonBasmati: nonBasmatiItems };
  };

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.loader}></div>
        <span style={styles.loadingText}>Fetching Market Rates...</span>
      </div>
    );
  }

  const states = Object.keys(marketRatesData);
  const isMobile = window.innerWidth < 640;

  const processedCifData = currency !== "INR" ? processCifData() : { basmati: [], nonBasmati: [] };

  const getCurrencySymbol = () => {
    const symbols = {
      USD: "$",
      EUR: "€",
      GBP: "£",
      AED: "د.إ",
      INR: "₹"
    };
    return symbols[currency] || "$";
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.mainTitle}>Basmati & Non-Basmati Market Rates</h1>

      <div style={styles.currencyBox}>
        <label style={styles.currencyLabel}>Currency:</label>
        <select
          value={currency}
          onChange={handleCurrencyChange}
          style={styles.currencyDropdown}
        >
          <option value="INR">INR (₹)</option>
          <option value="USD">USD ($)</option>
          <option value="EUR">EUR (€)</option>
          <option value="GBP">GBP (£)</option>
          <option value="AED">AED (د.إ)</option>
        </select>
      </div>

      {currency === "INR" && states.length > 0 && (
        <div style={styles.tabRow}>
          {states.map((state) => (
            <button
              key={state}
              onClick={() => setSelectedState(state)}
              style={{
                ...styles.tabButton,
                background:
                  selectedState === state ? "#FFD700" : "rgba(255,255,255,0.06)",
                color: selectedState === state ? "#000" : "#fff",
                border:
                  selectedState === state
                    ? "1px solid #FFD700"
                    : "1px solid #333",
              }}
            >
              {state.replace("_", " ").toUpperCase()}
            </button>
          ))}
        </div>
      )}

      <div style={styles.card}>
        {currency !== "INR" ? (
          <>
            <h2 style={styles.stateTitle}>INDIAN RICE EXPORT PRICES</h2>
          </>
        ) : (
          <h2 style={styles.stateTitle}>
            {selectedState ? selectedState.replace("_", " ").toUpperCase() : "No Data Available"}
          </h2>
        )}

        {currency !== "INR" ? (
          <>
            {processedCifData.basmati.length > 0 ? (
              <>
                <h3 style={styles.sectionTitle}>
                  BASMATI RICE <span style={styles.goldLine}></span>
                </h3>

                <div style={styles.infoNote}>
                  <span style={styles.noteText}>
                    FOB & CIF Prices in {currency} per metric ton
                  </span>
                </div>

                {!isMobile && (
                  <div style={styles.tableHeader}>
                    <div style={styles.headerCell}>Rice Grade</div>
                    <div style={{ ...styles.headerCell, position: "relative" }} ref={packingDropdownRef}>
                      <div
                        style={styles.packingHeader}
                        onClick={togglePackingDropdown}
                      >
                        Packing
                        <span style={styles.dropdownArrow}>▼</span>
                      </div>
                      {showPackingDropdown && (
                        <div style={styles.packingDropdownContainer}>
                          <div style={styles.packingDropdown}>
                            {packingOptions.map((option, index) => (
                              <div
                                key={index}
                                style={{
                                  ...styles.packingOption,
                                  backgroundColor: packing === option ? "#FFD700" : "transparent",
                                  color: packing === option ? "#000" : "#fff"
                                }}
                                onClick={() => handlePackingChange(option)}
                              >
                                {option}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div style={styles.headerCell}>FOB Price<br /><span style={styles.subHeader}>Mundra Port</span></div>
                    <div style={styles.headerCell}>
                      <div style={styles.cifHeader}>
                        CIF Price
                        <span
                          style={styles.cifDropdownArrow}
                          onClick={handleSelectDestination}
                          title="Select Destination Port"
                        >
                          ▼
                        </span>
                      </div>
                      <div style={styles.destinationSubHeader}>
                        To: {selectedCifDestination.port}
                      </div>
                    </div>
                  </div>
                )}

                {processedCifData.basmati.map((gradeGroup, idx) => (
                  <div key={idx} style={styles.varietyCard}>
                    <h5 style={styles.varietyName}>{gradeGroup.grade}</h5>

                    {gradeGroup.items.slice(0, 5).map((item, i) => {
                      const currencySymbol = getCurrencySymbol();

                      return isMobile ? (
                        <div
                          key={i}
                          style={{
                            ...styles.row,
                            gridTemplateColumns: "1fr",
                          }}
                        >
                          <div style={styles.typeCell}>
                            <div style={styles.rowLabel}>{item.type}</div>
                            <div style={styles.cropYear}>
                              To: {item.destinationPort} ({item.country})
                            </div>
                            <div style={styles.cropYear}>
                              Container: {item.container}
                            </div>
                            <div style={styles.packingMobileContainer}>
                              <span style={styles.packingLabel}>Packing:</span>
                              <div style={styles.packingValueMobile}>
                                {packing}
                              </div>
                            </div>
                          </div>

                          <div style={{
                            ...styles.rowPrice,
                            textAlign: "left",
                            alignItems: "flex-start"
                          }}>
                            <div style={{ color: "#4CAF50", fontWeight: "700" }}>
                              FOB: {currencySymbol}{item.fobPrice}
                            </div>
                            <div style={{ color: "#2196F3", fontWeight: "700", marginTop: "5px" }}>
                              CIF: {currencySymbol}{item.cifPrice}
                            </div>
                            <div style={styles.priceUnit}>Per Metric Ton</div>
                            <div style={styles.adjustmentNote}>
                              (Adjusted for {packing} packing)
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div
                          key={i}
                          style={{
                            ...styles.tableRow,
                            gridTemplateColumns: "2fr 1fr 1fr 1fr",
                          }}
                        >
                          <div style={styles.qualityCell}>
                            <div style={styles.rowLabel}>{item.type}</div>
                          </div>
                          <div style={styles.packingCell}>
                            <div style={styles.packingValue}>{packing}</div>
                          </div>
                          <div style={styles.fobCell}>
                            <div style={styles.priceValue}>{currencySymbol}{item.fobPrice}</div>
                          </div>
                          <div style={styles.cifCell}>
                            <div style={styles.priceValue}>{currencySymbol}{item.cifPrice}</div>
                          </div>
                        </div>
                      );
                    })}

                    {gradeGroup.items.length > 5 && (
                      <div style={{ textAlign: 'center', padding: '10px', color: '#FFD700', fontSize: '12px' }}>
                        + {gradeGroup.items.length - 5} more records for this grade
                      </div>
                    )}
                  </div>
                ))}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: '#FFD700' }}>
                No Basmati rice data found for {selectedCifDestination.port}
                <div style={{ fontSize: '14px', marginTop: '10px', color: '#aaa' }}>
                  <button
                    style={styles.changeDestinationButton}
                    onClick={handleSelectDestination}
                  >
                    Change Destination
                  </button>
                </div>
              </div>
            )}

            {processedCifData.nonBasmati.length > 0 && (
              <>
                <h3 style={styles.sectionTitle}>
                  NON-BASMATI RICE <span style={styles.goldLine}></span>
                </h3>

                <div style={styles.infoNote}>
                  <span style={styles.noteText}>
                    FOB & CIF Prices in {currency} per metric ton
                  </span>
                </div>

                {!isMobile && (
                  <div style={styles.tableHeader}>
                    <div style={styles.headerCell}>Rice Grade</div>
                    <div style={{ ...styles.headerCell, position: "relative" }}>
                      <div
                        style={styles.packingHeader}
                        onClick={togglePackingDropdown}
                      >
                        Packing
                        <span style={styles.dropdownArrow}>▼</span>
                      </div>
                    </div>
                    <div style={styles.headerCell}>FOB Price<br /><span style={styles.subHeader}>Mundra Port</span></div>
                    <div style={styles.headerCell}>
                      <div style={styles.cifHeader}>
                        CIF Price
                        <span
                          style={styles.cifDropdownArrow}
                          onClick={handleSelectDestination}
                          title="Select Destination Port"
                        >
                          ▼
                        </span>
                      </div>
                      <div style={styles.destinationSubHeader}>
                        To: {selectedCifDestination.port}
                      </div>
                    </div>
                  </div>
                )}

                {processedCifData.nonBasmati.map((gradeGroup, idx) => (
                  <div key={idx} style={styles.varietyCard}>
                    <h5 style={styles.varietyName}>{gradeGroup.grade}</h5>

                    {gradeGroup.items.slice(0, 5).map((item, i) => {
                      const currencySymbol = getCurrencySymbol();

                      return isMobile ? (
                        <div
                          key={i}
                          style={{
                            ...styles.row,
                            gridTemplateColumns: "1fr",
                          }}
                        >
                          <div style={styles.typeCell}>
                            <div style={styles.rowLabel}>{item.type}</div>
                            <div style={styles.cropYear}>
                              To: {item.destinationPort} ({item.country})
                            </div>
                            <div style={styles.cropYear}>
                              Container: {item.container}
                            </div>
                            <div style={styles.packingMobileContainer}>
                              <span style={styles.packingLabel}>Packing:</span>
                              <div style={styles.packingValueMobile}>
                                {packing}
                              </div>
                            </div>
                          </div>

                          <div style={{
                            ...styles.rowPrice,
                            textAlign: "left",
                            alignItems: "flex-start"
                          }}>
                            <div style={{ color: "#4CAF50", fontWeight: "700" }}>
                              FOB: {currencySymbol}{item.fobPrice}
                            </div>
                            <div style={{ color: "#2196F3", fontWeight: "700", marginTop: "5px" }}>
                              CIF: {currencySymbol}{item.cifPrice}
                            </div>
                            <div style={styles.priceUnit}>Per Metric Ton</div>
                            <div style={styles.adjustmentNote}>
                              (Adjusted for {packing} packing)
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div
                          key={i}
                          style={{
                            ...styles.tableRow,
                            gridTemplateColumns: "2fr 1fr 1fr 1fr",
                          }}
                        >
                          <div style={styles.qualityCell}>
                            <div style={styles.rowLabel}>{item.type}</div>
                          </div>
                          <div style={styles.packingCell}>
                            <div style={styles.packingValue}>{packing}</div>
                          </div>
                          <div style={styles.fobCell}>
                            <div style={styles.priceValue}>{currencySymbol}{item.fobPrice}</div>
                          </div>
                          <div style={styles.cifCell}>
                            <div style={styles.priceValue}>{currencySymbol}{item.cifPrice}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </>
            )}

            {processedCifData.basmati.length === 0 && processedCifData.nonBasmati.length === 0 && cifRatesData.length > 0 && (
              <div style={styles.varietyCard}>
                <h3 style={styles.sectionTitle}>
                  ALL CIF RATES <span style={styles.goldLine}></span>
                </h3>

                <div style={styles.infoNote}>
                  <span style={styles.noteText}>
                    Showing all CIF data ({cifRatesData.length} records)
                  </span>
                </div>

                {cifRatesData.slice(0, 10).map((item, idx) => {
                  const currencySymbol = getCurrencySymbol();
                  const grade = item.Grade || item.grade || "Unknown";

                  const packingAdjustment = getPackingAdjustment(packing);

                  const fobUSD = parseFloat(item.FOB_USD || item.FOB || item.fob || 0) * packingAdjustment;
                  const cifMinUSD = parseFloat(item.Region_Grade_CIF_Min || item.CIF_USD || item.CIF || 0) * packingAdjustment;
                  const cifMaxUSD = parseFloat(item.Region_Grade_CIF_Max || item.CIF_USD || item.CIF || 0) * packingAdjustment;

                  const fobPrice = convertSinglePrice(fobUSD);
                  const cifMinPrice = convertSinglePrice(cifMinUSD);
                  const cifMaxPrice = convertSinglePrice(cifMaxUSD);

                  let cifPriceStr;
                  if (cifMinPrice === cifMaxPrice || cifMaxPrice === "0") {
                    cifPriceStr = cifMinPrice;
                  } else {
                    cifPriceStr = `${cifMinPrice}-${cifMaxPrice}`;
                  }

                  return (
                    <div key={idx} style={styles.row}>
                      <div style={styles.typeCell}>
                        <div style={styles.rowLabel}>{grade}</div>
                        <div style={styles.cropYear}>
                          {item["Destination Port"]} ({item.Country}) | {item.Container}
                        </div>
                        <div style={styles.packingMobileContainer}>
                          <span style={styles.packingLabel}>Packing:</span>
                          <div style={styles.packingValueMobile}>
                            {packing}
                          </div>
                        </div>
                      </div>
                      <div style={styles.rowPrice}>
                        <div>FOB: {currencySymbol}{fobPrice}</div>
                        <div style={{ marginTop: '5px' }}>CIF: {currencySymbol}{cifPriceStr}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <>
            {marketRatesData[selectedState]?.basmati && (
              <>
                <h3 style={styles.sectionTitle}>
                  BASMATI <span style={styles.goldLine}></span>
                </h3>

                <div style={styles.infoNote}>
                  <span style={styles.noteText}>All prices in INR per quintal</span>
                </div>

                {marketRatesData[selectedState].basmati.map((item, idx) => (
                  <div key={idx} style={styles.varietyCard}>
                    <h4 style={styles.varietyName}>{item.variety}</h4>

                    {item.items.map((v, i) => (
                      <div
                        key={i}
                        style={{
                          ...styles.row,
                          gridTemplateColumns: isMobile ? "1fr" : "1fr auto",
                        }}
                      >
                        <div style={styles.typeCell}>
                          <div style={styles.rowLabel}>{v.type}</div>
                          <div style={styles.cropYear}>
                            Crop Year: {v.crop_year}
                          </div>
                        </div>

                        <div style={{
                          ...styles.rowPrice,
                          textAlign: isMobile ? "left" : "right",
                          alignItems: isMobile ? "flex-start" : "flex-end"
                        }}>
                          {convertPrice(v.price)}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </>
            )}

            {marketRatesData[selectedState]?.non_basmati && (
              <>
                <h3 style={styles.sectionTitle}>
                  NON-BASMATI <span style={styles.goldLine}></span>
                </h3>

                <div style={styles.infoNote}>
                  <span style={styles.noteText}>All prices in INR per quintal</span>
                </div>

                {marketRatesData[selectedState].non_basmati.map((item, idx) => (
                  <div key={idx} style={styles.varietyCard}>
                    <h4 style={styles.varietyName}>{item.variety}</h4>

                    {item.items.map((v, i) => (
                      <div
                        key={i}
                        style={{
                          ...styles.row,
                          gridTemplateColumns: isMobile ? "1fr" : "1fr auto",
                        }}
                      >
                        <div style={styles.typeCell}>
                          <div style={styles.rowLabel}>{v.type}</div>
                          <div style={styles.cropYear}>
                            Crop Year: {v.crop_year}
                          </div>
                        </div>

                        <div style={{
                          ...styles.rowPrice,
                          textAlign: isMobile ? "left" : "right",
                          alignItems: isMobile ? "flex-start" : "flex-end"
                        }}>
                          {convertPrice(v.price)}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </>
            )}
          </>
        )}

        {currency === "INR" && states.length === 0 && (
          <div style={styles.noData}>
            <p>No market rates data available for INR currency.</p>
          </div>
        )}

        {currency !== "INR" && cifRatesData.length === 0 && (
          <div style={styles.noData}>
            <p>No CIF rates data available for {currency} currency.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    background: "#000",
    minHeight: "100vh",
    padding: "clamp(12px, 4vw, 20px)",
    fontFamily: "Poppins, sans-serif",
    color: "white",
  },

  mainTitle: {
    textAlign: "center",
    fontSize: "clamp(18px, 5vw, 28px)",
    fontWeight: "bold",
    marginBottom: "25px",
    color: "#FFD700",
  },

  currencyBox: {
    textAlign: "center",
    marginBottom: "20px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },

  currencyLabel: {
    marginRight: "10px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#FFD700",
  },

  currencyDropdown: {
    padding: "10px 15px",
    borderRadius: "8px",
    background: "#111",
    color: "#fff",
    border: "1px solid #FFD700",
    fontSize: "14px",
  },

  tabRow: {
    display: "flex",
    gap: "12px",
    overflowX: "auto",
    marginBottom: "25px",
    padding: "5px 0",
  },

  tabButton: {
    padding: "10px 18px",
    borderRadius: "25px",
    fontWeight: "600",
    cursor: "pointer",
    whiteSpace: "nowrap",
    border: "none",
    fontSize: "13px",
  },

  card: {
    background: "#0d0d0d",
    padding: "clamp(14px, 4vw, 20px)",
    borderRadius: "15px",
    border: "1px solid #FFD700",
  },

  stateTitle: {
    fontSize: "clamp(18px, 4.5vw, 24px)",
    marginBottom: "10px",
    color: "#FFD700",
    textAlign: "center",
  },

  subTitle: {
    fontSize: "14px",
    color: "#FFD700",
    textAlign: "center",
    marginBottom: "20px",
    opacity: 0.9,
  },

  sectionTitle: {
    fontSize: "clamp(16px, 4vw, 20px)",
    color: "#FFD700",
    marginBottom: "12px",
    marginTop: "25px",
    textAlign: "center",
  },

  goldLine: {
    display: "block",
    height: "3px",
    width: "60px",
    background: "#FFD700",
    marginTop: "4px",
  },

  infoNote: {
    background: "rgba(255, 215, 0, 0.1)",
    padding: "8px 12px",
    borderRadius: "6px",
    marginBottom: "15px",
    borderLeft: "3px solid #FFD700",
  },

  noteText: {
    fontSize: "13px",
    color: "#FFD700",
    fontWeight: "600",
  },

  varietyCard: {
    background: "#1a1a1a",
    padding: "15px",
    borderRadius: "12px",
    marginBottom: "15px",
    borderLeft: "4px solid #FFD700",
  },

  varietyName: {
    fontSize: "16px",
    color: "#FFD700",
    marginBottom: "10px",
  },

  tableHeader: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr 1fr",
    gap: "12px",
    padding: "12px 15px",
    background: "#252525",
    borderRadius: "8px",
    marginBottom: "10px",
    borderBottom: "2px solid #FFD700",
  },

  headerCell: {
    fontWeight: "700",
    color: "#FFD700",
    fontSize: "13px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    textAlign: "center",
    position: "relative",
  },

  packingHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "5px",
    cursor: "pointer",
    padding: "5px",
    borderRadius: "4px",
    transition: "background 0.3s",
  },

  dropdownArrow: {
    fontSize: "10px",
    color: "#FFD700",
    marginLeft: "5px",
  },

  packingDropdownContainer: {
    position: "absolute",
    top: "100%",
    left: "0",
    right: "0",
    zIndex: 1000,
    marginTop: "5px",
  },

  packingDropdown: {
    background: "#111",
    border: "1px solid #FFD700",
    borderRadius: "4px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
    padding: "5px 0",
    maxHeight: "300px",
    overflowY: "auto",
  },

  packingOption: {
    padding: "8px 12px",
    cursor: "pointer",
    fontSize: "12px",
    transition: "background 0.2s",
  },

  subHeader: {
    fontSize: "10px",
    color: "#aaa",
    fontWeight: "normal",
    marginTop: "3px",
    display: "block",
  },

  row: {
    display: "grid",
    gap: "12px",
    padding: "15px 0",
    borderBottom: "1px solid #333",
    alignItems: "center",
  },

  tableRow: {
    display: "grid",
    gap: "12px",
    padding: "15px 0",
    borderBottom: "1px solid #333",
    alignItems: "center",
  },

  typeCell: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },

  packingMobileContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
    marginTop: "8px",
  },

  packingLabel: {
    fontSize: "12px",
    color: "#888",
    marginBottom: "5px",
  },

  packingValueMobile: {
    padding: "6px 8px",
    borderRadius: "4px",
    background: "#111",
    color: "#FFD700",
    border: "1px solid #FFD700",
    fontSize: "12px",
    fontWeight: "600",
  },

  qualityCell: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "flex-start",
  },

  packingCell: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },

  packingValue: {
    color: "#FFD700",
    fontWeight: "700",
    fontSize: "14px",
    textAlign: "center",
  },

  fobCell: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },

  cifCell: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },

  rowLabel: {
    fontWeight: "700",
    fontSize: "15px",
    marginBottom: "4px",
  },

  cropYear: {
    fontSize: "13px",
    opacity: 0.7,
  },

  rowPrice: {
    color: "#FFD700",
    fontWeight: "700",
    fontSize: "clamp(14px, 4vw, 18px)",
    whiteSpace: "nowrap",
    display: "flex",
    flexDirection: "column",
  },

  priceValue: {
    color: "#FFD700",
    fontWeight: "700",
    fontSize: "15px",
  },

  priceUnit: {
    fontSize: "11px",
    color: "#888",
    fontStyle: "italic",
    marginTop: "4px",
  },

  adjustmentNote: {
    fontSize: "10px",
    color: "#aaa",
    marginTop: "3px",
    fontStyle: "italic",
  },

  loadingScreen: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginTop: "150px",
  },

  loader: {
    width: "50px",
    height: "50px",
    border: "5px solid #333",
    borderTop: "5px solid #FFD700",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },

  loadingText: {
    marginTop: "10px",
    color: "#FFD700"
  },

  noData: {
    textAlign: "center",
    padding: "40px",
    color: "#FFD700",
    fontSize: "16px",
  },

  cifHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "5px",
  },

  cifDropdownArrow: {
    fontSize: "10px",
    color: "#FFD700",
    cursor: "pointer",
    marginLeft: "5px",
    transition: "transform 0.2s",
  },

  destinationSubHeader: {
    fontSize: "10px",
    color: "#fff",
    fontWeight: "normal",
    marginTop: "3px",
    display: "block",
  },

  changeDestinationButton: {
    padding: "6px 12px",
    borderRadius: "4px",
    background: "#2196F3",
    color: "#fff",
    border: "none",
    fontSize: "12px",
    cursor: "pointer",
    transition: "background 0.3s",
  },
};

// Add CSS animation for the loader
const styleSheet = document.styleSheets[0];
if (styleSheet) {
  styleSheet.insertRule(`
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `, styleSheet.cssRules.length);

  styleSheet.insertRule(`
    .packing-option:hover {
      background: #FFD700 !important;
      color: #000 !important;
    }
  `, styleSheet.cssRules.length);

  styleSheet.insertRule(`
    .packing-header:hover {
      background: rgba(255, 215, 0, 0.1) !important;
    }
  `, styleSheet.cssRules.length);

  styleSheet.insertRule(`
    .cif-dropdown-arrow:hover {
      transform: scale(1.2) !important;
    }
  `, styleSheet.cssRules.length);

  styleSheet.insertRule(`
    .change-destination-button:hover {
      background: #1976D2 !important;
    }
  `, styleSheet.cssRules.length);
}

export default Prices;