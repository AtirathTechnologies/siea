import React from 'react';
import { useCart } from '../contexts/CartContext.jsx';
import { useNavigate } from 'react-router-dom';

const CartIcon = () => {
  const { cartCount, toggleCart, setIsCartOpen } = useCart();
  const navigate = useNavigate();

  const handleClick = () => {
    setIsCartOpen(false);
    navigate('/cart');
  };

  return (
    <button 
      onClick={handleClick}
      className="tw-relative tw-bg-transparent tw-border tw-border-yellow-400 tw-text-yellow-400 tw-p-2 tw-rounded-lg tw-flex tw-items-center tw-justify-center tw-w-10 tw-h-10 hover:tw-bg-yellow-400/20 tw-transition"
      aria-label="Shopping Cart"
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="tw-w-6 tw-h-6" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" 
        />
      </svg>
      
      {cartCount > 0 && (
        <span className="tw-absolute -tw-top-2 -tw-right-2 tw-bg-red-500 tw-text-white tw-text-xs tw-font-bold tw-rounded-full tw-w-5 tw-h-5 tw-flex tw-items-center tw-justify-center">
          {cartCount}
        </span>
      )}
    </button>
  );
};

export default CartIcon;