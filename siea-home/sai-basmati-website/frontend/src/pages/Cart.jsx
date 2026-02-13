import React, { useState, useEffect, useCallback } from 'react';
import { useCart } from '../contexts/CartContext.jsx';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { getCartWithLivePrices, saveCartOrder } from '../firebase';
import BuyModal from './BuyModal';
import ThankYouPopup from '../components/ThankYouPopup';

const Cart = () => {
  const { t } = useLanguage();
  const { cartItems, removeFromCart, updateQuantity, clearCart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [liveCartData, setLiveCartData] = useState({
    items: [],
    subtotal: 0,
    itemCount: 0,
    formattedSubtotal: '₹0',
    totalBags: 0
  });
  const [profile, setProfile] = useState(null);
  const [showThankYou, setShowThankYou] = useState(false);
  const [localCartItems, setLocalCartItems] = useState([]);

  // ---------- AUTO‑REOPEN MODAL AFTER SEAFREIGHT ----------
  useEffect(() => {
    const checkAndOpenModal = () => {
      const modalData = localStorage.getItem('seaFreightModalData');
      const returnTo = localStorage.getItem('seaFreightReturnTo');
      const normalizedPath = window.location.pathname.replace(/\/$/, '');

      if (modalData && returnTo === normalizedPath) {
        try {
          const data = JSON.parse(modalData);
          if (data.cartItems) {
            setLocalCartItems(data.cartItems);
          }
        } catch (e) {
          console.error('Error parsing seaFreightModalData:', e);
        }
        
        setShowBuyModal(true);
        localStorage.removeItem('seaFreightModalData');
        // seaFreightReturnTo will be removed by BuyModal
      }
    };

    checkAndOpenModal();

    const handleStorageChange = (e) => {
      if (e.key === 'seaFreightReturnTo' || e.key === 'seaFreightModalData') {
        checkAndOpenModal();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [location.pathname]);

  // Load profile from localStorage
  useEffect(() => {
    const storedProfile = localStorage.getItem('profile');
    if (storedProfile) {
      try {
        setProfile(JSON.parse(storedProfile));
      } catch (error) {
        console.error('Error parsing profile:', error);
      }
    }
  }, []);

  // Initialize local cart items with numberOfBags
  useEffect(() => {
    const itemsWithBags = cartItems.map(item => ({
      ...item,
      numberOfBags: item.numberOfBags || 1
    }));
    setLocalCartItems(itemsWithBags);
  }, [cartItems]);

  // Calculate cart data whenever local cart items change
  useEffect(() => {
    const calculateCartData = async () => {
      if (localCartItems.length === 0) {
        setLiveCartData({
          items: [],
          subtotal: 0,
          itemCount: 0,
          formattedSubtotal: '₹0',
          totalBags: 0
        });
        return;
      }

      setIsLoadingPrices(true);

      try {
        const itemsWithTotalPrice = localCartItems.filter(item => item.totalPrice && !isNaN(item.totalPrice));
        const itemsWithoutTotalPrice = localCartItems.filter(
          item =>
            (!item.totalPrice || isNaN(item.totalPrice)) &&
            typeof item.grade === 'string'
        );

        let allItems = [];

        // Process items with totalPrice
        const processedItemsWithTotal = itemsWithTotalPrice.map(item => {
          const isTotalPriceItem = item.isTotalPriceItem ||
            (typeof item.price === 'string' && item.price.toLowerCase().includes('total:'));

          const numberOfBags = item.numberOfBags || 1;
          const pricePerBag = item.totalPrice || 0;
          const subtotal = pricePerBag * numberOfBags;

          return {
            ...item,
            displayPrice: pricePerBag,
            subtotal: subtotal,
            priceUpdated: false,
            isTotalPriceItem: isTotalPriceItem,
            pricePerBag: pricePerBag,
            totalPriceForItem: subtotal
          };
        });

        // Process items without totalPrice
        if (itemsWithoutTotalPrice.length > 0) {
          try {
            const cartWithPrices = await getCartWithLivePrices(itemsWithoutTotalPrice);

            const updatedCartWithPrices = cartWithPrices.items.map(item => {
              const originalItem = itemsWithoutTotalPrice.find(i =>
                i.id === item.id && i.grade === item.grade
              );
              const numberOfBags = originalItem?.numberOfBags || 1;
              const pricePerBag = item.displayPrice || 0;
              const subtotal = pricePerBag * numberOfBags;

              return {
                ...item,
                numberOfBags: numberOfBags,
                displayPrice: pricePerBag,
                subtotal: subtotal,
                pricePerBag: pricePerBag,
                totalPriceForItem: subtotal
              };
            });

            allItems = [...processedItemsWithTotal, ...updatedCartWithPrices];
          } catch (error) {
            console.error('Error fetching live prices:', error);
            const fallbackItems = itemsWithoutTotalPrice.map(item => {
              const numberOfBags = item.numberOfBags || 1;
              let pricePerBag = 0;

              if (typeof item.price === 'string') {
                const priceMatch = item.price.match(/₹\s*([\d,]+\.?\d*)/);
                if (priceMatch) {
                  pricePerBag = parseFloat(priceMatch[1].replace(/,/g, '')) || 0;
                }
              }

              const subtotal = pricePerBag * (item.quantity || 1) * numberOfBags;

              return {
                ...item,
                displayPrice: pricePerBag,
                subtotal,
                priceUpdated: false,
                isTotalPriceItem: false,
                pricePerBag: pricePerBag,
                totalPriceForItem: subtotal
              };
            });
            allItems = [...processedItemsWithTotal, ...fallbackItems];
          }
        } else {
          allItems = processedItemsWithTotal;
        }

        // Calculate totals
        const subtotal = allItems.reduce((sum, item) => sum + (item.subtotal || 0), 0);
        const itemCount = allItems.reduce((sum, item) => sum + ((item.quantity || 0) * (item.numberOfBags || 1)), 0);
        const totalBags = allItems.reduce((sum, item) => sum + (item.numberOfBags || 1), 0);

        setLiveCartData({
          items: allItems,
          subtotal,
          itemCount,
          totalBags,
          formattedSubtotal: new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }).format(subtotal)
        });

      } catch (error) {
        console.error('Error processing cart:', error);
        const subtotal = localCartItems.reduce((sum, item) => {
          const pricePerBag = item.totalPrice || item.displayPrice || 0;
          const numberOfBags = item.numberOfBags || 1;
          return sum + (pricePerBag * numberOfBags);
        }, 0);

        const itemCount = localCartItems.reduce((sum, item) =>
          sum + ((item.quantity || 0) * (item.numberOfBags || 1)), 0);

        const totalBags = localCartItems.reduce((sum, item) => sum + (item.numberOfBags || 1), 0);

        setLiveCartData({
          items: localCartItems.map(item => ({
            ...item,
            numberOfBags: item.numberOfBags || 1,
            displayPrice: item.totalPrice || item.displayPrice || 0,
            subtotal: (item.totalPrice || item.displayPrice || 0) * (item.numberOfBags || 1),
            priceUpdated: false,
            isTotalPriceItem: item.totalPrice ? true : false,
            pricePerBag: item.totalPrice || item.displayPrice || 0,
            totalPriceForItem: (item.totalPrice || item.displayPrice || 0) * (item.numberOfBags || 1)
          })),
          subtotal,
          itemCount,
          totalBags,
          formattedSubtotal: new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }).format(subtotal)
        });
      } finally {
        setIsLoadingPrices(false);
      }
    };

    calculateCartData();
  }, [localCartItems]);

  // Function to update number of bags for a specific item
  const updateNumberOfBags = useCallback((itemId, grade, newNumberOfBags) => {
    if (newNumberOfBags < 1) newNumberOfBags = 1;
    if (newNumberOfBags > 100) newNumberOfBags = 100;

    setLocalCartItems(prevItems =>
      prevItems.map(item => {
        if (item.id === itemId && item.grade === grade) {
          return {
            ...item,
            numberOfBags: newNumberOfBags
          };
        }
        return item;
      })
    );
  }, []);

  // Format price function
  const formatPrice = useCallback((price) => {
    if (price === undefined || price === null || isNaN(price)) return 'Price on request';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  }, []);

  // Custom submit handler for cart orders (passed to BuyModal)
  const handleCartSubmit = async (formData) => {
    setIsSubmitting(true);

    try {
      // Prepare cart items for saving
      const cartItemsToSave = liveCartData.items.map(item => ({
        ...item,
        totalPrice: item.totalPriceForItem || item.subtotal || 0
      }));

      // Calculate total bags from all items
      const totalBagsFromItems = liveCartData.totalBags;

      // Save cart order to Firebase
      const result = await saveCartOrder(cartItemsToSave, {
        fullName: formData.fullName || '',
        email: formData.email || '',
        phone: formData.phone || '',
        street: formData.street || '',
        city: formData.city || '',
        state: formData.state || '',
        country: formData.addressCountry || 'India',
        pincode: formData.pincode || '',
        notes: formData.additionalInfo || '',
        packing: formData.packing || '',
        port: formData.port || '',
        cif: formData.cif || 'No',
        currency: formData.currency || 'INR',
        customLogo: formData.customLogo || 'No',
        numberOfBags: totalBagsFromItems || formData.numberOfBags || 1,
        cartSubtotal: liveCartData.subtotal
      });

      console.log('Cart order saved with ID:', result.orderId);

      // Prepare detailed WhatsApp message
      const message = `*🛒 NEW CART ORDER - ${result.orderId}*\n\n` +
        `*Customer Information:*\n` +
        `👤 Name: ${formData.fullName}\n` +
        `📧 Email: ${formData.email}\n` +
        `📞 Phone: ${formData.phone}\n` +
        `📍 Address: ${formData.street}, ${formData.city}, ${formData.addressState} - ${formData.pincode}\n` +
        `🌍 Country: ${formData.addressCountry}\n\n` +
        `*Order Details:*\n` +
        `📦 Order Type: Shopping Cart\n` +
        `📊 Total Items: ${liveCartData.itemCount}\n` +
        `🛍️ Total Bags: ${totalBagsFromItems}\n` +
        `💰 Cart Subtotal: ${liveCartData.formattedSubtotal}\n` +
        `📦 Packing: ${formData.packing || 'Not specified'}\n` +
        (formData.state ? `🏙️ State: ${formData.state}\n` : '') +
        (formData.port ? `⚓ Port: ${formData.port}\n` : '') +
        (formData.cif ? `📦 CIF: ${formData.cif}\n` : '') +
        (formData.currency ? `💰 Currency: ${formData.currency}\n` : '') +
        (formData.customLogo ? `🏷️ Custom Logo: ${formData.customLogo}\n` : '') +
        `\n*Cart Items Details:*\n` +
        liveCartData.items.map((item, index) => {
          const numberOfBags = item.numberOfBags || 1;
          const pricePerBag = item.pricePerBag || item.totalPrice || item.displayPrice || 0;
          const totalForItem = item.totalPriceForItem || item.subtotal || 0;

          return `${index + 1}. ${item.name}\n` +
            `   • Grade: ${item.grade || 'Not specified'}\n` +
            `   • Quantity per bag: ${item.quantityUnit || '1 unit'}\n` +
            `   • Price per bag: ₹${pricePerBag.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n` +
            `   • Number of bags: ${numberOfBags}\n` +
            `   • Subtotal: ₹${(pricePerBag * numberOfBags).toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n` +
            `   • Total for item: ₹${totalForItem.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n`;
        }).join('\n') +
        `\n*Order Summary:*\n` +
        `📦 Total Items: ${liveCartData.itemCount}\n` +
        `🛍️ Total Bags: ${totalBagsFromItems}\n` +
        `💰 Cart Subtotal: ${liveCartData.formattedSubtotal}\n` +
        `📦 Additional Packing: ${formData.packing || 'Not specified'}\n` +
        (formData.cif === 'Yes' ? `📦 Insurance: ₹${(formData.insurancePrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` : '') +
        (formData.cif === 'Yes' && formData.freightPrice ? `🚢 Freight: ₹${(formData.freightPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` : '') +
        (formData.cif === 'Yes' && formData.transportTotal ? `🚚 Transport: ₹${(formData.transportTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` : '') +
        `💰 Total Amount: ₹${(formData.totalPrice || liveCartData.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
        `🕐 Order Time: ${new Date().toLocaleString()}\n\n` +
        `📝 Additional Notes: ${formData.additionalInfo || 'No additional notes'}\n\n` +
        `_This order was placed via the shopping cart._`;

      // Send WhatsApp message
      const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '919999999999';
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');

      // Show thank you popup
      setShowThankYou(true);

      // Clear cart after successful submission
      clearCart();
      setLocalCartItems([]);

      // Close BuyModal
      setShowBuyModal(false);

    } catch (error) {
      console.error('Cart order submission error:', error);
      alert('❌ Failed to place order. Please try again or contact support.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle item removal
  const handleRemoveItem = useCallback((itemId) => {
    if (window.confirm('Are you sure you want to remove this item?')) {
      removeFromCart(itemId);
      setLocalCartItems(prev => prev.filter(i => i.id !== itemId));
    }
  }, [removeFromCart]);

  // Special product object for cart
  const cartProduct = {
    firebaseId: 'cart',
    name: { en: 'Shopping Cart' },
    category: 'Multiple Products'
  };

  if (cartItems.length === 0) {
    return (
      <div className="tw-min-h-screen tw-flex tw-flex-col tw-items-center tw-justify-center tw-p-4 tw-bg-gradient-to-b tw-from-black tw-to-gray-900">
        <div className="tw-text-center tw-max-w-md">
          <div className="tw-text-6xl tw-mb-6">🛒</div>
          <h1 className="tw-text-3xl tw-font-bold tw-text-yellow-400 tw-mb-4">
            Your cart is empty
          </h1>
          <p className="tw-text-gray-300 tw-mb-8 tw-text-lg">
            Looks like you haven't added any products to your cart yet.
          </p>
          <button
            onClick={() => navigate('/Products-All')}
            className="tw-bg-gradient-to-r tw-from-yellow-500 tw-to-yellow-600 tw-text-black tw-font-bold tw-px-8 tw-py-4 tw-rounded-xl hover:tw-from-yellow-600 hover:tw-to-yellow-700 tw-transition tw-shadow-lg tw-text-lg"
          >
            Browse Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="tw-min-h-screen tw-bg-gradient-to-b tw-from-black tw-to-gray-900 tw-p-4 md:tw-p-8">
      <div className="tw-max-w-7xl tw-mx-auto">
        {/* Header */}
        <div className="tw-flex tw-flex-col sm:tw-flex-row sm:tw-justify-between sm:tw-items-center tw-mb-8 tw-gap-4">
          <div>
            <h1 className="tw-text-3xl md:tw-text-4xl tw-font-bold tw-text-yellow-400">
              Shopping Cart
            </h1>
            <p className="tw-text-yellow-200/80 tw-mt-2">
              {liveCartData.itemCount} item{liveCartData.itemCount !== 1 ? 's' : ''} in your cart
              {isLoadingPrices && (
                <span className="tw-ml-2 tw-text-xs tw-text-yellow-400/60">
                  (Updating prices...)
                </span>
              )}
            </p>
          </div>
          <div className="tw-flex tw-gap-3">
            <button
              onClick={() => navigate('/Products-All')}
              className="tw-border tw-border-yellow-400 tw-text-yellow-400 tw-px-5 tw-py-2.5 tw-rounded-lg hover:tw-bg-yellow-400/10 tw-transition"
            >
              Continue Shopping
            </button>
            <button
              onClick={() => {
                clearCart();
                setLocalCartItems([]);
              }}
              className="tw-bg-red-500/20 tw-text-red-400 tw-border tw-border-red-500 tw-px-5 tw-py-2.5 tw-rounded-lg hover:tw-bg-red-500/30 tw-transition"
            >
              Clear Cart
            </button>
          </div>
        </div>

        <div className="tw-grid tw-grid-cols-1 lg:tw-grid-cols-3 tw-gap-8">
          {/* Cart Items */}
          <div className="lg:tw-col-span-2">
            <div className="tw-bg-black/50 tw-backdrop-blur-xl tw-rounded-2xl tw-border tw-border-yellow-400/30 tw-overflow-hidden">
              <div className="tw-p-6">
                <div className="tw-flex tw-justify-between tw-items-center tw-mb-6">
                  <h2 className="tw-text-xl tw-font-bold tw-text-yellow-400">
                    Cart Items
                  </h2>
                  {isLoadingPrices && (
                    <div className="tw-flex tw-items-center tw-gap-2 tw-text-sm tw-text-yellow-400">
                      <svg className="tw-w-4 tw-h-4 tw-animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="tw-opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="tw-opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Updating prices...
                    </div>
                  )}
                </div>
                <div className="tw-space-y-6">
                  {liveCartData.items.map((item, index) => {
                    const isTotalPriceItem = item.isTotalPriceItem ||
                      (typeof item.price === 'string' && item.price.toLowerCase().includes('total:'));

                    const numberOfBags = item.numberOfBags || 1;
                    const pricePerBag = item.pricePerBag || item.totalPrice || item.displayPrice || 0;
                    const totalForItem = item.totalPriceForItem || item.subtotal || 0;

                    return (
                      <div
                        key={`${item.id}-${item.grade || 'nograde'}-${item.packing || 'nopacking'}-${index}`}
                        className="tw-flex tw-flex-col sm:tw-flex-row tw-gap-4 tw-p-4 tw-bg-black/30 tw-rounded-xl tw-border tw-border-yellow-400/20"
                      >
                        {/* Product Image */}
                        <div className="tw-flex-shrink-0">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="tw-w-24 tw-h-24 sm:tw-w-32 sm:tw-h-32 tw-object-cover tw-rounded-lg"
                            onError={(e) => {
                              e.target.src = './img/placeholder-rice.jpg';
                            }}
                          />
                        </div>

                        {/* Product Details */}
                        <div className="tw-flex-grow">
                          <div className="tw-flex tw-flex-col sm:tw-flex-row sm:tw-justify-between">
                            <div className="tw-mb-4 sm:tw-mb-0">
                              <h3 className="tw-text-lg tw-font-semibold tw-text-yellow-300 tw-mb-1">
                                {item.name}
                              </h3>
                              <p className="tw-text-sm tw-text-yellow-200/80 tw-mb-1">
                                Category: {item.category || 'Rice'}
                              </p>
                              {item.grade && (
                                <p className="tw-text-sm tw-text-yellow-200/80 tw-mb-1">
                                  Grade: {item.grade}
                                </p>
                              )}
                              <p className="tw-text-sm tw-text-yellow-200/80 tw-mb-1">
                                Quantity per bag: {item.quantityUnit || '1 unit'}
                              </p>
                              <p className="tw-text-sm tw-text-yellow-200/80 tw-mb-1">
                                Price per bag: {formatPrice(pricePerBag)}
                              </p>
                              {item.hsn && (
                                <p className="tw-text-xs tw-text-yellow-200/60">
                                  HSN: {item.hsn}
                                </p>
                              )}
                            </div>

                            <div className="tw-text-right">
                              <div className="tw-flex tw-flex-col tw-items-end">
                                <p className="tw-text-lg tw-font-bold tw-text-yellow-400">
                                  {formatPrice(totalForItem)}
                                </p>
                                {item.priceUpdated && (
                                  <span className="tw-text-xs tw-text-green-400 tw-bg-green-900/30 tw-px-2 tw-py-0.5 tw-rounded tw-mt-1">
                                    Price Updated
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Quantity Controls and Number of Bags Controls */}
                          <div className="tw-flex tw-flex-col sm:tw-flex-row sm:tw-items-center tw-justify-between tw-mt-4 tw-gap-4">
                            <div className="tw-flex tw-flex-col sm:tw-flex-row tw-items-start sm:tw-items-center tw-gap-4">
                              {/* Regular Quantity Controls (if applicable) */}
                              {!isTotalPriceItem && item.quantity !== undefined && (
                                <div className="tw-flex tw-items-center tw-space-x-3 tw-bg-black/50 tw-p-2 tw-rounded-lg">
                                  <div className="tw-flex tw-flex-col">
                                    <span className="tw-text-xs tw-text-yellow-200/60 tw-mb-1">Units per bag</span>
                                    <div className="tw-flex tw-items-center tw-space-x-3">
                                      <button
                                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                        className="tw-w-8 tw-h-8 tw-flex tw-items-center tw-justify-center tw-bg-yellow-400/20 tw-text-yellow-400 tw-rounded-lg hover:tw-bg-yellow-400/30 tw-transition disabled:tw-opacity-50 disabled:tw-cursor-not-allowed"
                                        disabled={item.quantity <= 1}
                                      >
                                        -
                                      </button>
                                      <span className="tw-text-lg tw-font-semibold tw-text-yellow-300 tw-w-8 tw-text-center">
                                        {item.quantity}
                                      </span>
                                      <button
                                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                        className="tw-w-8 tw-h-8 tw-flex tw-items-center tw-justify-center tw-bg-yellow-400/20 tw-text-yellow-400 tw-rounded-lg hover:tw-bg-yellow-400/30 tw-transition"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Number of Bags Controls */}
                              <div className="tw-flex tw-items-center tw-space-x-3 tw-bg-black/50 tw-p-2 tw-rounded-lg">
                                <div className="tw-flex tw-flex-col">
                                  <div className="tw-flex tw-items-center tw-space-x-3">
                                    <button
                                      onClick={() => updateNumberOfBags(item.id, item.grade, numberOfBags - 1)}
                                      className="tw-w-8 tw-h-8 tw-flex tw-items-center tw-justify-center tw-bg-yellow-400/20 tw-text-yellow-400 tw-rounded-lg hover:tw-bg-yellow-400/30 tw-transition disabled:tw-opacity-50 disabled:tw-cursor-not-allowed"
                                      disabled={numberOfBags <= 1}
                                    >
                                      -
                                    </button>
                                    <span className="tw-text-lg tw-font-semibold tw-text-yellow-300 tw-w-8 tw-text-center">
                                      {numberOfBags}
                                    </span>
                                    <button
                                      onClick={() => updateNumberOfBags(item.id, item.grade, numberOfBags + 1)}
                                      className="tw-w-8 tw-h-8 tw-flex tw-items-center tw-justify-center tw-bg-yellow-400/20 tw-text-yellow-400 tw-rounded-lg hover:tw-bg-yellow-400/30 tw-transition"
                                      disabled={numberOfBags >= 100}
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              className="tw-text-red-400 hover:tw-text-red-300 tw-transition tw-flex tw-items-center tw-gap-2 tw-self-end sm:tw-self-auto"
                            >
                              <svg className="tw-w-5 tw-h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:tw-col-span-1">
            <div className="tw-bg-black/50 tw-backdrop-blur-xl tw-rounded-2xl tw-border tw-border-yellow-400/30 tw-p-6 tw-sticky tw-top-6">
              <h2 className="tw-text-xl tw-font-bold tw-text-yellow-400 tw-mb-6">
                Order Summary
              </h2>

              <div className="tw-space-y-4">
                <div className="tw-flex tw-justify-between tw-items-center">
                  <span className="tw-text-yellow-200">Items ({liveCartData.itemCount})</span>
                  <span className="tw-text-yellow-300 tw-font-semibold">
                    {liveCartData.formattedSubtotal}
                  </span>
                </div>

                <div className="tw-flex tw-justify-between tw-items-center">
                  <span className="tw-text-yellow-200">Total Bags</span>
                  <span className="tw-text-yellow-300 tw-font-semibold">
                    {liveCartData.totalBags}
                  </span>
                </div>

                <div className="tw-flex tw-justify-between tw-items-center">
                  <span className="tw-text-yellow-200">Shipping</span>
                  <span className="tw-text-yellow-300 tw-text-sm">
                    Calculated at checkout
                  </span>
                </div>

                <div className="tw-flex tw-justify-between tw-items-center tw-border-t tw-border-yellow-400/30 tw-pt-4 tw-mt-4">
                  <span className="tw-text-lg tw-font-bold tw-text-yellow-400">Total Amount</span>
                  <span className="tw-text-2xl tw-font-bold tw-text-yellow-400">
                    {liveCartData.formattedSubtotal}
                  </span>
                </div>

                {isLoadingPrices && (
                  <div className="tw-bg-yellow-900/20 tw-border tw-border-yellow-500/30 tw-rounded-lg tw-p-3 tw-mt-4">
                    <div className="tw-flex tw-items-center tw-gap-2 tw-text-yellow-400 tw-text-sm">
                      <svg className="tw-w-4 tw-h-4 tw-animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="tw-opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="tw-opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Fetching latest prices...
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setShowBuyModal(true)}
                  className="tw-w-full tw-bg-gradient-to-r tw-from-yellow-500 tw-to-yellow-600 tw-text-black tw-font-bold tw-py-3.5 tw-px-4 tw-rounded-xl tw-mt-6 hover:tw-from-yellow-600 hover:tw-to-yellow-700 tw-transition tw-shadow-lg disabled:tw-opacity-50 disabled:tw-cursor-not-allowed"
                  disabled={localCartItems.length === 0 || isLoadingPrices}
                >
                  {isLoadingPrices ? 'Updating Prices...' : 'Proceed to Checkout'}
                </button>

                <div className="tw-mt-6 tw-text-sm tw-text-yellow-200/60 tw-space-y-2">
                  <p className="tw-flex tw-items-center tw-gap-2">
                    <span className="tw-text-green-400">✓</span> Adjust number of bags per product
                  </p>
                  <p className="tw-flex tw-items-center tw-gap-2">
                    <span className="tw-text-green-400">✓</span> Live Price Updates
                  </p>
                  <p className="tw-flex tw-items-center tw-gap-2">
                    <span className="tw-text-green-400">✓</span> Secure checkout
                  </p>
                  <p className="tw-flex tw-items-center tw-gap-2">
                    <span className="tw-text-green-400">✓</span> 24/7 Customer Support
                  </p>
                  <p className="tw-flex tw-items-center tw-gap-2">
                    <span className="tw-text-green-400">✓</span> WhatsApp Order Confirmation
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BuyModal - Pass the calculated cart data with updated prices */}
      <BuyModal
        isOpen={showBuyModal}
        onClose={() => setShowBuyModal(false)}
        product={cartProduct}
        profile={profile}
        isCartOrder={true}
        cartItems={liveCartData.items} // Pass the calculated items with updated prices
        cartTotal={liveCartData.subtotal} // Pass the calculated subtotal
        onSubmitCartOrder={handleCartSubmit}
      />

      {/* Thank You Popup for cart orders */}
      <ThankYouPopup
        isOpen={showThankYou}
        onClose={() => {
          setShowThankYou(false);
          navigate('/');
        }}
      />
    </div>
  );
};

export default Cart;