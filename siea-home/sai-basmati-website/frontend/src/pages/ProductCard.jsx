import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useCart } from '../contexts/CartContext.jsx';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';

const ProductCard = ({
  product,
  showBuyQuery,
  profile,
  showWarning,
  currency,
  getConversionRate,
  getCurrencySymbol
}) => {
  const { currentLang } = useLanguage();
  const { addToCart } = useCart();

  const [showCartModal, setShowCartModal] = useState(false);
  const [grades, setGrades] = useState([]);
  const [selectedGrade, setSelectedGrade] = useState('');
  const [quantity, setQuantity] = useState('5kg');
  const [gradePricePerKg, setGradePricePerKg] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);

  const productName =
    product.name?.[currentLang] ||
    product.name?.en ||
    product.variety ||
    'Unknown Product';

  const productDesc =
    product.desc?.[currentLang] ||
    product.desc?.en ||
    '';

  const productImage = product.image || './img/placeholder-rice.jpg';
  const productCategory = product.category || 'Rice';
  const productSpecs = product.specs || {};
  const productHSN = product.hsn || null;

  // Fetch grades from Firebase
  useEffect(() => {
    if (!product?.firebaseId) return;

    const gradesRef = ref(db, `products/${product.firebaseId}/grades`);
    const unsubscribe = onValue(gradesRef, (snap) => {
      if (snap.exists()) {
        const gradesData = snap.val();
        const gradesArray = Object.keys(gradesData).map(key => ({
          id: key,
          ...gradesData[key]
        }));
        const gradeNames = gradesArray.map(g => g.grade).filter(Boolean);
        setGrades(gradeNames);
      } else {
        setGrades([]);
      }
    });

    return () => unsubscribe();
  }, [product?.firebaseId]);

  // When grade changes, fetch its price (which is PER KG in Firebase)
  useEffect(() => {
    const fetchGradePrice = async () => {
      if (!selectedGrade || !product?.firebaseId) return;

      try {
        const gradesRef = ref(db, `products/${product.firebaseId}/grades`);
        const snap = await onValue(gradesRef, (snapshot) => {
          if (snapshot.exists()) {
            const gradesData = snapshot.val();
            const gradesArray = Object.keys(gradesData).map(key => ({
              id: key,
              ...gradesData[key]
            }));

            const selectedGradeObj = gradesArray.find(g =>
              g.grade && g.grade.toLowerCase() === selectedGrade.toLowerCase()
            );

            if (selectedGradeObj) {
              // price_inr is PER KG in Firebase (like ₹95 per kg)
              const pricePerKg = selectedGradeObj.price_inr || 0;
              setGradePricePerKg(pricePerKg);
            }
          }
        }, { onlyOnce: true });
      } catch (error) {
        console.error('Error fetching grade price:', error);
      }
    };

    fetchGradePrice();
  }, [selectedGrade, product?.firebaseId]);

  // Calculate total price when grade price or quantity changes
  useEffect(() => {
    if (!gradePricePerKg) {
      setTotalPrice(0);
      return;
    }

    let quantityInKg;
    if (quantity === '1ton') {
      quantityInKg = 1000; // 1 ton = 1000 kg
    } else {
      quantityInKg = parseInt(quantity.replace('kg', '')) || 0;
    }

    // Total = price per kg × quantity in kg
    const total = gradePricePerKg * quantityInKg;
    setTotalPrice(total);
  }, [gradePricePerKg, quantity]);

  const formatPriceWithCurrency = () => {
    if (!product.price || typeof product.price !== 'string') {
      return 'Price on request';
    }

    const numbers = product.price.match(/[\d,]+/g);
    if (!numbers || numbers.length < 2) return product.price;

    const [minStr, maxStr] = numbers;
    const minINR = parseInt(minStr.replace(/,/g, ''), 10);
    const maxINR = parseInt(maxStr.replace(/,/g, ''), 10);

    if (isNaN(minINR) || isNaN(maxINR)) return product.price;

    const rate = getConversionRate ? getConversionRate() : 1;
    const symbol = getCurrencySymbol ? getCurrencySymbol() : "₹";

    const minConverted = Math.round(minINR * rate);
    const maxConverted = Math.round(maxINR * rate);

    return `${symbol}${minConverted.toLocaleString()} – ${symbol}${maxConverted.toLocaleString()} / qtl`;
  };

  const displayPrice = formatPriceWithCurrency();

  const handleViewDetails = (e) => {
    e.stopPropagation();

    const productId = product.firebaseId || product.id;
    showBuyQuery(productId, "details"); // ✅ login unna / lekapoyina open
  };


  const handleAddToCart = (e) => {
    e.stopPropagation();
    if (!profile) {
      showWarning();
      return;
    }
    setShowCartModal(true);
  };

  const handleCartSubmit = () => {
    if (!selectedGrade) {
      alert('Please select a grade');
      return;
    }

    // Parse the quantity
    let quantityInKg;
    let quantityDisplay;
    if (quantity === '1ton') {
      quantityInKg = 1000;
      quantityDisplay = '1 ton';
    } else {
      quantityInKg = parseInt(quantity.replace('kg', '')) || 5;
      quantityDisplay = quantity;
    }

    const totalPriceForCart = gradePricePerKg * quantityInKg;

    // Prepare price string - SIMPLIFIED to avoid parsing issues
    const priceStr = `Total: ₹${totalPriceForCart.toFixed(2)} for ${quantityDisplay}`;

    // Create product with quantity in name for better display
    const productForCart = {
      ...product,
      name: {
        ...product.name,
        en: `${productName} - ${selectedGrade} (${quantityDisplay})`  // Added quantity to name
      }
    };

    // Add to cart with total price and quantity unit
    addToCart(
      productForCart,
      selectedGrade,
      1, // quantity count (1 cart item)
      '', // packing
      priceStr, // price description
      quantityDisplay, // quantity unit (e.g., "5kg", "1ton")
      totalPriceForCart // total price for this cart item
    );

    setShowCartModal(false);
    setSelectedGrade('');
    setQuantity('5kg');
    setGradePricePerKg(0);
    setTotalPrice(0);
    alert('✅ Product added to cart!');
  };

  const quantityOptions = ['5kg', '10kg', '25kg', '50kg', '100kg', '1ton'];

  // Calculate price per quintal from price per kg
  const pricePerQuintal = gradePricePerKg > 0 ? gradePricePerKg * 100 : 0;

  return (
    <>
      <div className="product-card glass">
        <img
          src={productImage}
          alt={productName}
          className="product-image"
          onError={(e) => {
            e.target.src = './img/placeholder-rice.jpg';
          }}
        />

        <div className="product-content">
          <h3 className="product-name">{productName}</h3>

          <p className="product-desc">{productDesc}</p>

          {productHSN && (
            <div className="product-hsn">
              <strong>HSN Code:</strong> {productHSN}
            </div>
          )}

          <div className="product-meta">
            {product.grade && <span className="product-grade">Grade: {product.grade}</span>}
            {product.origin && <span className="product-origin">Origin: {product.origin}</span>}
          </div>

          <div className="product-footer">
            <p className="product-price">{displayPrice}</p>

            <div className="product-footer-bottom">
              <span className="product-category">{productCategory}</span>

              <div className="tw-flex tw-gap-2">
                <button
                  className="btn-view-details"
                  onClick={handleAddToCart}
                >
                  Add to Cart
                </button>

                <button
                  className="btn-view-details"
                  onClick={handleViewDetails}
                >
                  View Details
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add to Cart Modal with Grade Selection and Quantity Options */}
      {showCartModal && (
        <div className="tw-fixed tw-inset-0 tw-bg-black/80 tw-backdrop-blur-sm tw-z-50 tw-flex tw-items-center tw-justify-center tw-p-4">
          <div className="tw-bg-gradient-to-br tw-from-gray-900 tw-to-black tw-rounded-2xl tw-border tw-border-yellow-400/30 tw-max-w-md tw-w-full">
            <div className="tw-p-6">
              <div className="tw-flex tw-justify-between tw-items-center tw-mb-6">
                <h3 className="tw-text-xl tw-font-bold tw-text-yellow-400">
                  Add to Cart
                </h3>
                <button
                  onClick={() => setShowCartModal(false)}
                  className="tw-text-gray-400 hover:tw-text-white"
                >
                  <svg className="tw-w-6 tw-h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="tw-flex tw-items-center tw-gap-4 tw-mb-6">
                <img
                  src={productImage}
                  alt={productName}
                  className="tw-w-16 tw-h-16 tw-object-cover tw-rounded-lg"
                  onError={(e) => {
                    e.target.src = './img/placeholder-rice.jpg';
                  }}
                />
                <div>
                  <h4 className="tw-text-lg tw-font-semibold tw-text-yellow-300">{productName}</h4>
                  <p className="tw-text-sm tw-text-yellow-200/80">{productCategory}</p>
                </div>
              </div>

              <div className="tw-space-y-4">
                <div>
                  <label className="tw-block tw-text-sm tw-font-medium tw-text-yellow-300 tw-mb-1">
                    Select Grade *
                  </label>
                  <select
                    value={selectedGrade}
                    onChange={(e) => setSelectedGrade(e.target.value)}
                    className="tw-w-full tw-bg-gray-800/50 tw-border tw-border-yellow-400/30 tw-rounded-lg tw-p-3 tw-text-white focus:tw-outline-none focus:tw-border-yellow-500"
                  >
                    <option value="">Choose Grade</option>
                    {grades.length > 0 ? (
                      grades.map((grade, index) => (
                        <option key={index} value={grade}>{grade}</option>
                      ))
                    ) : (
                      <>
                        <option value="Premium">Premium</option>
                        <option value="Standard">Standard</option>
                        <option value="Economy">Economy</option>
                      </>
                    )}
                  </select>
                </div>

                {selectedGrade && gradePricePerKg > 0 && (
                  <div className="tw-p-3 tw-bg-yellow-400/10 tw-border tw-border-yellow-400/20 tw-rounded-lg">
                    <p className="tw-text-sm tw-font-semibold tw-text-yellow-300">
                      Price: ₹{gradePricePerKg.toFixed(2)} per kg
                    </p>
                    <p className="tw-text-xs tw-text-yellow-200/70 tw-mt-1">
                      (₹{Math.round(pricePerQuintal).toLocaleString()} per quintal)
                    </p>
                  </div>
                )}

                <div>
                  <label className="tw-block tw-text-sm tw-font-medium tw-text-yellow-300 tw-mb-1">
                    Select Quantity *
                  </label>
                  <select
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="tw-w-full tw-bg-gray-800/50 tw-border tw-border-yellow-400/30 tw-rounded-lg tw-p-3 tw-text-white focus:tw-outline-none focus:tw-border-yellow-500"
                  >
                    <option value="">Select Quantity</option>
                    {quantityOptions.map((qty, index) => (
                      <option key={index} value={qty}>{qty}</option>
                    ))}
                  </select>
                </div>

                {totalPrice > 0 && (
                  <div className="tw-p-3 tw-bg-green-400/10 tw-border tw-border-green-400/20 tw-rounded-lg">
                    <p className="tw-text-sm tw-font-semibold tw-text-green-300">
                      Estimated Total: ₹{Math.round(totalPrice).toLocaleString()}
                    </p>
                    <p className="tw-text-xs tw-text-green-200/70 tw-mt-1">
                      For {quantity} of {selectedGrade}
                      {quantity === '1ton' && (
                        <span> (10 quintals)</span>
                      )}
                    </p>
                  </div>
                )}
              </div>

              <div className="tw-flex tw-gap-4 tw-mt-6">
                <button
                  onClick={() => setShowCartModal(false)}
                  className="tw-flex-1 tw-border tw-border-yellow-400 tw-text-yellow-400 tw-font-semibold tw-py-3 tw-px-4 tw-rounded-xl hover:tw-bg-yellow-400/10 tw-transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCartSubmit}
                  className="tw-flex-1 tw-bg-yellow-400 tw-text-black tw-font-bold tw-py-3 tw-px-4 tw-rounded-xl hover:tw-bg-yellow-500 tw-transition disabled:tw-opacity-50 disabled:tw-cursor-not-allowed"
                  disabled={!selectedGrade || !quantity}
                >
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProductCard;