import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ref, onValue, off, query, limitToLast } from "firebase/database";
import { db } from "../../firebase";


import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar
} from "recharts";

const ALERT_BEEP_BASE64 = "data:audio/mp3;base64,//uQZAAAAAAAAAAAAAAAAAAAA...";

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    totalOrders: 0,
    totalServices: 0,
    pendingQuotes: 0,
    todayOrders: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);


  const [orders7Days, setOrders7Days] = useState([]);
  const [pieData, setPieData] = useState([]);
  const [statusData, setStatusData] = useState([]);

  
  const [newOrderFlash, setNewOrderFlash] = useState(false);
  const prevTotalOrdersRef = useRef(0);
  const audioRef = useRef(null);
  const quotesListenerRef = useRef(null);

  useEffect(() => {
    
    audioRef.current = typeof Audio !== "undefined" ? new Audio(ALERT_BEEP_BASE64) : null;
  }, []);

  useEffect(() => {
    const unsubs = [];

    
    unsubs.push(onValue(ref(db, "users"), (snap) => {
      const count = snap.exists() ? Object.keys(snap.val() || {}).length : 0;
      setStats(prev => ({ ...prev, totalUsers: count }));
    }));

    unsubs.push(onValue(ref(db, "products"), (snap) => {
      const count = snap.exists() ? Object.keys(snap.val() || {}).length : 0;
      setStats(prev => ({ ...prev, totalProducts: count }));
    }));

    unsubs.push(onValue(ref(db, "services"), (snap) => {
      let total = 0;
      if (snap.exists()) {
        Object.values(snap.val() || {}).forEach(cat => {
          if (Array.isArray(cat)) total += cat.length;
        });
      }
      setStats(prev => ({ ...prev, totalServices: total }));
    }));

    
    const quotesRef = query(ref(db, "quotes"), limitToLast(300));
    quotesListenerRef.current = (snap) => {
      const raw = snap.val() || {};


      let flat = [];


      Object.entries(raw).forEach(([k, v]) => {
        
        if (v && typeof v === "object" && !Array.isArray(v)) {
          const maybeBucketValues = Object.values(v);
          const isBucket = maybeBucketValues.length > 0 && maybeBucketValues.every(x => typeof x === "object" && ("timestamp" in x || Object.keys(x).length > 0));
          if (isBucket) {
            
            Object.entries(v).forEach(([id, order]) => {
              flat.push({
                id,
                ...order,
                type: inferTypeFromBucketKey(k, order),
                timestamp: order.timestamp || 0
              });
            });
            return;
          }
        }
        
        if (v && typeof v === "object") {
          flat.push({
            id: k,
            ...v,
            type: v.type || inferTypeFromOrder(v),
            timestamp: v.timestamp || 0
          });
        }
      });

      
      const byId = {};
      flat.forEach(o => {
        if (!o.id) return;
        if (!byId[o.id] || (o.timestamp || 0) > (byId[o.id].timestamp || 0)) byId[o.id] = o;
      });
      flat = Object.values(byId);

      
      flat.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      
      const total = flat.length;
      const pending = flat.filter(o => !o.status || o.status === "Pending").length;
      const todayStart = new Date().setHours(0, 0, 0, 0);
      const todayCount = flat.filter(o => (o.timestamp || 0) >= todayStart).length;

      
      const recent = flat.slice(0, 6).map(o => ({
        id: o.id,
        action: (o.type === "sample_courier" || (o.type && o.type.includes("sample"))) ? "Sample Courier Request" : "Bulk Quote Request",
        user: getNameFromOrder(o),
        time: formatTime(o.timestamp),
        status: o.status || "Pending",
      }));

      
      setOrders7Days(calc7DayCounts(flat));
      setPieData(calcTypePie(flat));
      setStatusData(calcStatusCounts(flat));

      
      const prevTotal = prevTotalOrdersRef.current || 0;
      if (total > prevTotal) {
        
        try { audioRef.current?.play?.(); } catch (e) { /* ignore autoplay errors */ }
        setNewOrderFlash(true);
        setTimeout(() => setNewOrderFlash(false), 2500);
      }
      prevTotalOrdersRef.current = total;

      
      setStats(prev => ({ ...prev, totalOrders: total, pendingQuotes: pending, todayOrders: todayCount }));
      setRecentActivity(recent);
      setLoading(false);
    };

    onValue(quotesRef, quotesListenerRef.current);

    
    return () => {
      unsubs.forEach(fn => fn());
      if (quotesRef && quotesListenerRef.current) off(quotesRef, "value", quotesListenerRef.current);
    };
  }, []);

  
  const inferTypeFromBucketKey = (bucketKey, order) => {
    if (!bucketKey) return order?.type || "bulk";
    if (bucketKey.toLowerCase().includes("sample")) return "sample_courier";
    if (bucketKey.toLowerCase().includes("bulk")) return "bulk";
    
    return order?.type || "bulk";
  };

  const inferTypeFromOrder = (order) => {
    if (!order) return "bulk";
    if ((order.type || "").toLowerCase().includes("sample")) return "sample_courier";
    if (order.items || order.items?.length) return "sample_courier"; 
    return "bulk";
  };

  const getNameFromOrder = (o) => {
    
    return o?.name || o?.fullName || o?.full_name || o?.displayName || o?.customerName || o?.company || o?.email || "No Name";
  };

  const calc7DayCounts = (orders) => {
    const today = new Date();
    const map = {};

    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toLocaleDateString();
      map[key] = 0;
    }

    orders.forEach(o => {
      const d = new Date(o.timestamp || 0);
      const key = d.toLocaleDateString();
      if (map.hasOwnProperty(key)) {
        map[key]++;
      }
    });

    return Object.keys(map)
      .sort((a, b) => new Date(a) - new Date(b))
      .map(key => ({
        day: new Date(key).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
        count: map[key]
      }));
  };

  const calcTypePie = (orders) => {
    const bulk = orders.filter(o => !o.type || o.type === "bulk").length;
    const sample = orders.filter(o => o.type === "sample_courier" || (o.type && o.type.includes("sample"))).length;
    return [
      { name: "Bulk", value: bulk },
      { name: "Sample", value: sample }
    ];
  };

  const calcStatusCounts = (orders) => {
    const map = {};
    orders.forEach(o => {
      const s = o.status || "Pending";
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map).map(([status, value]) => ({ status, value }));
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "Just now";
    const date = new Date(timestamp);
    const now = Date.now();
    const diff = now - date;

    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} mins ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    return date.toLocaleDateString();
  };

  
  const handleCardClick = (cardType) => {
    switch (cardType) {
      case "users":
        navigate("/admin/users");
        break;
      case "products":
        navigate("/admin/products");
        break;
      case "orders":
        navigate("/admin/orders");
        break;
      case "services":
        navigate("/admin/services");
        break;
      case "pending-quotes":
        navigate("/admin/pending-quotes");
        break;
      case "todays-orders":
        navigate("/admin/todays-orders");
        break;
      default:
        break;
    }
  };

  
  const statCards = [
    {
      label: ["Total", "Users"],
      value: stats.totalUsers,
      icon: "👤",
      color: "tw-from-yellow-600 tw-to-yellow-500",
      type: "users",
      path: "/admin/users"
    },
    {
      label: ["Active", "Products"],
      value: stats.totalProducts,
      icon: "📦",
      color: "tw-from-amber-600 tw-to-yellow-500",
      type: "products",
      path: "/admin/products"
    },
    {
      label: ["Total", "Orders &", "Quotes"],
      value: stats.totalOrders,
      icon: "🛒",
      color: `tw-from-orange-600 tw-to-yellow-500 ${newOrderFlash ? "tw-ring-4 tw-ring-yellow-400/60" : ""}`,
      type: "orders",
      path: "/admin/orders"
    },
    {
      label: ["Service", "Providers"],
      value: stats.totalServices,
      icon: "🤝",
      color: "tw-from-yellow-700 tw-to-amber-600",
      type: "services",
      path: "/admin/services"
    },
    {
      label: ["Pending", "Quotes"],
      value: stats.pendingQuotes,
      icon: "⏳",
      color: "tw-from-red-600 tw-to-orange-500",
      highlight: true,
      type: "pending-quotes",
      path: "/admin/pending-quotes"
    },
    {
      label: ["Today's", "Orders"],
      value: stats.todayOrders,
      icon: "📅",
      color: "tw-from-green-600 tw-to-emerald-500",
      highlight: true,
      type: "todays-orders",
      path: "/admin/todays-orders"
    },
  ];

  
  const PIE_COLORS = ["#F59E0B", "#06B6D4"]; // yellow, cyan

  return (
    <div className="tw-space-y-6 sm:tw-space-y-8 md:tw-space-y-10 tw-p-2 sm:tw-p-4">
      
      <div className="tw-text-center tw-px-2">
        <h1 className="
          tw-font-bold
          tw-bg-gradient-to-r tw-from-yellow-600 tw-to-yellow-400
          tw-bg-clip-text tw-text-transparent
          tw-text-2xl sm:tw-text-3xl md:tw-text-4xl lg:tw-text-5xl xl:tw-text-6xl
        ">
          Welcome back, Admin
        </h1>
        <p className="tw-text-gray-400 tw-mt-2 sm:tw-mt-4 tw-text-sm sm:tw-text-base md:tw-text-lg lg:tw-text-xl">
          Real-time overview of your platform
        </p>
      </div>

      
      <div className="
        tw-grid
        tw-grid-cols-1
        xs:tw-grid-cols-2
        sm:tw-grid-cols-2
        md:tw-grid-cols-3
        lg:tw-grid-cols-3
        xl:tw-grid-cols-6
        tw-gap-3 sm:tw-gap-4 md:tw-gap-6
        tw-px-2
      ">
        {statCards.map((stat, i) => (
          <button
            key={i}
            onClick={() => handleCardClick(stat.type)}
            className={`
              tw-relative
              tw-overflow-hidden
              tw-rounded-xl sm:tw-rounded-2xl
              tw-p-4 sm:tw-p-5 md:tw-p-6
              tw-bg-gradient-to-br ${stat.color}
              tw-text-white
              tw-shadow-lg tw-shadow-black/30
              tw-transition-all tw-duration-300
              hover:tw-scale-105 hover:tw-shadow-yellow-500/50
              hover:tw-ring-2 hover:tw-ring-white/50
              active:tw-scale-95
              tw-cursor-pointer
              tw-w-full tw-text-left
              ${stat.highlight ? 'tw-ring-2 sm:tw-ring-3 tw-ring-yellow-400/60' : ''}
            `}
          >
            {stat.highlight && (
              <div className="tw-absolute tw-inset-0 tw-bg-yellow-500/20 tw-animate-pulse tw-rounded-xl sm:tw-rounded-2xl"></div>
            )}

            <div className="tw-absolute tw-top-3 tw-right-3 sm:tw-top-4 sm:tw-right-4 tw-text-3xl sm:tw-text-4xl md:tw-text-5xl lg:tw-text-6xl tw-opacity-90">
              {stat.icon}
            </div>

            <div className="tw-relative tw-z-10 tw-pt-4">
              <div className="tw-space-y-0.5">
                {Array.isArray(stat.label) ? (
                  stat.label.map((line, idx) => (
                    <p key={idx} className="tw-text-xs sm:tw-text-sm md:tw-text-base lg:tw-text-lg tw-opacity-90 tw-font-semibold tw-leading-tight">
                      {line}
                    </p>
                  ))
                ) : (
                  <p className="tw-text-xs sm:tw-text-sm md:tw-text-base lg:tw-text-lg tw-opacity-90">
                    {stat.label}
                  </p>
                )}
              </div>

              <p className="
                tw-text-3xl sm:tw-text-4xl md:tw-text-5xl lg:tw-text-6xl
                tw-font-bold
                tw-mt-3 sm:tw-mt-4 md:tw-mt-5
                tw-drop-shadow-lg
                tw-text-center
              ">
                {stat.value}
              </p>
            </div>
          </button>
        ))}
      </div>

      
      <div className="tw-grid tw-grid-cols-1 lg:tw-grid-cols-3 tw-gap-4">
        
        <div className="tw-bg-gray-900/50 tw-rounded-xl tw-p-4 tw-border tw-border-yellow-600/10">
          <h3 className="tw-text-yellow-400 tw-font-semibold tw-mb-3">Orders - Last 7 Days</h3>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={orders7Days}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#F59E0B" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        
        <div className="tw-bg-gray-900/50 tw-rounded-xl tw-p-4 tw-border tw-border-yellow-600/10">
          <h3 className="tw-text-yellow-400 tw-font-semibold tw-mb-3">Bulk vs Sample</h3>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={60} label>
                  {pieData.map((entry, index) => <Cell key={`c-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                </Pie>
                <Legend verticalAlign="bottom" height={36} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        
        <div className="tw-bg-gray-900/50 tw-rounded-xl tw-p-4 tw-border tw-border-yellow-600/10">
          <h3 className="tw-text-yellow-400 tw-font-semibold tw-mb-3">Status Distribution</h3>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#06B6D4" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      
      <div className="tw-bg-gray-900/50 tw-backdrop-blur-sm tw-rounded-lg tw-p-4 tw-border tw-border-yellow-600/20">
        <h2 className="tw-text-xl tw-font-bold tw-text-yellow-400 tw-mb-4">Recent Activity</h2>

        <div className="tw-space-y-3">
          {recentActivity.length > 0 ? (
            recentActivity.map((act, i) => (
              <div key={act.id || i} className="tw-flex tw-justify-between tw-items-start tw-bg-black/30 tw-p-3 tw-rounded-lg">
                <div className="tw-flex tw-items-start tw-gap-3">
                  <div className="tw-w-10 tw-h-10 tw-bg-yellow-500/20 tw-rounded-full tw-flex tw-items-center tw-justify-center">
                    {act.action.includes("Sample") ? "📦" : "💬"}
                  </div>
                  <div>
                    <p className="tw-text-white tw-font-semibold">{act.action}</p>
                    <p className="tw-text-yellow-300 tw-text-sm">by {act.user}</p>
                    <p className="tw-text-gray-400 tw-text-xs">{act.status}</p>
                  </div>
                </div>
                <div className="tw-text-xs tw-bg-yellow-700 tw-text-black tw-px-3 tw-py-1 tw-rounded-full">{act.time}</div>
              </div>
            ))
          ) : (
            <p className="tw-text-center tw-text-gray-500 tw-py-8">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  );
}
