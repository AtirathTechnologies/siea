from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import feedparser
import httpx
from datetime import datetime
import asyncio
import random
import razorpay
import requests
from bs4 import BeautifulSoup


app = FastAPI(title="Agriculture API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


razorpay_client = razorpay.Client(
    auth=("rzp_test_SE2aAHPiyM4C8R", "hbXSyV7Nar5ovhrHg17k1WHE")
)

FOOD_KEYWORDS = [
    "rice", "basmati", "paddy", "wheat", "grain", "cereal",
    "food", "agriculture", "agri", "crop", "harvest",
    "farmer", "kisan", "mandi", "msp",
    "export", "import", "procurement",
    "price", "yield", "production",
    "pulse", "dal", "maize", "corn",
    "farming", "cultivation"
]

BLOCK_KEYWORDS = [
    "election", "poll", "assembly", "minister", "party",
    "bjp", "congress", "cm", "prime minister",
    "murder", "killing", "shot dead", "encounter",
    "crime", "police", "court", "speaker"
]


RSS_SOURCES = [
    {
        "name": "Rice Market News",
        "url": "https://news.google.com/rss/search?q=rice+market+price+export+import+basmati&hl=en-US&gl=US&ceid=US:en",
        "keywords": ["rice", "basmati", "grain", "export", "import", "price"]
    },
    {
        "name": "Commodity Markets",
        "url": "https://feeds.reuters.com/reuters/commodities",
        "keywords": ["rice", "wheat", "grain", "agriculture", "commodity"]
    },
    {
        "name": "Agriculture News",
        "url": "https://www.agriculture.com/rss",
        "keywords": ["rice", "crop", "harvest", "farm", "agriculture"]
    },
    {
        "name": "Business Standard Commodities",
        "url": "https://www.business-standard.com/rss/markets-106.rss",
        "keywords": ["rice", "basmati", "export", "commodity"]
    },
    {
        "name": "The Hindu Business",
        "url": "https://www.thehindu.com/business/feeder/default.rss",
        "keywords": ["rice", "basmati", "export", "commodity", "agriculture"]
    },
    {
        "name": "Economic Times Markets",
        "url": "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms",
        "keywords": ["rice", "commodity", "export", "price"]
    }
]

INDIAN_AGRI_RSS_SOURCES = [
    {
        "name": "DGFT Official",
        "url": "https://dgft.gov.in/CP/",
        "type": "policy",
        "keywords": ["dgft", "export", "import", "policy", "notification", "circular"]
    },
    {
        "name": "Agriculture Ministry",
        "url": "https://pib.gov.in/RssMain.aspx?ModId=2&Lang=1&Regid=2",
        "type": "government",
        "keywords": ["agriculture", "farm", "farmer", "kisan", "crop", "subsidy", "msp"]
    },
    {
        "name": "Business Standard Agriculture",
        "url": "https://www.business-standard.com/rss/agriculture-106.rss",
        "type": "news",
        "keywords": ["agriculture", "farm", "crop", "rice", "wheat", "export", "import"]
    },
    {
        "name": "The Hindu Agriculture",
        "url": "https://www.thehindu.com/news/national/feeder/default.rss",
        "type": "news",
        "keywords": ["agriculture", "farm", "farmer", "crop", "mandi", "kisan"]
    },
    {
        "name": "Economic Times Agriculture",
        "url": "https://economictimes.indiatimes.com/rssfeeds/4719161.cms",
        "type": "news",
        "keywords": ["agriculture", "farm", "crop", "commodity", "export", "import"]
    }
]


@app.get("/")
def home():
    return {"message": "Agriculture API is running!"}

async def fetch_food_feed(source):
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(source["url"], timeout=20)

        feed = feedparser.parse(res.text)
        articles = []

        for entry in feed.entries[:20]:
            content = (entry.title + entry.get("summary", "")).lower()

            is_food = any(word in content for word in FOOD_KEYWORDS)
            is_blocked = any(word in content for word in BLOCK_KEYWORDS)

            if is_food and not is_blocked:
                articles.append({
                    "title": entry.title,
                    "summary": entry.get("summary", "")[:200],
                    "link": entry.link,
                    "published": entry.get("published", datetime.now().isoformat()),
                    "source": source["name"]
                })

        return articles

    except:
        return []

async def fetch_agri_feed(source):
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(source["url"], timeout=20)

        feed = feedparser.parse(res.text)
        articles = []

        for entry in feed.entries[:15]:
            articles.append({
                "title": entry.title,
                "summary": entry.get("summary", "")[:200],
                "link": entry.link,
                "published": entry.get("published", datetime.now().isoformat()),
                "source": source["name"]
            })

        return articles

    except:
        return []

@app.get("/rss")
async def get_rss():
    tasks = [fetch_food_feed(src) for src in RSS_SOURCES]
    results = await asyncio.gather(*tasks)

    all_articles = [item for sub in results for item in sub]
    all_articles.sort(key=lambda x: x["published"], reverse=True)

    unique_articles = []
    seen_titles = set()

    for article in all_articles:
        if article["title"] not in seen_titles:
            unique_articles.append(article)
            seen_titles.add(article["title"])

    return {
        "count": len(unique_articles),
        "articles": unique_articles[:10],
        "last_updated": datetime.now().isoformat()
    }


@app.get("/indian-agri-rss")
async def get_indian_agri_rss():
    tasks = [fetch_agri_feed(src) for src in INDIAN_AGRI_RSS_SOURCES]
    results = await asyncio.gather(*tasks)

    all_articles = [item for sub in results for item in sub]

    all_articles.sort(key=lambda x: x["published"], reverse=True)

    return {
        "count": len(all_articles),
        "articles": all_articles[:20],
        "last_updated": datetime.now().isoformat()
    }


@app.post("/create-razorpay-order")
def create_order(data: dict):
    try:
        amount = data.get("amount", 500)
        order = razorpay_client.order.create({
            "amount": amount,
            "currency": "INR",
            "payment_capture": 1
        })
        return {"success": True, "order": order}

    except Exception as e:
        return {"success": False, "error": str(e)}


@app.get("/health")
def health():
    return {
        "status": "running",
        "time": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
