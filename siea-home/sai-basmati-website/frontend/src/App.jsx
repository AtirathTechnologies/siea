import React, { useState, useEffect, Suspense, lazy } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { LanguageProvider } from "./contexts/LanguageContext";
import { CartProvider } from "./contexts/CartContext.jsx";
import Navbar from "./components/Navbar";
import NavbarProd from "./components/NavbarProd";
import Footer from "./components/Footer";
import GoldenRiceAnimation from "./components/GoldenRiceAnimation";
import Logo from "./assets/logo.svg";
import ProfilePanel from "./components/ProfilePanel";
import ProtectedAdminRoute from "./admin/ProtectedAdminRoute";
import AdminLayout from "./admin/AdminLayout";
import AdminMarketPrices from "./admin/AdminMarketPrices";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebase";
import { ref, onValue, off } from "firebase/database";
import PrivacyPolicy from "./components/PrivacyPolicy.jsx";
import TermsAndConditions from "./components/TermsandConditions.jsx";
import ShippingPolicy from "./components/ShippingPolicy.jsx";
const Home = lazy(() => import("./pages/Home"));
const Products = lazy(() => import("./pages/Products"));
const Prices = lazy(() => import("./pages/Prices"));
const About = lazy(() => import("./pages/About"));
const Feedback = lazy(() => import("./pages/Feedback"));
const JoinUs = lazy(() => import("./pages/JoinUs"));
const Cart = lazy(() => import("./pages/Cart.jsx"));
const Register = lazy(() => import("./components/Register"));
const Login = lazy(() => import("./components/Login"));
const ProductApp = lazy(() => import("./components/ProductApp"));
const Contact = lazy(() => import("./components/Contact"));
const Service = lazy(() => import("./components/Service"));
const Blog = lazy(() => import("./components/Blog"));
const Transport = lazy(() => import("./components/Transport"));
const ForgotPassword = lazy(() => import("./components/ForgotPassword"));
const SeaFreight = lazy(() => import("./components/SeaFreight"));
const SampleCourierService = lazy(() => import("./components/SampleCourierService"));
const Dashboard = lazy(() => import("./admin/pages/Dashboard"));
const Users = lazy(() => import("./admin/pages/Users"));
const ProductsAdmin = lazy(() => import("./admin/pages/Products"));
const Orders = lazy(() => import("./admin/pages/Orders"));
const Services = lazy(() => import("./admin/pages/Services"));
const PendingQuotes = lazy(() => import("./admin/pages/PendingQuotes"));
const TodaysOrders = lazy(() => import("./admin/pages/TodaysOrders"));
const History = lazy(() => import("./admin/pages/History"));
const CIFRatesAdmin = lazy(() => import("./admin/pages/CIFRatesAdmin.jsx"));
const ExchangeRatesAdmin = lazy(() => import("./admin/pages/ExchangeRatesAdmin.jsx"));





// App.jsx – inside component body, before return
function ScrollController() {
  const location = useLocation();

  useEffect(() => {
    // 1. Tell the browser not to restore scroll position
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    // 2. Helper to scroll all potential containers
    const scrollAllToTop = () => {
      // Scroll the window itself (may not be enough, but safe)
      window.scrollTo(0, 0);

      // If the products container exists, scroll it
      const productsContainer = document.querySelector('.products-container');
      if (productsContainer) {
        productsContainer.scrollTop = 0;
      }

      // If the main element has its own scroll, scroll it
      const mainElement = document.querySelector('main');
      if (mainElement && mainElement.scrollTop !== undefined) {
        mainElement.scrollTop = 0;
      }

      // Add any other containers you know of (e.g., .sea-freight-container)
    };

    // 3. Handle hash links (smooth scroll to element)
    if (location.hash) {
      const id = location.hash.replace('#', '');
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          const offset = id === 'footer' ? document.body.scrollHeight : element.offsetTop - 100;
          window.scrollTo({ top: offset, behavior: 'smooth' });
        }
      }, 100);
    } else {
      // No hash: scroll to top after the DOM has updated
      requestAnimationFrame(() => {
        scrollAllToTop();
      });
    }
  }, [location]); // runs on every route change

  return null;
}

const isValidFirebaseUid = (uid) => uid && !/[@.#$\[\]]/.test(uid);

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [profile, setProfile] = useState(() => {
    try {
      const savedProfile = localStorage.getItem("profile");
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        console.log("Loaded profile from localStorage:", {
          hasAvatar: !!parsed?.avatar,
          avatarLength: parsed?.avatar?.length,
          name: parsed?.fullName || parsed?.displayName
        });
        return parsed;
      }
      return null;
    } catch (error) {
      console.error("Error parsing saved profile:", error);
      return null;
    }
  });

  const [showWarningPopup, setShowWarningPopup] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);

  const isAdminDashboard = location.pathname.startsWith("/admin");

  // Sync profile with localStorage when profile changes
  useEffect(() => {
    console.log("Profile state updated:", {
      hasProfile: !!profile,
      hasAvatar: !!profile?.avatar,
      avatarPreview: profile?.avatar?.substring(0, 30) + "..."
    });

    try {
      if (profile) {
        localStorage.setItem("profile", JSON.stringify(profile));
      } else {
        localStorage.removeItem("profile");
      }
    } catch (error) {
      console.error("Error saving profile to localStorage:", error);
    }
  }, [profile]);

  // Listen for auth state changes
  useEffect(() => {
    let isMounted = true;
    let dbListenerUnsubscribe = null;

    const unsub = onAuthStateChanged(auth, (user) => {
      if (!isMounted) return;

      if (!user) {
        console.log("No user logged in, clearing profile");
        setProfile(null);
        localStorage.removeItem("profile");
        localStorage.removeItem("isAdmin");
      } else {
        console.log("User authenticated:", user.email);

        if (isValidFirebaseUid(user.uid)) {
          const usersRef = ref(db, "users");

          if (dbListenerUnsubscribe) {
            dbListenerUnsubscribe();
          }

          dbListenerUnsubscribe = onValue(usersRef, (snapshot) => {
            if (!isMounted) return;

            const users = snapshot.val() || {};
            let userData = null;

            Object.keys(users).forEach((key) => {
              if (users[key].uid === user.uid) {
                userData = {
                  uid: user.uid,
                  email: user.email,
                  displayName: user.displayName || user.email?.split("@")[0],
                  photoURL: user.photoURL,
                  ...users[key],
                  customId: key
                };
              }
            });

            if (userData) {
              setProfile(userData);
              localStorage.setItem("profile", JSON.stringify(userData));

              // 🔥 Check Admin from "admins" node
              const adminRef = ref(db, "admins/" + user.uid);

              onValue(adminRef, (adminSnap) => {
                const isAdminUser = adminSnap.exists();

                if (isAdminUser && !location.pathname.startsWith("/admin")) {
                  navigate("/admin/dashboard", { replace: true });
                }
              }, { onlyOnce: true });
            } else if (user.email === "admin@gmail.com") {
              console.log("Setting default admin profile");
              const defaultProfile = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || user.email?.split("@")[0],
                photoURL: user.photoURL || "",
                isDefaultAdmin: true
              };
              setProfile(defaultProfile);
              localStorage.setItem("profile", JSON.stringify(defaultProfile));
            } else {
              // User authenticated but not in database yet
              console.log("User not found in database, creating minimal profile");
              const minimalProfile = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || user.email?.split("@")[0],
                photoURL: user.photoURL || "",
                fullName: user.displayName || ""
              };
              setProfile(minimalProfile);
              localStorage.setItem("profile", JSON.stringify(minimalProfile));
            }
          });
        } else {
          // Invalid UID format
          console.log("Invalid UID format, using auth data only");
          const authProfile = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email?.split("@")[0],
            photoURL: user.photoURL || "",
            isDefaultAdmin: user.email === "admin@gmail.com"
          };
          setProfile(authProfile);
          localStorage.setItem("profile", JSON.stringify(authProfile));
        }
      }
    });

    return () => {
      isMounted = false;
      unsub();
      if (dbListenerUnsubscribe) {
        dbListenerUnsubscribe();
      }
    };
  }, [navigate, location.pathname]);

  // Load profile from localStorage on mount
  useEffect(() => {
    const savedProfile = localStorage.getItem("profile");
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        console.log("Initial localStorage profile load:", {
          name: parsed.fullName || parsed.displayName,
          hasAvatar: !!parsed.avatar
        });

        if (parsed.uid && isValidFirebaseUid(parsed.uid) && !parsed.avatar) {
          const usersRef = ref(db, "users");
          const quickCheck = onValue(usersRef, (snapshot) => {
            const users = snapshot.val() || {};
            Object.keys(users).forEach((key) => {
              if (users[key].uid === parsed.uid && users[key].avatar) {
                console.log("Found avatar in Firebase for cached user");
                const updatedProfile = {
                  ...parsed,
                  avatar: users[key].avatar,
                  customId: key
                };
                setProfile(updatedProfile);
                localStorage.setItem("profile", JSON.stringify(updatedProfile));
              }
            });
            off(usersRef, "value", quickCheck);
          });
        }
      } catch (error) {
        console.error("Error in initial profile load:", error);
      }
    }
  }, []);

  // Add cross-tab synchronization
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'profile' && !e.newValue && profile) {
        console.log('Profile cleared in another tab, updating');
        setProfile(null);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [profile]);

  // Enhanced logout function
  const handleLogout = async () => {
    console.log("Logging out...");

    try {
      // Sign out from Firebase
      await auth.signOut();
      console.log("Firebase sign out successful");
    } catch (error) {
      console.error("Firebase sign out error:", error);
    }

    // Clear all state
    setProfile(null);

    // Clear ALL localStorage items
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.includes('profile') || key.includes('auth') || key.includes('user') || key.includes('firebase') || key.includes('admin')) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log("Removed from localStorage:", key);
    });

    // Clear sessionStorage
    sessionStorage.clear();

    // Clear cookies
    document.cookie.split(";").forEach(function (c) {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });

    // Navigate to home
    navigate("/");

    // Force full page reload after a short delay
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  const openProfilePanel = () => {
    if (!profile) {
      setShowWarningPopup(true);
      return;
    }
    setIsProfileOpen(true);
  };

  const closeProfilePanel = () => setIsProfileOpen(false);
  const closeWarningPopup = () => setShowWarningPopup(false);

  const showWarning = () => setShowWarningPopup(true);

  const searchProducts = (value) => {
    setSearchQuery(value);
  };

  const goHome = () => navigate("/");
  const isProductsPage =
    location.pathname === "/Products-All" ||
    location.pathname === "/transport" ||
    location.pathname === "/sea-freight" ||
    location.pathname === "/cart";

  return (
    <LanguageProvider>
      <CartProvider>
        <div className="tw-relative tw-min-h-screen tw-flex tw-flex-col">
          <div className="tw-fixed tw-inset-0 -tw-z-10">
            <GoldenRiceAnimation />
          </div>
          <div className="tw-fixed tw-inset-0 tw-flex tw-items-center tw-justify-center -tw-z-10 pointer-events-none">
            <img
              src={Logo}
              alt="Company Logo"
              className="tw-w-72 tw-h-72 md:tw-w-[28rem] md:tw-h-[28rem] lg:tw-w-[34rem] lg:tw-h-[34rem] tw-opacity-90"
            />
          </div>
          <div className="tw-flex tw-flex-col tw-min-h-screen tw-backdrop-blur-sm tw-bg-black/20 tw-text-white">
            {!isAdminDashboard && (
              <>
                {isProductsPage ? (
                  <div className="tw-fixed tw-top-0 tw-left-0 tw-right-0 tw-h-[60px] tw-z-50 tw-bg-[#111111]">
                    <NavbarProd
                      profile={profile}
                      handleLogout={handleLogout}
                      searchProducts={searchProducts}
                      showProductsPage={() => navigate("/Products-All")}
                      showProfilePanel={openProfilePanel}
                      goHome={goHome}
                      isNavOpen={isNavOpen}
                      toggleNav={setIsNavOpen}
                    />
                  </div>
                ) : (
                  <Navbar
                    profile={profile}
                    setProfile={setProfile}
                    handleLogout={handleLogout}
                    onProfileClick={openProfilePanel}
                  />
                )}
                {isProductsPage && (
                  <div
                    className={`navbar-menu-backdrop ${isNavOpen ? "open" : ""}`}
                    onClick={() => setIsNavOpen(false)}
                  />
                )}
              </>
            )}
            {showWarningPopup && (
              <>
                <div
                  className="tw-fixed tw-inset-0 tw-bg-black/60 tw-z-45"
                  onClick={closeWarningPopup}
                />
                <div
                  className="tw-fixed tw-z-50 tw-bg-white/10 tw-backdrop-blur-md tw-text-white tw-p-6 tw-rounded-2xl tw-shadow-2xl tw-max-w-md tw-w-11/12 tw-mx-auto tw-border tw-border-white/20"
                  style={{ top: "90px", left: "50%", transform: "translateX(-50%)" }}
                >
                  <div className="tw-text-center tw-text-xl tw-font-bold tw-mb-4 tw-text-red-400">
                    Warning
                  </div>
                  <div className="tw-text-center tw-mb-6 tw-text-red-600 tw-font-bold">
                    Please log in to access product details.
                  </div>
                  <div className="tw-flex tw-justify-center tw-space-x-8">
                    <button
                      className="tw-bg-blue-600 tw-hover:bg-blue-700 tw-text-white tw-py-3 tw-px-6 tw-rounded-xl"
                      onClick={() => {
                        closeWarningPopup();
                        navigate("/login");
                      }}
                    >
                      Login
                    </button>
                    <button
                      className="tw-bg-gray-600 tw-hover:bg-gray-700 tw-text-white tw-py-3 tw-px-6 tw-rounded-xl"
                      onClick={closeWarningPopup}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </>
            )}
            <ScrollController />
            <main className={`tw-flex-1 ${isProductsPage && !isAdminDashboard ? "tw-pt-[60px]" : ""}`}>
              <Suspense fallback={
                <div className="tw-flex tw-justify-center tw-items-center tw-h-40">
                  <div className="tw-text-yellow-400">Loading Page...</div>
                </div>
              }>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/products" element={<Products />} />
                  <Route path="/market-rates" element={<Prices />} />
                  <Route path="/feedback" element={<Feedback />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/Products-All" element={<ProductApp profile={profile} setProfile={setProfile} showWarning={showWarning} searchQuery={searchQuery} />} />
                  <Route path="/register" element={<Register setProfile={setProfile} />} />
                  <Route path="/login" element={<Login setProfile={setProfile} />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/service" element={<Service />} />
                  <Route path="/sample-courier" element={<SampleCourierService />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/transport" element={<Transport />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/sea-freight" element={<SeaFreight />} />
                  <Route path="/join-us" element={<JoinUs />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/terms" element={<TermsAndConditions />} />
                  <Route path="/shipping-policy" element={<ShippingPolicy />} />
                  <Route
                    path="/admin/*"
                    element={
                      <ProtectedAdminRoute>
                        <AdminLayout handleLogout={handleLogout} />
                      </ProtectedAdminRoute>
                    }
                  >
                    <Route index element={<Dashboard />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="users" element={<Users />} />
                    <Route path="products" element={<ProductsAdmin />} />
                    <Route path="market-prices" element={<AdminMarketPrices />} />
                    <Route path="exchange-rates" element={<ExchangeRatesAdmin />} />
                    <Route path="cif-rates" element={<CIFRatesAdmin />} />
                    <Route path="orders" element={<Orders />} />
                    <Route path="services" element={<Services />} />
                    <Route path="pending-quotes" element={<PendingQuotes />} />
                    <Route path="todays-orders" element={<TodaysOrders />} />
                    <Route path="history" element={<History />} />
                  </Route>
                </Routes>
              </Suspense>
            </main>

            {!isAdminDashboard && <Footer />}

            {profile && !isAdminDashboard && (
              <ProfilePanel
                isOpen={isProfileOpen}
                profile={profile}
                setProfile={setProfile}
                onClose={closeProfilePanel}
                onLogout={handleLogout}
              />
            )}
          </div>
        </div>
      </CartProvider>
    </LanguageProvider>
  );
}