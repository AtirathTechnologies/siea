import { initializeApp, getApps } from "firebase/app";
import { getAuth, signOut, deleteUser } from "firebase/auth";
import {
  getDatabase,
  ref,
  get,
  set,
  runTransaction,
  push
} from "firebase/database";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app =
  !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getDatabase(app);

/* ---------------- LOGOUT ---------------- */
export const logout = async () => {
  localStorage.removeItem("profile");
  localStorage.removeItem("isAdmin");
  await signOut(auth);
};

/* =====================================================
   🔑 FIX: RESOLVE ACTOR CORRECTLY (ADMIN SAFE)
===================================================== */
const resolveActor = () => {
  try {
    const stored = localStorage.getItem("profile");
    if (stored) {
      const profile = JSON.parse(stored);
      return {
        email: profile.email,
        uid: profile.uid || null,
        role: "admin"
      };
    }
  } catch (e) {}

  if (auth.currentUser) {
    return {
      email: auth.currentUser.email,
      uid: auth.currentUser.uid,
      role: "user"
    };
  }

  return {
    email: "System",
    uid: null,
    role: "system"
  };
};

/* =====================================================
   🧠 HISTORY LOGGER (FIXED)
===================================================== */
export const logHistory = async ({
  path,
  entity,
  action,
  before = null,
  after = null,
  changes = []   // ✅ ADD THIS
}) => {
  const actor = resolveActor();

  await push(ref(db, "history"), {
    path,
    entity,
    action,
    before,
    after,
    changes,      // ✅ STORE CHANGES
    actor: actor.email,
    actorUid: actor.uid,
    actorRole: actor.role,
    timestamp: Date.now()
  });
};

/* =====================================================
   ✍️ WRITE WITH HISTORY (UNCHANGED USAGE)
===================================================== */
export const writeWithHistory = async ({
  path,
  entity,
  data
}) => {
  const dataRef = ref(db, path);
  const snap = await get(dataRef);
  const before = snap.exists() ? snap.val() : null;

  const action =
    !before && data ? "CREATE" :
    before && !data ? "DELETE" :
    "UPDATE";

  await logHistory({
    path,
    entity,
    action,
    before,
    after: data
  });

  if (data === null) {
    await set(dataRef, null);
  } else {
    await set(dataRef, data);
  }
};

/* =====================================================
   💰 GET PRODUCT PRICE BY GRADE (UPDATED FOR YOUR STRUCTURE)
===================================================== */
export const getProductPriceByGrade = async (productId, grade) => {
  try {
    console.log(`Fetching price for product ${productId}, grade: ${grade}`);
    
    const productRef = ref(db, `products/${productId}`);
    const productSnap = await get(productRef);
    
    if (!productSnap.exists()) {
      console.warn(`Product ${productId} not found`);
      return null;
    }
    
    const productData = productSnap.val();
    
    // Handle case where productData might be null (your array has null at index 0)
    if (!productData) {
      console.warn(`Product ${productId} data is null`);
      return null;
    }
    
    // Check if grades array exists
    if (!productData.grades || !Array.isArray(productData.grades)) {
      console.warn(`Product ${productId} has no grades array`);
      return null;
    }
    
    // Search for the specific grade in the grades array
    const gradeObj = productData.grades.find(g => 
      g && g.grade && g.grade.toLowerCase().includes(grade.toLowerCase())
    );
    
    if (gradeObj && gradeObj.price_inr) {
      const price = Number(gradeObj.price_inr);
      console.log(`Found price for ${grade}: ${price}`);
      return price;
    }
    
    // Alternative search with exact match
    const exactGrade = productData.grades.find(g => 
      g && g.grade && g.grade.toLowerCase() === grade.toLowerCase()
    );
    
    if (exactGrade && exactGrade.price_inr) {
      const price = Number(exactGrade.price_inr);
      console.log(`Found exact match price for ${grade}: ${price}`);
      return price;
    }
    
    // Search for partial match
    const partialMatch = productData.grades.find(g => 
      g && g.grade && grade.toLowerCase().includes(g.grade.toLowerCase())
    );
    
    if (partialMatch && partialMatch.price_inr) {
      const price = Number(partialMatch.price_inr);
      console.log(`Found partial match price for ${grade}: ${price}`);
      return price;
    }
    
    console.warn(`Grade "${grade}" not found in product ${productId}. Available grades:`, 
      productData.grades.map(g => g?.grade).filter(Boolean));
    return null;
    
  } catch (error) {
    console.error('Error fetching product price by grade:', error);
    return null;
  }
};

/* =====================================================
   📦 GET PRODUCT WITH PRICES (UPDATED)
===================================================== */
export const getProductWithPrices = async (productId) => {
  try {
    const productRef = ref(db, `products/${productId}`);
    const productSnap = await get(productRef);
    
    if (!productSnap.exists()) {
      return null;
    }
    
    const productData = productSnap.val();
    
    if (!productData) {
      return null;
    }
    
    // Extract grades with prices from grades array
    const gradesWithPrices = {};
    
    if (productData.grades && Array.isArray(productData.grades)) {
      productData.grades.forEach(gradeObj => {
        if (gradeObj && gradeObj.grade && gradeObj.price_inr) {
          gradesWithPrices[gradeObj.grade] = Number(gradeObj.price_inr);
        }
      });
    }
    
    // Calculate default price (average of all grades)
    const gradePrices = Object.values(gradesWithPrices).filter(p => !isNaN(p));
    const defaultPrice = gradePrices.length > 0 
      ? Math.round(gradePrices.reduce((a, b) => a + b, 0) / gradePrices.length)
      : 0;
    
    return {
      ...productData,
      id: productId,
      availableGrades: gradesWithPrices,
      defaultPrice,
      gradeObjects: productData.grades || []
    };
  } catch (error) {
    console.error('Error fetching product with prices:', error);
    return null;
  }
};

/* =====================================================
   🛒 GET CART ITEMS WITH LIVE PRICES (UPDATED)
===================================================== */
export const getCartWithLivePrices = async (cartItems) => {
  try {
    // Fetch live prices for all cart items
    const updatedItems = await Promise.all(
      cartItems.map(async (item) => {
        let livePrice = null;
        
        // If item has a numeric price stored, use it as fallback
        let storedPrice = 0;
        if (typeof item.price === 'number') {
          storedPrice = item.price;
        } else if (typeof item.price === 'string') {
          // Extract numeric price from string like "₹9,500-14,600 per qtls"
          const priceMatch = item.price.match(/(\d+(?:,\d+)*)/);
          if (priceMatch) {
            storedPrice = parseInt(priceMatch[1].replace(/,/g, '')) || 0;
          }
        }
        
        try {
          livePrice = await getProductPriceByGrade(item.id, item.grade);
        } catch (error) {
          console.error(`Error fetching price for ${item.id}:`, error);
        }
        
        const displayPrice = livePrice !== null && !isNaN(livePrice) ? livePrice : storedPrice;
        const subtotal = displayPrice * item.quantity;
        
        return {
          ...item,
          livePrice,
          displayPrice,
          storedPrice,
          subtotal,
          // Flag if price was fetched successfully from Firebase
          priceFetched: livePrice !== null && !isNaN(livePrice),
          // Flag if price changed from stored price
          priceUpdated: livePrice !== null && !isNaN(livePrice) && livePrice !== storedPrice
        };
      })
    );
    
    // Calculate totals
    const subtotal = updatedItems.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    const itemCount = updatedItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
    
    // Count how many items have prices fetched vs using fallback
    const fetchedCount = updatedItems.filter(item => item.priceFetched).length;
    const fallbackCount = updatedItems.filter(item => !item.priceFetched).length;
    
    return {
      items: updatedItems,
      subtotal,
      itemCount,
      fetchedCount,
      fallbackCount,
      formattedSubtotal: new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(subtotal)
    };
  } catch (error) {
    console.error('Error getting cart with live prices:', error);
    
    // Fallback to stored prices
    const subtotal = cartItems.reduce((sum, item) => {
      let price = 0;
      if (typeof item.price === 'number') {
        price = item.price;
      } else if (typeof item.price === 'string') {
        const priceMatch = item.price.match(/(\d+(?:,\d+)*)/);
        if (priceMatch) {
          price = parseInt(priceMatch[1].replace(/,/g, '')) || 0;
        }
      }
      return sum + (price * (item.quantity || 0));
    }, 0);
    
    const itemCount = cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
    
    return {
      items: cartItems.map(item => {
        let price = 0;
        if (typeof item.price === 'number') {
          price = item.price;
        } else if (typeof item.price === 'string') {
          const priceMatch = item.price.match(/(\d+(?:,\d+)*)/);
          if (priceMatch) {
            price = parseInt(priceMatch[1].replace(/,/g, '')) || 0;
          }
        }
        return {
          ...item,
          displayPrice: price,
          subtotal: price * (item.quantity || 0),
          priceFetched: false,
          priceUpdated: false
        };
      }),
      subtotal,
      itemCount,
      fetchedCount: 0,
      fallbackCount: cartItems.length,
      formattedSubtotal: new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(subtotal)
    };
  }
};

/* =====================================================
   🛒 CART ORDER SAVING - STORE ONLY as BulkQuote-{id} in quotes/bulk/
===================================================== */
export const saveCartOrder = async (cartItems, checkoutForm) => {
  try {
    // First get live prices for all items
    const { items: itemsWithLivePrices, subtotal } = await getCartWithLivePrices(cartItems);
    
    // Use the SAME bulkQuote counter for cart orders
    const counterRef = ref(db, `counters/bulkQuote`);
    const result = await runTransaction(counterRef, (v) => (v || 0) + 1);
    if (!result.committed) throw new Error("Counter failed");
    
    const id = result.snapshot.val();
    const quoteId = `BulkQuote-${id}`;
    
    // Prepare cart items for storage
    const cartItemsForStorage = itemsWithLivePrices.map(item => ({
      productId: item.id,
      productName: item.name,
      grade: item.grade || 'Not specified',
      packing: item.packing || 'Not specified',
      quantity: item.quantity || 1,
      price: item.displayPrice || 0,
      storedPrice: item.storedPrice || 0,
      subtotal: item.subtotal || 0,
      priceFetched: item.priceFetched || false,
      priceUpdated: item.priceUpdated || false,
      image: item.image,
      category: item.category,
      hsn: item.hsn || '10063020'
    }));
    
    // Create order data in the SAME STRUCTURE as bulk quotes
    const orderData = {
      // Customer info (same as bulk quote)
      name: checkoutForm.fullName || '',
      email: checkoutForm.email || '',
      phone: checkoutForm.phone || '',
      street: checkoutForm.street || '',
      city: checkoutForm.city || '',
      state: checkoutForm.state || '',
      country: checkoutForm.addressCountry || 'India',
      pincode: checkoutForm.pincode || '',
      
      // Order details
      additionalInfo: checkoutForm.additionalInfo || '',
      cif: checkoutForm.cif || 'No',
      currency: checkoutForm.currency || 'INR',
      customLogo: checkoutForm.customLogo || 'No',
      exchangeRate: 1, // For INR
      
      // Cart-specific identification fields
      isCartOrder: true,
      product: 'Shopping Cart - Multiple Items',
      grade: 'Multiple Grades',
      packing: checkoutForm.packing || '',
      port: checkoutForm.port || '',
      quantity: `${cartItems.length} items`,
      
      // Price breakdown
      gradePrice: 0, // Not applicable for cart
      packingPrice: checkoutForm.packingPrice || 0,
      quantityPrice: subtotal,
      insurancePrice: checkoutForm.insurancePrice || (checkoutForm.cif === 'Yes' ? subtotal * 0.01 : 0),
      freightPrice: checkoutForm.freightPrice || 0,
      transportPrice: checkoutForm.transportPrice || 0,
      transportTotal: checkoutForm.transportTotal || 0,
      totalPrice: checkoutForm.totalPrice || subtotal,
      
      // Cart items details (additional field to store cart items)
      cartItems: cartItemsForStorage,
      
      // Summary
      itemCount: itemsWithLivePrices.reduce((sum, item) => sum + (item.quantity || 0), 0),
      productCount: cartItems.length,
      totalAmount: checkoutForm.totalPrice || subtotal,
      
      // Metadata - SAME as regular bulk quotes
      quoteId: quoteId,
      timestamp: Date.now(),
      type: 'cart', // Use 'cart' type to distinguish, but stored in bulk path
      status: 'Pending'
    };

    // ✅ ONLY save to quotes/bulk - SAME LOCATION as single product quotes
    const bulkQuoteRef = ref(db, `quotes/bulk/${quoteId}`);
    await set(bulkQuoteRef, orderData);
    
    // ✅ NO OTHER STORAGE LOCATIONS - Only one place: quotes/bulk/
    
    // Log the order creation in history
    await logHistory({
      path: `quotes/bulk/${quoteId}`,
      entity: "CART_QUOTE",
      action: "CREATE",
      before: null,
      after: orderData,
      changes: [{ field: "status", from: null, to: "Pending" }]
    });
    
    return {
      orderId: quoteId,
      totalAmount: orderData.totalPrice,
      formattedTotal: new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(orderData.totalPrice),
      items: itemsWithLivePrices,
      priceInfo: {
        fetched: itemsWithLivePrices.filter(item => item.priceFetched).length,
        fallback: itemsWithLivePrices.filter(item => !item.priceFetched).length
      }
    };
  } catch (error) {
    console.error('Error saving cart order:', error);
    throw error;
  }
};
/* =====================================================
   🚀 SUBMIT QUOTE (KEEP EXISTING LOGIC FOR COMPATIBILITY)
===================================================== */
export const submitQuote = async (data) => {
  const isSample = data.type === "sample_courier";

  const counterRef = ref(
    db,
    `counters/${isSample ? "sampleCourier" : "bulkQuote"}`
  );

  const result = await runTransaction(counterRef, (v) => (v || 0) + 1);
  if (!result.committed) throw new Error("Counter failed");

  const id = result.snapshot.val();
  const quoteId = isSample
    ? `SampleCourier-${id}`
    : `BulkQuote-${id}`;

  const path = `quotes/${isSample ? "sample_courier" : "bulk"}/${quoteId}`;

  await writeWithHistory({
    path,
    entity: "ORDER",
    data: {
      quoteId,
      ...data,
      status: "Pending",
      timestamp: Date.now()
    }
  });

  return quoteId;
};

export { deleteUser };
export default app;