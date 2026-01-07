import React, { useState, useEffect, useRef } from "react";
import { ExternalLink } from "lucide-react";

const IndianAgriRSSFeed = () => {
  const [feeds, setFeeds] = useState([
    {
      id: 1,
      title: "Loading Indian Agriculture & DGFT updates...",
      link: "#",
      source: "DGFT",
      type: "policy"
    }
  ]);
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollContainerRef = useRef(null);
  const animationRef = useRef(null);
  const scrollPositionRef = useRef(0);

  // Use relative URL for production, localhost for development
 const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;


  useEffect(() => {
    console.log("IndianAgriRSSFeed mounted, fetching feeds from:", API_BASE_URL);
    fetchFeeds();
    const interval = setInterval(fetchFeeds, 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  useEffect(() => {
    console.log("Feeds updated:", feeds.length, "items");
    console.log("Paused state:", paused);

    if (!paused && feeds.length > 0) {
      startScrolling();
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }

    // Restart scrolling when feeds change
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [paused, feeds]);

  const scrollXRef = useRef(0);
  const lastTimeRef = useRef(null);



  const startScrolling = () => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const SPEED = 0.04; // adjust speed here

    const animate = (time) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const delta = time - lastTimeRef.current;
      lastTimeRef.current = time;

      scrollXRef.current -= delta * SPEED;

      const halfWidth = container.scrollWidth / 2;

      // 🔁 infinite seamless loop
      if (Math.abs(scrollXRef.current) >= halfWidth) {
        scrollXRef.current = 0;
      }

      container.style.transform = `translateX(${scrollXRef.current}px)`;

      if (!paused) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };



  const fetchFeeds = async () => {
    setLoading(true);
    try {
      console.log("Fetching feeds from:", `${API_BASE_URL}/indian-agri-rss`);
      const response = await fetch(`${API_BASE_URL}/indian-agri-rss`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log("API Response:", data);

      if (data?.articles?.length > 0) {
        const enhancedFeeds = data.articles.map((article, i) => ({
          id: i,
          title: article.title,
          link: article.link,
          source: article.source,
          type: getArticleType(article.title)
        }));
        console.log("Setting enhanced feeds:", enhancedFeeds.length);
        setFeeds(enhancedFeeds);
      } else {
        console.log("No articles in response, using fallback");
        useFallbackFeeds();
      }
    } catch (err) {
      console.error("Error fetching feeds:", err);
      useFallbackFeeds();
    } finally {
      setLoading(false);
    }
  };

  const useFallbackFeeds = () => {
    const fallbackFeeds = [
      {
        id: 1,
        title: `DGFT ${getRandomPolicyAction()} ${getRandomTrend()} agricultural exports`,
        link: "https://dgft.gov.in",
        source: "DGFT Official",
        type: "policy"
      },
      {
        id: 2,
        title: `Government ${getRandomSubsidyAction()} ${getRandomCrop()} farmers`,
        link: "https://pib.gov.in",
        source: "Agriculture Ministry",
        type: "subsidy"
      },
      {
        id: 3,
        title: `India's agricultural exports ${getRandomTrend()} by ${getRandomPercentage()}`,
        link: "https://tradestat.commerce.gov.in",
        source: "Trade Analysis",
        type: "trade"
      },
      {
        id: 4,
        title: `New MSP rates ${getRandomTrend()} for ${getRandomCrop()}`,
        link: "https://agricoop.gov.in",
        source: "CACP",
        type: "msp"
      },
      {
        id: 5,
        title: `Agricultural ${getRandomRegistrationType()} registrations cross ${getRandomNumber()} mark`,
        link: "https://apeda.gov.in",
        source: "DGFT Portal",
        type: "registration"
      }
    ];
    setFeeds(fallbackFeeds);
  };

  const handleFeedClick = (feed, event) => {
    event.preventDefault();
    event.stopPropagation();

    if (feed.link && feed.link !== "#") {
      setTimeout(() => {
        window.open(feed.link, "_blank", "noopener,noreferrer");
      }, 10);
    }
  };

  const getArticleType = (title) => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('dgft') || lowerTitle.includes('export policy') || lowerTitle.includes('import')) return 'policy';
    if (lowerTitle.includes('subsidy') || lowerTitle.includes('incentive') || lowerTitle.includes('scheme')) return 'subsidy';
    if (lowerTitle.includes('export') || lowerTitle.includes('import') || lowerTitle.includes('trade')) return 'trade';
    if (lowerTitle.includes('msp') || lowerTitle.includes('minimum support')) return 'msp';
    if (lowerTitle.includes('registration') || lowerTitle.includes('license') || lowerTitle.includes('permit')) return 'registration';
    if (lowerTitle.includes('kisan') || lowerTitle.includes('farmer') || lowerTitle.includes('mandi')) return 'farmer';
    return 'general';
  };


  return (
    <div className="IndianAgriRSSFeed" style={{
      borderBottom: '2px solid rgba(255, 215, 0, 0.3)',
      color: 'white',
      overflow: 'hidden',
      width: '100%',
      padding: '8px 0',
      marginBottom: '10px',
      position: 'relative',
      zIndex: 40
    }}>
      <div className="scrolling-container" style={{ 
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        minHeight: '40px',
        display: 'flex',
        alignItems: 'center'
      }}>
        <div
          ref={scrollContainerRef}
          className="flex gap-8 text-sm font-medium py-1.5"
          style={{
            whiteSpace: 'nowrap',
            display: 'inline-flex',
            willChange: 'transform',
            paddingLeft: '100%'
          }}
          onMouseEnter={() => {
            setPaused(true);
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
          }}

          onMouseLeave={() => {
            setPaused(false);
            lastTimeRef.current = null; // resume smoothly
          }}>
          {[...feeds, ...feeds].map((feed, i) => (
            <div
              key={`${feed.id}-${i}`}
              className={`flex items-center gap-3 transition-all duration-300 px-4 py-2 rounded-lg border border-transparent hover:bg-white/10 hover:border-white/20 ${feed.link && feed.link !== "#"
                ? 'hover:text-yellow-300 cursor-pointer'
                : 'cursor-not-allowed opacity-70'
                }`}
              onClick={(e) => feed.link && feed.link !== "#" && handleFeedClick(feed, e)}
              style={{
                flexShrink: 0,
                backgroundColor: 'rgba(255, 255, 255, 0.05)'
              }}
            >
              <span className="text-lg">
                {/* {getTypeIcon(feed.type)} */}
              </span>
              <strong className={`font-semibold ${feed.link && feed.link !== "#"
                ? 'group-hover:text-yellow-300'
                : 'opacity-70'
                }`}>
                {feed.title}
              </strong>
             
            </div>
          ))}
        </div>
        {loading && (
          <div style={{
            position: 'absolute',
            right: '10px',
            fontSize: '10px',
            opacity: 0.7
          }}>
            Loading...
          </div>
        )}
      </div>
    </div >
  );
};

// Keep all your random generation functions (getRandomPolicyAction, etc.)
const getRandomPolicyAction = () => {
  const actions = ['updates', 'notifies', 'revises', 'announces', 'implements', 'extends'];
  return actions[Math.floor(Math.random() * actions.length)];
};

const getRandomSubsidyAction = () => {
  const actions = ['announces', 'extends', 'launches', 'increases', 'approves', 'releases'];
  return actions[Math.floor(Math.random() * actions.length)];
};

const getRandomCrop = () => {
  const crops = ['rice', 'wheat', 'pulses', 'cotton', 'sugarcane', 'maize', 'soybean', 'millets'];
  return crops[Math.floor(Math.random() * crops.length)];
};

const getRandomTrend = () => {
  const trends = ['strengthens', 'improves', 'rises', 'increases', 'stabilizes', 'boosts', 'supports', 'enhances'];
  return trends[Math.floor(Math.random() * trends.length)];
};

const getRandomPercentage = () => {
  const percentages = ['12%', '15%', '8%', '20%', '25%', '10%', '18%', '22%'];
  return percentages[Math.floor(Math.random() * percentages.length)];
};

const getRandomNumber = () => {
  const numbers = ['1 million', '2.5 million', '5 lakh', '10 lakh', '50,000', '1.2 million'];
  return numbers[Math.floor(Math.random() * numbers.length)];
};

const getRandomRegistrationType = () => {
  const types = ['export', 'import', 'quality', 'organic', 'APEDA', 'FSSAI'];
  return types[Math.floor(Math.random() * types.length)];
};

export default IndianAgriRSSFeed;