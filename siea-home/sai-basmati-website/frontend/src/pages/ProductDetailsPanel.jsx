import React, { useState, useEffect } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import { useCart } from "../contexts/CartContext.jsx";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";

const ProductDetailsPanel = ({
    product,
    allProducts,
    profile,  // This is the user profile prop
    onBack,
    onEnquire,
    onViewDetails,
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

    if (!product) return null;

    const name = product.name?.[currentLang] || product.name?.en;
    const desc = product.desc?.[currentLang] || product.desc?.en;
    const specs = product.specs || {};
    const hsn = product.hsn;
    const productImage = product.image || "./img/placeholder-rice.jpg";
    const productCategory = product.category || 'Rice';

    const relatedProducts = allProducts
        ?.filter(
            p =>
                p.category === product.category &&
                (p.firebaseId || p.id) !== (product.firebaseId || product.id)
        )
        .slice(0, 3);

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

    const formatPrice = () => {
        if (!product.price) return "Price on request";
        const nums = product.price.match(/[\d,]+/g);
        if (!nums || nums.length < 2) return product.price;

        const min = parseInt(nums[0].replace(/,/g, ""));
        const max = parseInt(nums[1].replace(/,/g, ""));
        const rate = getConversionRate();
        const symbol = getCurrencySymbol();

        return `${symbol}${Math.round(min * rate).toLocaleString()} – ${symbol}${Math.round(max * rate).toLocaleString()} / qtl`;
    };

    const handleCartSubmit = () => {
        // FIX: Check the profile prop, not product.profile
        if (!profile) {
            alert("⚠️ Please login to add items to cart");
            return;
        }

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
                en: `${name} - ${selectedGrade} (${quantityDisplay})`
            }
        };

        // Add to cart with total price and quantity unit
        addToCart(
            productForCart,
            selectedGrade,
            1,
            '',
            priceStr,
            quantityDisplay,
            totalPriceForCart
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
            <div className="tw-max-w-5xl tw-mx-auto tw-p-6 tw-bg-black/70 tw-backdrop-blur-xl tw-rounded-2xl tw-border tw-border-yellow-400/30">

                {/* Back */}
                <button
                    onClick={onBack}
                    className="tw-text-yellow-300 tw-mb-6 hover:tw-underline"
                >
                    ← Back to Products
                </button>

                {/* MAIN SECTION */}
                <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-8 tw-items-start">

                    {/* IMAGE CARD */}
                    <div className="tw-bg-black/50 tw-p-4 tw-rounded-xl tw-border tw-border-yellow-400/20">
                        <img
                            src={productImage}
                            alt={name}
                            className="tw-w-full tw-h-[260px] tw-object-cover tw-rounded-lg"
                            onError={(e) => {
                                e.target.src = './img/placeholder-rice.jpg';
                            }}
                        />

                        {/* Buttons BELOW IMAGE */}
                        <div className="tw-mt-5 tw-flex tw-justify-center tw-space-x-4">
                            <button
                                onClick={onEnquire}
                                className="tw-bg-yellow-400 tw-text-black tw-font-bold tw-px-8 tw-py-3 tw-rounded-xl tw-text-base hover:tw-scale-105 tw-transition"
                            >
                                Enquire Now
                            </button>

                            {/* Add to Cart Button */}
                            <button
                                onClick={() => {
                                    // FIX: Check the profile prop, not product.profile
                                    if (!profile) {
                                        alert("⚠️ Please login to add products to cart");
                                        return;
                                    }
                                    setShowCartModal(true);
                                }}
                                className="tw-bg-blue-500 tw-text-white tw-font-bold tw-px-8 tw-py-3 tw-rounded-xl"
                            >
                                Add to Cart
                            </button>

                        </div>
                    </div>

                    {/* DETAILS */}
                    <div>
                        <h1 className="tw-text-2xl tw-font-extrabold tw-text-yellow-400">
                            {name}
                        </h1>

                        {/* Price Badge */}
                        <div className="tw-inline-block tw-bg-yellow-400/10 tw-text-yellow-300 tw-px-3 tw-py-1 tw-rounded-lg tw-text-sm tw-font-semibold tw-mt-2">
                            {formatPrice()}
                        </div>

                        <p className="tw-text-sm tw-text-yellow-200 tw-mt-4 tw-leading-relaxed">
                            {desc}
                        </p>

                        {/* SPECIFICATIONS */}
                        {Object.keys(specs).length > 0 && (
                            <div className="tw-mt-6">
                                <h3 className="tw-text-base tw-font-semibold tw-text-yellow-400 tw-mb-3">
                                    Product Specifications
                                </h3>

                                <div className="tw-grid tw-grid-cols-2 tw-gap-y-2 tw-text-sm">
                                    {Object.entries(specs).map(([key, value]) => (
                                        <React.Fragment key={key}>
                                            <div className="tw-text-yellow-300 capitalize">
                                                {key.replace(/([A-Z])/g, " $1")}
                                            </div>
                                            <div className="tw-text-yellow-100">
                                                {value}
                                            </div>
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* HSN */}
                        {hsn && (
                            <div className="tw-mt-4 tw-text-sm tw-text-yellow-300">
                                <strong>HSN Code:</strong> {hsn}
                            </div>
                        )}
                    </div>
                </div>

                {/* RELATED PRODUCTS */}
                {relatedProducts?.length > 0 && (
                    <div className="tw-mt-12 tw-bg-black/50 tw-rounded-xl tw-p-5 tw-border tw-border-yellow-400/20">
                        <h3 className="tw-text-lg tw-font-semibold tw-text-yellow-400 tw-mb-5 tw-text-center">
                            Related Products
                        </h3>

                        <div className="tw-grid tw-grid-cols-1 sm:tw-grid-cols-3 tw-gap-5">
                            {relatedProducts.map(rp => (
                                <div
                                    key={rp.firebaseId || rp.id}
                                    className="tw-bg-black/60 tw-rounded-xl tw-p-3 tw-border tw-border-yellow-400/20 hover:tw-border-yellow-400 hover:tw-scale-105 tw-transition cursor-pointer"
                                    onClick={() => onViewDetails(rp)}
                                >
                                    <img
                                        src={rp.image || "./img/placeholder-rice.jpg"}
                                        alt={rp.name?.en}
                                        className="tw-w-full tw-h-32 tw-object-cover tw-rounded-lg"
                                        onError={(e) => {
                                            e.target.src = './img/placeholder-rice.jpg';
                                        }}
                                    />

                                    <h4 className="tw-text-sm tw-font-semibold tw-text-yellow-300 tw-mt-2">
                                        {rp.name?.en}
                                    </h4>

                                    <p className="tw-text-xs tw-text-yellow-200">
                                        {rp.desc?.en}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>

            {/* Add to Cart Modal with Grade Selection and Quantity Options - SAME AS ProductCard */}
            {showCartModal && (
                <div className="tw-fixed tw-inset-0 tw-bg-black/80 tw-backdrop-blur-sm tw-z-50 tw-flex tw-items-center tw-justify-center tw-p-4">
                    <div className="tw-bg-gradient-to-br tw-from-gray-900 tw-to-black tw-rounded-2xl tw-border tw-border-yellow-400/30 tw-max-w-md tw-w-full tw-max-h-[90vh] tw-overflow-hidden">
                        <div className="tw-p-6 tw-max-h-[calc(90vh-2rem)] tw-overflow-y-auto [&::-webkit-scrollbar]:tw-w-2 [&::-webkit-scrollbar-track]:tw-bg-gray-900 [&::-webkit-scrollbar-thumb]:tw-bg-yellow-500/50 [&::-webkit-scrollbar-thumb]:tw-rounded-full hover:[&::-webkit-scrollbar-thumb]:tw-bg-yellow-500/70">
                            <div className="tw-flex tw-justify-between tw-items-center tw-mb-6">
                                <h3 className="tw-text-xl tw-font-bold tw-text-yellow-400">
                                    Add to Cart
                                </h3>
                                <button
                                    onClick={() => setShowCartModal(false)}
                                    className="tw-text-gray-400 hover:tw-text-white tw-flex-shrink-0"
                                >
                                    <svg className="tw-w-6 tw-h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="tw-flex tw-items-center tw-gap-4 tw-mb-6">
                                <img
                                    src={productImage}
                                    alt={name}
                                    className="tw-w-16 tw-h-16 tw-object-cover tw-rounded-lg tw-flex-shrink-0"
                                    onError={(e) => {
                                        e.target.src = './img/placeholder-rice.jpg';
                                    }}
                                />
                                <div>
                                    <h4 className="tw-text-lg tw-font-semibold tw-text-yellow-300">{name}</h4>
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

export default ProductDetailsPanel;