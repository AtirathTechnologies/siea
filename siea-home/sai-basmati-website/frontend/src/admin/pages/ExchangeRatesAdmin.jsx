import React, { useState, useEffect } from "react";
import { auth, db, isAdminUser } from "../../firebase";
import { ref, set, get, remove } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";

const DEFAULT_RATES = {
  USD: 1,
  INR: 83.5,
  EUR: 0.92,
  GBP: 0.79,
  AED: 3.67,
};

const ExchangeRatesAdmin = () => {
  const [exchangeRates, setExchangeRates] = useState(DEFAULT_RATES);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState("");

  /* ---------------- AUTH CHECK ---------------- */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        const admin = await isAdminUser(user.uid);
        setIsAdmin(admin);
        if (admin) fetchRates();
      }

      setAuthLoading(false);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  /* ---------------- FETCH RATES ---------------- */
  const fetchRates = async () => {
    try {
      setLoading(true);
      const snap = await get(ref(db, "exchangeRates/rates"));

      if (snap.exists()) {
        setExchangeRates(snap.val());
      } else {
        await set(ref(db, "exchangeRates/rates"), DEFAULT_RATES);
        setExchangeRates(DEFAULT_RATES);
      }
    } catch (err) {
      alert("Failed to load exchange rates");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- ACTIONS ---------------- */
  const startEdit = (currency, rate) => {
    setEditing(currency);
    setEditValue(rate.toString());
  };

  const saveRate = async (currency) => {
    if (isNaN(editValue) || !editValue) {
      alert("Enter valid number");
      return;
    }

    const newRate = parseFloat(editValue);

    await set(ref(db, `exchangeRates/rates/${currency}`), newRate);

    setExchangeRates((prev) => ({
      ...prev,
      [currency]: newRate,
    }));

    setEditing(null);
    setEditValue("");
  };

  const addCurrency = async () => {
    const code = prompt("Currency code (eg: CAD, JPY)");
    if (!code) return;

    const rate = prompt(`1 USD = ? ${code.toUpperCase()}`);
    if (!rate || isNaN(rate)) return;

    await set(
      ref(db, `exchangeRates/rates/${code.toUpperCase()}`),
      parseFloat(rate)
    );

    setExchangeRates((prev) => ({
      ...prev,
      [code.toUpperCase()]: parseFloat(rate),
    }));
  };

  const deleteCurrency = async (currency) => {
    if (currency === "USD") return;

    if (!window.confirm(`Delete ${currency}?`)) return;

    await remove(ref(db, `exchangeRates/rates/${currency}`));

    const updated = { ...exchangeRates };
    delete updated[currency];
    setExchangeRates(updated);
  };

  const resetDefaults = async () => {
    if (!window.confirm("Reset all rates to default?")) return;

    await set(ref(db, "exchangeRates/rates"), DEFAULT_RATES);
    setExchangeRates(DEFAULT_RATES);
  };

  /* ---------------- UI STATES ---------------- */
  if (authLoading) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center">
        <p className="tw-text-yellow-400">Checking authentication…</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center">
        <p className="tw-text-red-500">Login required</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center">
        <p className="tw-text-red-500">Admin access only</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center">
        <p className="tw-text-yellow-400">Loading exchange rates…</p>
      </div>
    );
  }

  /* ---------------- MAIN UI ---------------- */
  return (
    <div className="tw-min-h-screen tw-bg-black tw-text-white tw-p-6">
      {/* HEADER */}
      <div className="tw-flex tw-items-center tw-justify-between tw-mb-8">
        <div>
          <h1 className="tw-text-3xl tw-font-bold tw-text-yellow-400">
            Exchange Rates
          </h1>
          <p className="tw-text-sm tw-text-gray-400">
            Base Currency: USD • {currentUser.email}
          </p>
        </div>
      </div>

      {/* ACTION BAR */}
      <div className="tw-flex tw-gap-3 tw-mb-8">
        <button
          onClick={addCurrency}
          className="tw-bg-green-600 hover:tw-bg-green-700 tw-px-4 tw-py-2 tw-rounded-md"
        >
          + Add Currency
        </button>
        <button
          onClick={resetDefaults}
          className="tw-bg-gray-700 hover:tw-bg-gray-800 tw-px-4 tw-py-2 tw-rounded-md"
        >
          Reset Defaults
        </button>
      </div>

      {/* BASE CURRENCY */}
      <div className="tw-bg-gray-900 tw-border tw-border-yellow-500 tw-rounded-lg tw-p-5 tw-mb-8">
        <h2 className="tw-text-xl tw-text-yellow-400 tw-font-bold">USD</h2>
        <p className="tw-text-gray-400">Base currency (fixed)</p>
        <div className="tw-text-3xl tw-font-bold tw-mt-2">1.0000</div>
      </div>

      {/* CURRENCY GRID */}
      <div className="tw-grid tw-grid-cols-1 sm:tw-grid-cols-2 lg:tw-grid-cols-4 tw-gap-4">
        {Object.entries(exchangeRates)
          .filter(([c]) => c !== "USD")
          .map(([currency, rate]) => (
            <div
              key={currency}
              className="tw-bg-gray-900 tw-border tw-border-gray-800 tw-rounded-lg tw-p-4 hover:tw-border-yellow-500 tw-transition"
            >
              <div className="tw-flex tw-justify-between tw-items-center">
                <h3 className="tw-text-yellow-400 tw-font-bold">{currency}</h3>
                <button
                  onClick={() => startEdit(currency, rate)}
                  className="tw-text-blue-400 tw-text-sm"
                >
                  Edit
                </button>
              </div>

              {editing === currency ? (
                <>
                  <input
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="tw-w-full tw-mt-3 tw-bg-black tw-border tw-border-gray-700 tw-rounded tw-p-2"
                  />
                  <div className="tw-flex tw-gap-2 tw-mt-3">
                    <button
                      onClick={() => saveRate(currency)}
                      className="tw-flex-1 tw-bg-green-600 tw-py-1 tw-rounded"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditing(null)}
                      className="tw-flex-1 tw-bg-gray-700 tw-py-1 tw-rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="tw-text-2xl tw-font-bold tw-mt-3">
                    {rate.toFixed(4)}
                  </div>
                  <p className="tw-text-xs tw-text-gray-400">
                    1 USD = {rate.toFixed(4)} {currency}
                  </p>

                  <button
                    onClick={() => deleteCurrency(currency)}
                    className="tw-text-red-500 tw-text-xs tw-mt-2"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          ))}
      </div>

      {/* FOOTER */}
      <div className="tw-mt-10 tw-text-gray-400 tw-text-sm">
        • All rates are relative to USD<br />
        • Changes apply instantly across the platform
      </div>
    </div>
  );
};

export default ExchangeRatesAdmin;
