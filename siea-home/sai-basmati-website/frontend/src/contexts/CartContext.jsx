import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    const savedCart = localStorage.getItem('cartItems');
    return savedCart ? JSON.parse(savedCart) : [];
  });
  const [cartCount, setCartCount] = useState(0);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('cartItems', JSON.stringify(cartItems));
    setCartCount(cartItems.reduce((total, item) => total + item.quantity, 0));
  }, [cartItems]);

  const addToCart = (product, grade = '', quantity = 1, packing = '', price = '', quantityUnit = '', totalPrice = null) => {
    setCartItems(prevItems => {
      const existingItemIndex = prevItems.findIndex(item =>
        item.id === product.firebaseId &&
        item.grade === grade &&
        item.packing === packing &&
        item.quantityUnit === quantityUnit
      );

      if (existingItemIndex >= 0) {
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex].quantity += quantity;
        // Update total price if provided
        if (totalPrice) {
          updatedItems[existingItemIndex].totalPrice = (updatedItems[existingItemIndex].totalPrice || 0) + totalPrice;
        }
        return updatedItems;
      } else {
        const newItem = {
          id: product.firebaseId || product.id,
          productId: product.id,
          name: product.name?.en || product.variety || product.name,
          image: product.image || './img/placeholder-rice.jpg',
          category: product.category,
          grade,
          packing,
          quantity,
          price: price || product.price,
          specs: product.specs,
          hsn: product.hsn,
          timestamp: Date.now()
        };

        // Add quantity unit if provided (e.g., "5kg", "1ton")
        if (quantityUnit) {
          newItem.quantityUnit = quantityUnit;
        }

        // Add total price if provided
        if (totalPrice) {
          newItem.totalPrice = totalPrice;
          newItem.unitPrice = totalPrice; // For backward compatibility
        } else {
          // Calculate total price from price string if available
          const priceMatch = price?.match(/\₹([\d,]+\.?\d*)/);
          if (priceMatch) {
            newItem.totalPrice = parseFloat(priceMatch[1].replace(/,/g, '')) * quantity;
          }
        }

        return [...prevItems, newItem];
      }
    });
  };

  const removeFromCart = (itemId) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== itemId));
  };

  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(itemId);
      return;
    }

    setCartItems(prevItems =>
      prevItems.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, quantity: newQuantity };

          // For items with totalPrice and quantityUnit (like 5kg items),
          // we should NOT recalculate totalPrice since it's fixed for that quantity
          if (item.quantityUnit && item.totalPrice) {
            // Keep the same totalPrice, just update quantity
            return updatedItem;
          }

          // For regular items, update total price if it exists
          if (item.totalPrice && item.quantity > 0) {
            const pricePerUnit = item.totalPrice / item.quantity;
            updatedItem.totalPrice = pricePerUnit * newQuantity;
          }
          return updatedItem;
        }
        return item;
      })
    );
  };
  const clearCart = () => {
    setCartItems([]);
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => {
      // Use totalPrice if available
      if (item.totalPrice) {
        return total + item.totalPrice;
      }
      // Fallback to parsing price string
      if (item.price && typeof item.price === 'string') {
        const priceMatch = item.price.match(/[\d,]+/g);
        if (priceMatch && priceMatch.length >= 2) {
          const minPrice = parseInt(priceMatch[0].replace(/,/g, ''));
          return total + (minPrice * item.quantity);
        }
      }
      return total;
    }, 0);
  };

  const toggleCart = () => {
    setIsCartOpen(!isCartOpen);
  };

  return (
    <CartContext.Provider value={{
      cartItems,
      cartCount,
      isCartOpen,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getCartTotal,
      toggleCart,
      setIsCartOpen
    }}>
      {children}
    </CartContext.Provider>
  );
};