// PACKING RULES
export const PACKING_RULES = {
    "Non-Woven Bags": {
        maxBag: 25,
        rates: {
            5: 4,
            10: 3,
            25: 2,
        },
    },
    "PP (Polypropylene Woven Bags)": {
        maxBag: 50,
        rates: {
            50: 1,
            25: 2,
        },
    },
    "Jute Bags": {
        maxBag: 40,
        rates: {
            5: 4,
            10: 3,
            25: 2,
            40: 2,
        },
    },
    "BOPP (Biaxially Oriented Polypropylene) Laminated Bags": {
        maxBag: 40,
        rates: {
            5: 4,
            10: 3,
            25: 2,
            40: 2,
        },
    },
};


// Calculate packing price
export const calculatePackingPrice = (packingType, quantityKg, numberOfBags) => {
    if (!packingType || !quantityKg) return 0;

    const rule = PACKING_RULES[packingType];
    if (!rule) return 0;

    let ratePerKg = 0;

    if (rule.rates[quantityKg]) {
        ratePerKg = rule.rates[quantityKg];
    } else {
        const maxBag = rule.maxBag;
        ratePerKg = rule.rates[maxBag];
    }

    return quantityKg * numberOfBags * ratePerKg;
};


// Validate packing for cart
export const isPackingValidForCart = (packingType, cartItems = []) => {

    // 🔒 Safety check
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
        return true; // nothing to validate
    }

    if (!packingType || !PACKING_RULES[packingType]) return false;

    const rule = PACKING_RULES[packingType];
    const allowedSizes = Object.keys(rule.rates).map(Number);
    const minSize = Math.min(...allowedSizes);
    const maxSize = Math.max(...allowedSizes);

    return cartItems.every((item) => {

        if (!item) return false;

        let qtyPerBag = 0;
        const qty = item.quantityUnit || item.quantity;

        if (qty === "1ton") {
            qtyPerBag = 1000;
        } else if (typeof qty === "string" && qty.includes("kg")) {
            qtyPerBag = parseFloat(qty.replace("kg", ""));
        } else if (typeof qty === "number") {
            qtyPerBag = qty;
        }

        if (qtyPerBag < minSize) return false;
        if (allowedSizes.includes(qtyPerBag)) return true;
        if (qtyPerBag > maxSize) return true;

        return false;
    });
};


// Get quantity dropdown options
export const getAvailableQuantities = (packingType, allQuantities) => {
    if (!packingType || !PACKING_RULES[packingType]) return [];

    const rule = PACKING_RULES[packingType];
    const allowedSizes = Object.keys(rule.rates).map(Number);
    const minAllowed = Math.min(...allowedSizes);

    return allQuantities.filter(q => q >= minAllowed);
};