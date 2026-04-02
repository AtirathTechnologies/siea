// Prices.jsx - COMPLETE (modified handleSelectDestination)
import React, { useEffect, useState, useRef, useMemo } from "react";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";
import { useNavigate } from "react-router-dom";
import { calculateFOBUSD } from "../utils/pricingUtils";


// Basmati rice names
const basmatiRiceNames = ["1121", "1509", "1401", "1718", "pusa", "basmati"];

// Non-basmati rice names
const nonBasmatiRiceNames = [
  "sugandha", "sharbati", "pr-11", "pr-14", "pr-06", "pr-47", "rh-10",
  "sona masoori", "long grain", "ir-8", "gr-11", "swarna", "kalizeera", "ponni"
];

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
    return saved ? JSON.parse(saved) : null;
  });

  // Save to localStorage whenever it changes
  useEffect(() => {
    if (selectedCifDestination) {
      localStorage.setItem('selectedCifDestination', JSON.stringify(selectedCifDestination));
    } else {
      localStorage.removeItem('selectedCifDestination');
    }
  }, [selectedCifDestination]);

  // Save packing to localStorage
  useEffect(() => {
    localStorage.setItem('selectedPacking', packing);
  }, [packing]);



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

    const unsubscribe = onValue(ratesRef, (snapshot) => {
      if (snapshot.exists()) {
        setExchangeRates(snapshot.val());
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const styleSheet = document.styleSheets[0];
    if (!styleSheet) return;

    const alreadyExists = Array.from(styleSheet.cssRules).some(rule =>
      rule.name === "spin"
    );

    if (!alreadyExists) {
      styleSheet.insertRule(`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `, styleSheet.cssRules.length);
    }
  }, []);

  // Fetch data based on selected currency
  useEffect(() => {
    setLoading(true);

    let unsubscribe;

    if (currency === "INR") {
      const marketRatesRef = ref(db, "market_rates/");

      unsubscribe = onValue(
        marketRatesRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const allData = snapshot.val();
            setMarketRatesData(allData);
            setCifRatesData([]);

            const states = Object.keys(allData);
            if (states.length > 0) {
              setSelectedState(states[0]);
            }
          } else {
            setMarketRatesData({});
            setSelectedState("");
          }
          setLoading(false);
        },
        () => setLoading(false)
      );
    } else {
      const cifRatesRef = ref(db, "cifRates/");

      unsubscribe = onValue(
        cifRatesRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const cifData = snapshot.val();
            const dataArray = Array.isArray(cifData)
              ? cifData
              : Object.values(cifData);

            setCifRatesData(dataArray);
            setMarketRatesData({});
          } else {
            setCifRatesData([]);
          }
          setLoading(false);
        },
        () => setLoading(false)
      );
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
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

    const rate = (exchangeRates[currency] || 1) / (exchangeRates.INR || 1);

    return `${symbols[currency]}${(low * rate).toFixed(2)} - ${symbols[currency]}${(high * rate).toFixed(2)}`;
  };

  // Function to convert single price value from USD to selected currency
  const convertSinglePrice = (priceValue, priceCurrency = "USD") => {
    if (!priceValue && priceValue !== 0) return "0";

    let price = parseFloat(priceValue);
    if (isNaN(price)) return "0";

    let valueInUSD;

    // If price is INR convert to USD first
    if (priceCurrency === "INR") {
      valueInUSD = price / exchangeRates.INR;
    } else {
      valueInUSD = price;
    }

    // Now convert USD to selected currency
    const finalValue = valueInUSD * (exchangeRates[currency] || 1);
    return finalValue.toFixed(2);
  };


  // Get price adjustment factor based on packing
  const getPackingAdjustment = (packingOption) => {

    return packingAdjustments[packingOption] || 1.0;
  };

  /* ---------------- OPTIMIZED BASE PROCESSING (HEAVY WORK ONCE) ---------------- */

  const baseProcessedData = useMemo(() => {
    if (!Array.isArray(cifRatesData) || cifRatesData.length === 0) {
      return [];
    }

    const grouped = {};

    cifRatesData.forEach((item) => {
      const grade = item.Grade || "Unknown";
      const gradeLower = grade.toLowerCase();

      const isBasmati = basmatiRiceNames.some(name =>
        gradeLower.includes(name)
      );

      if (!grouped[grade]) {
        grouped[grade] = {
          grade,
          isBasmati,
          items: []
        };
      }

      const exMillMin = parseFloat(item.Ex_Mill_Min || 0);
      const exMillMax = parseFloat(item.Ex_Mill_Max || 0);

      const {
        fobMinUSD,
        fobMaxUSD
      } = calculateFOBUSD(
        exMillMin,
        exMillMax,
        exchangeRates.INR
      );

      grouped[grade].items.push({
        ...item,
        rawFobMinUSD: fobMinUSD,
        rawFobMaxUSD: fobMaxUSD
      });
    });

    return Object.values(grouped);

  }, [cifRatesData, exchangeRates.INR]);

  /* ---------------- LIGHTWEIGHT DISPLAY PROCESSING ---------------- */

  const processedCifData = useMemo(() => {

    if (currency === "INR") {
      return { basmati: [], nonBasmati: [] };
    }

    const packingAdjustment = getPackingAdjustment(packing);

    const basmati = [];
    const nonBasmati = [];

    baseProcessedData.forEach(group => {

      const filteredItems = group.items
        .filter(item => {

          const matchesPort =
            !selectedCifDestination ||
            selectedCifDestination.port === "All Ports" ||
            item["Destination Port"] === selectedCifDestination.port;

          const matchesContainer =
            !selectedCifDestination ||
            selectedCifDestination.container === "All Containers" ||
            item.Container === selectedCifDestination.container;

          return matchesPort && matchesContainer;
        })
        .map(item => {

          const adjustedFobMin = item.rawFobMinUSD * packingAdjustment;
          const adjustedFobMax = item.rawFobMaxUSD * packingAdjustment;

          const fobMinPrice = convertSinglePrice(adjustedFobMin, "USD");
          const fobMaxPrice = convertSinglePrice(adjustedFobMax, "USD");


          return {
            ...item,
            fobPrice:
              fobMinPrice === fobMaxPrice
                ? fobMinPrice
                : `${fobMinPrice}-${fobMaxPrice}`,
          };
        });

      if (filteredItems.length > 0) {
        if (group.isBasmati) {
          basmati.push({ ...group, items: filteredItems });
        } else {
          nonBasmati.push({ ...group, items: filteredItems });
        }
      }

    });

    return { basmati, nonBasmati };

  }, [
    currency,
    packing,
    selectedCifDestination,
    exchangeRates,
    baseProcessedData
  ]);

  const [isMobile, setIsMobile] = useState(
    window.innerWidth < 640
  );
  const handleGetCIFPrice = (item) => {
    if (!selectedCifDestination || !selectedCifDestination.port) {
      alert("⚠️ Please select destination first");
      handleSelectDestination(); // redirect to sea freight
      return;
    }

    const phoneNumber = import.meta.env.VITE_WHATSAPP_NUMBER;

    const message = `Hello,

    I need CIF price for:

    Rice: ${item.Grade}
    Destination: ${selectedCifDestination.port}
    Country: ${selectedCifDestination.country}
    Packing: ${packing}
    Container: ${item.Container}

    Please share CIF price.`;

    window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`);
  };
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);


  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.loader}></div>
        <span style={styles.loadingText}>Fetching Market Rates...</span>
      </div>
    );
  }

  const states = Object.keys(marketRatesData);

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
                    Export Prices (EX-MILL & FOB)
                  </span>
                </div>

                {!selectedCifDestination && (
                  <div style={{ textAlign: "center", marginBottom: "15px" }}>
                    <button onClick={handleSelectDestination} style={styles.changeDestinationButton}>
                      Select Destination to Get CIF Price
                    </button>
                  </div>
                )}

                <div style={{ textAlign: "center", marginBottom: "15px" }}>
                  {selectedCifDestination ? (
                    <div style={{ color: "#FFD700", fontSize: "14px" }}>
                      📍 Shipping To: {selectedCifDestination.port}, {selectedCifDestination.country}

                      <button
                        onClick={handleSelectDestination}
                        style={{
                          marginLeft: "10px",
                          padding: "5px 10px",
                          background: "#2196F3",
                          border: "none",
                          borderRadius: "4px",
                          color: "#fff",
                          cursor: "pointer",
                          fontSize: "12px"
                        }}
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleSelectDestination}
                      style={styles.changeDestinationButton}
                    >
                      🚢 Select Destination
                    </button>
                  )}
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

                    <div style={styles.headerCell}>
                      EX-MILL<br />
                      <span style={styles.subHeader}>India</span>
                    </div>

                    {/* ✅ ADD THIS */}
                    <div style={styles.headerCell}>
                      FOB Price<br />
                      <span style={styles.subHeader}>Mundra Port</span>
                    </div>

                    {/* ✅ ADD THIS */}
                    <div style={styles.headerCell}>
                      Get CIF Price
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
                              <button
                                style={styles.whatsappButton}
                                onClick={() => handleGetCIFPrice(item)}
                              >
                                Get CIF Price on WhatsApp
                              </button>
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
                            gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
                          }}
                        >
                          <div style={styles.qualityCell}>
                            <div style={styles.rowLabel}>{item.type}</div>
                          </div>
                          <div style={styles.packingCell}>
                            <div style={styles.packingValue}>{packing}</div>
                          </div>
                          {/* EX-MILL */}
                          <div style={styles.exMillCell}>
                            {currency === "INR" ? "₹" : getCurrencySymbol()}
                            {convertSinglePrice(item.Ex_Mill_Min, "INR")} -
                            {currency === "INR" ? "₹" : getCurrencySymbol()}
                            {convertSinglePrice(item.Ex_Mill_Max, "INR")}
                          </div>
                          <div style={styles.fobCell}>
                            <div style={styles.priceValue}>{currencySymbol}{item.fobPrice}</div>
                          </div>
                          <div style={styles.cifCell}>
                            <button
                              style={styles.whatsappButton}
                              onClick={() => handleGetCIFPrice(item)}
                            >
                              Get CIF Price
                            </button>
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
                No Basmati rice data found for {selectedCifDestination?.port || "selected destination"}
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
                    Export Prices (EX-MILL & FOB)
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
                    <div style={styles.headerCell}>
                      EX-MILL<br />
                      <span style={styles.subHeader}>India</span>
                    </div>
                    <div style={styles.headerCell}>FOB Price<br /><span style={styles.subHeader}>Mundra Port</span></div>
                    <div style={styles.headerCell}>
                      Get CIF Price
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
                            gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
                          }}
                        >
                          <div style={styles.qualityCell}>
                            <div style={styles.rowLabel}>{item.type}</div>
                          </div>
                          <div style={styles.packingCell}>
                            <div style={styles.packingValue}>{packing}</div>
                          </div>
                          {/* EX-MILL */}
                          <div style={styles.exMillCell}>
                            {currency === "INR" ? "₹" : getCurrencySymbol()}
                            {convertSinglePrice(item.Ex_Mill_Min, "INR")} -
                            {currency === "INR" ? "₹" : getCurrencySymbol()}
                            {convertSinglePrice(item.Ex_Mill_Max, "INR")}
                          </div>
                          <div style={styles.fobCell}>
                            <div style={styles.priceValue}>{currencySymbol}{item.fobPrice}</div>
                          </div>
                          <div style={styles.cifCell}>
                            <button
                              style={styles.whatsappButton}
                              onClick={() => handleGetCIFPrice(item)}
                            >
                              Get CIF Price
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </>
            )}

            {/* {processedCifData.basmati.length === 0 && processedCifData.nonBasmati.length === 0 && cifRatesData.length > 0 && (
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

                  const fobPrice = convertSinglePrice(fobUSD, item.Currency);
                  const cifMinPrice = convertSinglePrice(cifMinUSD, item.Currency);
                  const cifMaxPrice = convertSinglePrice(cifMaxUSD, item.Currency);

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
            )} */}
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
  exMillCell: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    color: "#FFD700",
    fontWeight: "700",
    fontSize: "14px",
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

  whatsappButton: {
    background: "transparent",
    color: "#FFD700",
    border: "1px solid #FFD700",
    padding: "6px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.3s ease",
  }, "&:hover": {
    background: "#FFD700",
    color: "#000",
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
    gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
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


export default Prices;