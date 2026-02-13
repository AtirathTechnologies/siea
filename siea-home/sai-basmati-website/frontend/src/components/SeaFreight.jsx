// SeaFreight.jsx - COMPLETE (modified to return to previous page)
import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';
import { useNavigate } from 'react-router-dom';

const SeaFreight = () => {
    const [selectedRegion, setSelectedRegion] = useState(null);
    const [selectedCountry, setSelectedCountry] = useState(null);
    const [selectedPort, setSelectedPort] = useState(null);
    const [openRegions, setOpenRegions] = useState(false);
    const [openCountries, setOpenCountries] = useState(false);
    const [openPorts, setOpenPorts] = useState(false);
    const [freightData, setFreightData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    // Fetch freight data from Firebase
    useEffect(() => {
        const fetchFreightData = () => {
            try {
                const freightRef = ref(db, 'cifRates');

                const unsubscribe = onValue(freightRef, (snapshot) => {
                    if (snapshot.exists()) {
                        const data = snapshot.val();
                        const transformedData = transformFreightData(data);
                        setFreightData(transformedData);
                        setLoading(false);
                    } else {
                        setFreightData([]);
                        setLoading(false);
                    }
                }, (error) => {
                    console.error('Error fetching freight data:', error);
                    setError(error.message);
                    setLoading(false);
                });

                return unsubscribe;
            } catch (error) {
                console.error('Error in fetchFreightData:', error);
                setError(error.message);
                setLoading(false);
            }
        };

        fetchFreightData();
    }, []);

    // Transform Firebase data into the structure your component expects
    const transformFreightData = (firebaseData) => {
        const regionMap = new Map();

        const dataArray = Array.isArray(firebaseData)
            ? firebaseData
            : Object.values(firebaseData || {});

        dataArray.forEach((item) => {
            if (!item || !item.Region || !item.Country || !item['Destination Port']) return;

            const region = item.Region;
            const country = item.Country;
            const port = item['Destination Port'];
            const container = item.Container || 'N/A';
            const cifMin = item.Region_Grade_CIF_Min || 0;
            const cifMax = item.Region_Grade_CIF_Max || 0;

            if (!regionMap.has(region)) {
                regionMap.set(region, {
                    region,
                    countries: []
                });
            }

            const regionData = regionMap.get(region);

            let countryData = regionData.countries.find(c => c.name === country);
            if (!countryData) {
                countryData = {
                    name: country,
                    ports: []
                };
                regionData.countries.push(countryData);
            }

            if (!countryData.ports.some(p => p.name === port)) {
                countryData.ports.push({
                    name: port,
                    container: container,
                    originPort: item['Origin Port'],
                    grade: item.Grade,
                    cifMin: cifMin,
                    cifMax: cifMax,
                    cifSingle: item.CIF_USD || 0
                });
            }
        });

        const result = Array.from(regionMap.values())
            .map(region => ({
                ...region,
                countries: region.countries
                    .map(country => ({
                        ...country,
                        ports: country.ports.sort((a, b) => a.name.localeCompare(b.name))
                    }))
                    .sort((a, b) => a.name.localeCompare(b.name))
            }))
            .sort((a, b) => a.region.localeCompare(b.region));

        return result;
    };

    const handleRegionSelect = (region) => {
        setSelectedRegion(region);
        setSelectedCountry(null);
        setSelectedPort(null);
        setOpenRegions(false);
        setOpenCountries(true);
        setOpenPorts(false);
    };

    const handleCountrySelect = (country) => {
        setSelectedCountry(country);
        setSelectedPort(null);
        setOpenCountries(false);
        setOpenPorts(true);
    };

    // --- MODIFIED: return to the page stored in localStorage, DO NOT remove returnTo ---
    const handlePortSelect = (port) => {
        setSelectedPort(port);

        const destinationData = {
            region: selectedRegion,
            country: selectedCountry,
            port: port.name,
            container: port.container || "All Containers"
        };

        localStorage.setItem('selectedCifDestination', JSON.stringify(destinationData));
        localStorage.setItem('forceCurrencyToUSD', 'true');

        const returnTo = localStorage.getItem('seaFreightReturnTo');
        console.log('🔁 SeaFreight handlePortSelect');
        console.log('   returnTo from localStorage:', returnTo);

        if (returnTo) {
            console.log('   Navigating to:', returnTo);
            navigate(returnTo);
        } else {
            console.log('   No returnTo found, defaulting to /market-rates');
            navigate('/market-rates');
        }
    };

    if (loading) {
        return (
            <div style={styles.container}>
                <h1 style={styles.mainTitle}>Sea Freight Costs</h1>
                <div style={styles.loadingScreen}>
                    <div style={styles.loader}></div>
                    <span style={styles.loadingText}>Loading Freight Data...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={styles.container}>
                <h1 style={styles.mainTitle}>Sea Freight Costs</h1>
                <div style={styles.errorContainer}>
                    <p style={styles.errorMessage}>Error loading data: {error}</p>
                    <button
                        style={styles.retryButton}
                        onClick={() => window.location.reload()}
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <h1 style={styles.mainTitle}>Sea Freight Costs</h1>
            <p style={styles.subHeading}>Click a port to view CIF prices in USD for all rice varieties</p>

            <div style={styles.card}>
                {/* Dropdowns */}
                <div style={styles.dropdownContainer}>
                    {/* Region Dropdown */}
                    <div style={styles.dropdown}>
                        <button
                            style={{
                                ...styles.dropdownButton,
                                borderColor: openRegions ? '#FFD700' : '#333',
                                background: selectedRegion ? 'rgba(255, 215, 0, 0.1)' : '#111'
                            }}
                            onClick={() => setOpenRegions(!openRegions)}
                            disabled={freightData.length === 0}
                        >
                            <span>
                                {selectedRegion
                                    ? selectedRegion
                                    : freightData.length === 0
                                        ? 'No Data Available'
                                        : 'Select Region'
                                }
                            </span>
                            <span style={{ ...styles.chevronIcon, transform: openRegions ? 'rotate(180deg)' : 'none' }}>
                                ▼
                            </span>
                        </button>
                        {openRegions && freightData.length > 0 && (
                            <div style={styles.dropdownContent}>
                                {freightData.map((regionData) => (
                                    <button
                                        key={regionData.region}
                                        style={styles.dropdownItem}
                                        onClick={() => handleRegionSelect(regionData.region)}
                                    >
                                        {regionData.region}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Country Dropdown */}
                    <div style={styles.dropdown}>
                        <button
                            style={{
                                ...styles.dropdownButton,
                                borderColor: openCountries ? '#FFD700' : '#333',
                                background: selectedCountry ? 'rgba(255, 215, 0, 0.1)' : '#111'
                            }}
                            onClick={() => selectedRegion && setOpenCountries(!openCountries)}
                            disabled={!selectedRegion || freightData.length === 0}
                        >
                            <span>
                                {selectedCountry
                                    ? selectedCountry
                                    : 'Select Country'
                                }
                            </span>
                            <span style={{ ...styles.chevronIcon, transform: openCountries ? 'rotate(180deg)' : 'none' }}>
                                ▼
                            </span>
                        </button>
                        {openCountries && selectedRegion && freightData.length > 0 && (
                            <div style={styles.dropdownContent}>
                                {freightData
                                    .find((regionData) => regionData.region === selectedRegion)
                                    ?.countries.map((country) => (
                                        <button
                                            key={country.name}
                                            style={styles.dropdownItem}
                                            onClick={() => handleCountrySelect(country.name)}
                                        >
                                            {country.name}
                                        </button>
                                    ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Ports List */}
                <div style={styles.portsContainer}>
                    <div style={styles.countryContent}>
                        {selectedCountry ? (
                            <>
                                <h3 style={styles.countryHeading}>
                                    Ports in {selectedCountry}
                                    {selectedRegion && ` (${selectedRegion})`}
                                </h3>
                                <div style={styles.portList}>
                                    {freightData
                                        .find((regionData) => regionData.region === selectedRegion)
                                        ?.countries.find((country) => country.name === selectedCountry)
                                        ?.ports.map((port, index) => (
                                            <div
                                                key={`${port.name}-${index}`}
                                                style={styles.portListItem}
                                                onClick={() => handlePortSelect(port)}
                                            >
                                                <div style={styles.portListContent}>
                                                    <div style={styles.portNameContainer}>
                                                        <span style={styles.portListName}>{port.name}</span>
                                                    </div>
                                                    
                                                    <div style={styles.priceContainer}>
                                                        {port.cifMin > 0 && port.cifMax > 0 ? (
                                                            <span style={styles.cifPriceRange}>
                                                                ${port.cifMin.toLocaleString('en-IN')} - ${port.cifMax.toLocaleString('en-IN')}
                                                            </span>
                                                        ) : port.cifSingle > 0 ? (
                                                            <span style={styles.cifPriceSingle}>
                                                                ${port.cifSingle.toLocaleString('en-IN')}
                                                            </span>
                                                        ) : (
                                                            <span style={styles.cifPriceNA}>
                                                                Price on request
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </>
                        ) : (
                            <div style={styles.portPlaceholder}>
                                {freightData.length === 0
                                    ? 'No freight data available'
                                    : 'Select a region and country to view ports'
                                }
                            </div>
                        )}
                    </div>
                </div>
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
        marginBottom: "10px",
        color: "#FFD700",
    },

    subHeading: {
        textAlign: "center",
        fontSize: "14px",
        color: "#FFD700",
        marginBottom: "25px",
        opacity: 0.9,
    },

    card: {
        background: "#0d0d0d",
        padding: "clamp(14px, 4vw, 20px)",
        borderRadius: "15px",
        border: "1px solid #FFD700",
    },

    dropdownContainer: {
        display: "flex",
        gap: "12px",
        marginBottom: "25px",
        flexWrap: "wrap",
    },

    dropdown: {
        flex: "1",
        minWidth: "200px",
        position: "relative",
    },

    dropdownButton: {
        width: "100%",
        padding: "12px 15px",
        background: "#111",
        color: "#fff",
        border: "1px solid #333",
        borderRadius: "8px",
        textAlign: "left",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        cursor: "pointer",
        transition: "all 0.3s",
        fontSize: "14px",
        ':hover': {
            borderColor: "#FFD700",
        }
    },

    chevronIcon: {
        fontSize: "10px",
        color: "#FFD700",
        transition: "transform 0.3s",
    },

    dropdownContent: {
        position: "absolute",
        top: "100%",
        left: "0",
        right: "0",
        background: "#111",
        border: "1px solid #FFD700",
        borderRadius: "8px",
        marginTop: "5px",
        maxHeight: "300px",
        overflowY: "auto",
        zIndex: "1000",
        boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
    },

    dropdownItem: {
        width: "100%",
        padding: "10px 15px",
        textAlign: "left",
        background: "none",
        color: "#fff",
        border: "none",
        cursor: "pointer",
        transition: "background 0.2s",
        fontSize: "14px",
        ':hover': {
            background: "rgba(255, 215, 0, 0.1)",
        }
    },

    portsContainer: {
        background: "#1a1a1a",
        borderRadius: "12px",
        padding: "20px",
        borderLeft: "4px solid #FFD700",
    },

    countryContent: {
        display: "flex",
        flexDirection: "column",
    },

    countryHeading: {
        fontSize: "18px",
        color: "#FFD700",
        marginBottom: "20px",
        textAlign: "center",
    },

    portList: {
        display: "flex",
        flexDirection: "column",
        gap: "10px",
    },

    portListItem: {
        padding: "15px",
        background: "#1a1a1a",
        border: "1px solid #333",
        borderRadius: "8px",
        cursor: "pointer",
        transition: "all 0.2s",
        ':hover': {
            background: "rgba(255, 215, 0, 0.1)",
            borderColor: "#FFD700",
            transform: "translateX(5px)",
        }
    },

    portListContent: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "15px",
    },

    portNameContainer: {
        flex: "1",
    },

    portListName: {
        fontWeight: "600",
        color: "#fff",
        fontSize: "16px",
    },

    priceContainer: {
        textAlign: "right",
        minWidth: "150px",
    },

    cifPriceRange: {
        fontSize: "16px",
        color: "#FFD700",
        fontWeight: "600",
        whiteSpace: "nowrap",
    },

    cifPriceSingle: {
        fontSize: "16px",
        color: "#FFD700",
        fontWeight: "600",
        whiteSpace: "nowrap",
    },

    cifPriceNA: {
        fontSize: "14px",
        color: "#FFD700",
        fontStyle: "italic",
        whiteSpace: "nowrap",
    },

    portPlaceholder: {
        textAlign: "center",
        padding: "40px",
        color: "#FFD700",
        fontStyle: "italic",
        opacity: "0.7",
        fontSize: "16px",
    },

    loadingScreen: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        marginTop: "100px",
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
        marginTop: "15px",
        color: "#FFD700",
        fontSize: "16px",
    },

    errorContainer: {
        textAlign: "center",
        padding: "40px",
    },

    errorMessage: {
        color: "#ff6b6b",
        marginBottom: "20px",
        fontSize: "16px",
    },

    retryButton: {
        padding: "10px 20px",
        backgroundColor: "#FFD700",
        color: "#000",
        border: "none",
        borderRadius: "6px",
        cursor: "pointer",
        fontWeight: "600",
        fontSize: "14px",
        ':hover': {
            backgroundColor: "#e6c200",
        }
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
}

export default SeaFreight;