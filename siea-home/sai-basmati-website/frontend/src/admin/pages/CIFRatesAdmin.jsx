import React, { useState, useEffect, useMemo } from "react";
import { db } from "../../firebase";
import { ref, get, set } from "firebase/database";
import { v4 as uuidv4 } from "uuid";

/* ---------------- EMPTY FORM ---------------- */
const emptyForm = () => ({
  id: uuidv4(),
  Grade: "",
  Country: "",
  Region: "",
  Container: "20FT",
  "Origin Port": "Mundra",
  "Destination Port": "",
  FOB_USD: "",
  CIF_USD: "",
  Freight_USD: "",
  Insurance_USD: "",
  Port_Charges_USD: "",
});

const CIFRatesAdmin = () => {
  /* ---------------- STATE ---------------- */
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);

  // editing: null | "new" | rate.id
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());

  // filters
  const [search, setSearch] = useState("");
  const [grade, setGrade] = useState("");
  const [country, setCountry] = useState("");
  const [container, setContainer] = useState("");

  /* ---------------- FETCH ONCE ---------------- */
  useEffect(() => {
    const load = async () => {
      const snap = await get(ref(db, "cifRates"));
      const raw = snap.exists() ? Object.values(snap.val()) : [];

      // guarantee unique keys
      const withIds = raw.map(r => ({
        ...r,
        id: r.id || uuidv4(),
      }));

      setRates(withIds);
      setLoading(false);
    };
    load();
  }, []);

  /* ---------------- FILTER OPTIONS ---------------- */
  const filters = useMemo(() => {
    const g = new Set(), c = new Set(), cn = new Set();
    rates.forEach(r => {
      if (r.Grade) g.add(r.Grade);
      if (r.Country) c.add(r.Country);
      if (r.Container) cn.add(r.Container);
    });
    return {
      grades: [...g],
      countries: [...c],
      containers: [...cn],
    };
  }, [rates]);

  /* ---------------- FILTERED DATA ---------------- */
  const filteredRates = useMemo(() => {
    return rates.filter(r => {
      const s = search.toLowerCase();
      return (
        (!search ||
          r.Grade?.toLowerCase().includes(s) ||
          r.Country?.toLowerCase().includes(s) ||
          r["Destination Port"]?.toLowerCase().includes(s)) &&
        (!grade || r.Grade === grade) &&
        (!country || r.Country === country) &&
        (!container || r.Container === container)
      );
    });
  }, [rates, search, grade, country, container]);

  /* ---------------- FORM HANDLERS ---------------- */
  const saveRate = async () => {
    if (!form.Grade || !form.Country || !form.CIF_USD) {
      alert("Grade, Country and CIF are required");
      return;
    }

    const updated =
      editing === "new"
        ? [...rates, { ...form, id: uuidv4() }]
        : rates.map(r => (r.id === editing ? form : r));

    await set(ref(db, "cifRates"), updated);
    setRates(updated);
    setEditing(null);
    setForm(emptyForm());
  };

  const deleteRate = async (id) => {
    if (!window.confirm("Delete this CIF rate?")) return;

    const updated = rates.filter(r => r.id !== id);
    await set(ref(db, "cifRates"), updated);
    setRates(updated);
  };

  /* ---------------- LOADER ---------------- */
  if (loading) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-black">
        <p className="tw-text-yellow-400 tw-text-lg">Loading CIF rates…</p>
      </div>
    );
  }

  /* ---------------- UI ---------------- */
  return (
    <div className="tw-min-h-screen tw-bg-black tw-text-white tw-p-6">

      {/* HEADER */}
      <div className="tw-flex tw-justify-between tw-items-center tw-mb-6">
        <div>
          <h1 className="tw-text-3xl tw-font-bold tw-text-yellow-400">
            CIF Rates
          </h1>
          <p className="tw-text-gray-400 tw-text-sm">
            Cost • Insurance • Freight
          </p>
        </div>

        <button
          onClick={() => {
            setEditing("new");
            setForm(emptyForm());
          }}
          className="tw-bg-green-600 hover:tw-bg-green-700 tw-px-4 tw-py-2 tw-rounded-md"
        >
          + Add CIF
        </button>
      </div>

      {/* FILTER BAR */}
      <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-4 tw-gap-3 tw-mb-6">
        <input
          placeholder="Search grade / country / port"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="tw-bg-gray-900 tw-p-2 tw-rounded"
        />

        <select
          value={grade}
          onChange={e => setGrade(e.target.value)}
          className="tw-bg-gray-900 tw-p-2 tw-rounded"
        >
          <option value="">All Grades</option>
          {filters.grades.map(g => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>

        <select
          value={country}
          onChange={e => setCountry(e.target.value)}
          className="tw-bg-gray-900 tw-p-2 tw-rounded"
        >
          <option value="">All Countries</option>
          {filters.countries.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          value={container}
          onChange={e => setContainer(e.target.value)}
          className="tw-bg-gray-900 tw-p-2 tw-rounded"
        >
          <option value="">All Containers</option>
          {filters.containers.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* ADD / EDIT FORM */}
      {editing && (
        <div className="tw-bg-gray-900 tw-rounded-lg tw-p-5 tw-mb-6">
          <h3 className="tw-text-yellow-400 tw-font-bold tw-mb-3">
            {editing === "new" ? "Add CIF Rate" : "Edit CIF Rate"}
          </h3>

          <div className="tw-grid tw-grid-cols-2 lg:tw-grid-cols-4 tw-gap-3">
            {[
              "Grade",
              "Country",
              "Destination Port",
              "FOB_USD",
              "CIF_USD",
            ].map(field => (
              <input
                key={field}
                placeholder={field}
                value={form[field] || ""}
                onChange={e =>
                  setForm({ ...form, [field]: e.target.value })
                }
                className="tw-bg-black tw-p-2 tw-rounded"
              />
            ))}
          </div>

          <div className="tw-flex tw-gap-3 tw-mt-4">
            <button
              onClick={saveRate}
              className="tw-bg-green-600 tw-px-4 tw-py-2 tw-rounded"
            >
              Save
            </button>
            <button
              onClick={() => {
                setEditing(null);
                setForm(emptyForm());
              }}
              className="tw-bg-gray-700 tw-px-4 tw-py-2 tw-rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* TABLE */}
      <div className="tw-bg-gray-900 tw-rounded-lg tw-overflow-x-auto">
        <table className="tw-w-full tw-text-sm">
          <thead className="tw-bg-yellow-600 tw-text-black">
            <tr>
              <th className="tw-p-3">Grade</th>
              <th className="tw-p-3">Country</th>
              <th className="tw-p-3">Port</th>
              <th className="tw-p-3">FOB</th>
              <th className="tw-p-3">CIF</th>
              <th className="tw-p-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredRates.map(r => (
              <tr key={r.id} className="tw-border-b tw-border-gray-800">
                <td className="tw-p-3 tw-text-yellow-400">{r.Grade}</td>
                <td className="tw-p-3">{r.Country}</td>
                <td className="tw-p-3">{r["Destination Port"]}</td>
                <td className="tw-p-3">${r.FOB_USD}</td>
                <td className="tw-p-3 tw-font-bold">${r.CIF_USD}</td>
                <td className="tw-p-3 tw-flex tw-gap-2">
                  <button
                    onClick={() => {
                      setEditing(r.id);
                      setForm(r);
                    }}
                    className="tw-text-blue-400"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteRate(r.id)}
                    className="tw-text-red-400"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}

            {filteredRates.length === 0 && (
              <tr>
                <td
                  colSpan="6"
                  className="tw-text-center tw-p-6 tw-text-gray-400"
                >
                  No CIF rates found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="tw-text-gray-500 tw-text-xs tw-mt-4">
        Showing {filteredRates.length} of {rates.length} CIF rates
      </p>
    </div>
  );
};

export default CIFRatesAdmin;
