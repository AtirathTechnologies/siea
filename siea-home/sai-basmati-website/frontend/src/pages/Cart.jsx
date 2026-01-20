import React, { useState, useEffect } from 'react';
import { useCart } from '../contexts/CartContext.jsx';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { getCartWithLivePrices, saveCartOrder } from '../firebase';
import BuyModal from './BuyModal';
import ThankYouPopup from '../components/ThankYouPopup';

const Cart = () => {
  const { t } = useLanguage();
  const { cartItems, removeFromCart, updateQuantity, clearCart } = useCart();
  const navigate = useNavigate();
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [liveCartData, setLiveCartData] = useState({
    items: [],
    subtotal: 0,
    itemCount: 0,
    formattedSubtotal: '₹0'
  });
  const [profile, setProfile] = useState(null);
  const [showThankYou, setShowThankYou] = useState(false);

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

  // Calculate cart data whenever cart items change - UPDATED TO HANDLE TOTAL PRICE
  useEffect(() => {
    const calculateCartData = async () => {
      if (cartItems.length === 0) {
        setLiveCartData({
          items: [],
          subtotal: 0,
          itemCount: 0,
          formattedSubtotal: '₹0'
        });
        return;
      }

      setIsLoadingPrices(true);
      
      try {
        // Separate items that need live prices (items without totalPrice) 
        // from items that already have totalPrice (like 5kg selections)
        const itemsWithTotalPrice = cartItems.filter(item => item.totalPrice && !isNaN(item.totalPrice));
        const itemsWithoutTotalPrice = cartItems.filter(item => !item.totalPrice || isNaN(item.totalPrice));
        
        let allItems = [];
        
        // For items that already have totalPrice (from ProductCard modal), use that directly
        const processedItemsWithTotal = itemsWithTotalPrice.map(item => {
          const isTotalPriceItem = item.price?.toLowerCase().includes('total:');
          return {
            ...item,
            displayPrice: item.totalPrice, // Use the total price directly
            subtotal: item.totalPrice,
            priceUpdated: false,
            isTotalPriceItem: isTotalPriceItem
          };
        });
        
        // For items without totalPrice, fetch live prices if needed
        if (itemsWithoutTotalPrice.length > 0) {
          try {
            const cartWithPrices = await getCartWithLivePrices(itemsWithoutTotalPrice);
            allItems = [...processedItemsWithTotal, ...cartWithPrices.items];
          } catch (error) {
            console.error('Error fetching live prices:', error);
            // Fallback for items without totalPrice
            const fallbackItems = itemsWithoutTotalPrice.map(item => {
              let displayPrice = 0;
              let subtotal = 0;
              
              if (typeof item.price === 'string') {
                const priceMatch = item.price.match(/₹\s*([\d,]+\.?\d*)/);
                if (priceMatch) {
                  displayPrice = parseFloat(priceMatch[1].replace(/,/g, '')) || 0;
                  subtotal = displayPrice * (item.quantity || 1);
                }
              }
              
              return {
                ...item,
                displayPrice,
                subtotal,
                priceUpdated: false,
                isTotalPriceItem: false
              };
            });
            allItems = [...processedItemsWithTotal, ...fallbackItems];
          }
        } else {
          allItems = processedItemsWithTotal;
        }
        
        // Calculate totals
        const subtotal = allItems.reduce((sum, item) => sum + (item.subtotal || 0), 0);
        const itemCount = allItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
        
        setLiveCartData({
          items: allItems,
          subtotal,
          itemCount,
          formattedSubtotal: new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }).format(subtotal)
        });
        
      } catch (error) {
        console.error('Error processing cart:', error);
        // Ultimate fallback
        const subtotal = cartItems.reduce((sum, item) => {
          if (item.totalPrice && !isNaN(item.totalPrice)) {
            return sum + item.totalPrice;
          }
          return sum;
        }, 0);
        
        const itemCount = cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
        
        setLiveCartData({
          items: cartItems.map(item => ({
            ...item,
            displayPrice: item.totalPrice || 0,
            subtotal: item.totalPrice || 0,
            priceUpdated: false,
            isTotalPriceItem: item.totalPrice ? true : false
          })),
          subtotal,
          itemCount,
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
  }, [cartItems]);

  // Format price function
  const formatPrice = (price) => {
    if (price === undefined || price === null || isNaN(price)) return 'Price on request';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  // Custom submit handler for cart orders (passed to BuyModal)
  const handleCartSubmit = async (formData) => {
    setIsSubmitting(true);
    
    try {
      // Save cart order to Firebase
      const result = await saveCartOrder(cartItems, {
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
        customLogo: formData.customLogo || 'No'
      });

      console.log('Cart order saved with ID:', result.orderId);

      // Prepare WhatsApp message for cart
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
        `💰 Cart Total: ${liveCartData.formattedSubtotal}\n` +
        `📦 Packing: ${formData.packing || 'Not specified'}\n` +
        (formData.state ? `🏙️ State: ${formData.state}\n` : '') +
        (formData.port ? `⚓ Port: ${formData.port}\n` : '') +
        (formData.cif ? `📦 CIF: ${formData.cif}\n` : '') +
        (formData.currency ? `💰 Currency: ${formData.currency}\n` : '') +
        (formData.customLogo ? `🏷️ Custom Logo: ${formData.customLogo}\n` : '') +
        `\n*Cart Items (${cartItems.length} items):*\n` +
        cartItems.map((item, index) => {
          return `${index + 1}. ${item.name}\n` +
            `   • Grade: ${item.grade || 'Not specified'}\n` +
            `   • Quantity: ${item.quantityUnit || '1 unit'}\n` +
            `   • Price: ${item.price || 'Price on request'}\n`;
        }).join('\n') +
        `\n*Order Summary:*\n` +
        `📦 Total Items: ${liveCartData.itemCount}\n` +
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
      
      // Close BuyModal
      setShowBuyModal(false);
      
    } catch (error) {
      console.error('Cart order submission error:', error);
      alert('❌ Failed to place order. Please try again or contact support.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
              onClick={clearCart}
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
                    const isTotalPriceItem = item.isTotalPriceItem || item.price?.toLowerCase().includes('total:');
                    
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
                                Quantity: {item.quantityUnit || '1 unit'}
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
                                  {formatPrice(item.subtotal)}
                                </p>
                                <p className="tw-text-sm tw-text-yellow-200/60">
                                  {isTotalPriceItem ? 'Total amount' : `Price per unit: ${formatPrice(item.displayPrice)}`}
                                </p>
                                {item.priceUpdated && (
                                  <span className="tw-text-xs tw-text-green-400 tw-bg-green-900/30 tw-px-2 tw-py-0.5 tw-rounded tw-mt-1">
                                    Price Updated
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Quantity Controls - Special handling for total price items */}
                          <div className="tw-flex tw-items-center tw-justify-between tw-mt-4">
                            <div className="tw-flex tw-items-center tw-space-x-4">
                              {isTotalPriceItem ? (
                                // For total price items, show static quantity
                                <div className="tw-flex tw-items-center tw-space-x-3 tw-bg-black/50 tw-p-2 tw-rounded-lg">
                                  <span className="tw-text-lg tw-font-semibold tw-text-yellow-300 tw-px-2">
                                     {item.quantityUnit || 'unit'}
                                  </span>
                                </div>
                              ) : (
                                // For regular items, show quantity controls
                                <>
                                  <div className="tw-flex tw-items-center tw-space-x-3 tw-bg-black/50 tw-p-2 tw-rounded-lg">
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
                                  <span className="tw-text-sm tw-text-yellow-200/60">
                                    {item.quantity} unit{item.quantity > 1 ? 's' : ''}
                                  </span>
                                </>
                              )}
                            </div>
                            
                            <button
                              onClick={() => {
                                if (window.confirm('Are you sure you want to remove this item?')) {
                                  removeFromCart(item.id);
                                }
                              }}
                              className="tw-text-red-400 hover:tw-text-red-300 tw-transition tw-flex tw-items-center tw-gap-2"
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
                  disabled={cartItems.length === 0 || isLoadingPrices}
                >
                  {isLoadingPrices ? 'Updating Prices...' : 'Proceed to Checkout'}
                </button>
                
                <div className="tw-mt-6 tw-text-sm tw-text-yellow-200/60 tw-space-y-2">
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

      {/* BuyModal - Now supports cart orders */}
      <BuyModal
        isOpen={showBuyModal}
        onClose={() => setShowBuyModal(false)}
        product={cartProduct}
        profile={profile}
        isCartOrder={true}
        cartItems={cartItems}
        cartTotal={liveCartData.subtotal}
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