import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session
from database import engine, get_db, SessionLocal, Base
import models
from summarizer import generate_compliance_checklist

# Create the database tables
Base.metadata.create_all(bind=engine)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}
RBI_URL = "https://www.rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx"

# ---------------------------------------------------------
# BACKGROUND WORKER
# ---------------------------------------------------------
async def scrape_rbi_background():
    """Runs silently in the background to fetch new circulars periodically."""
    while True:
        print("🔍 [Background Worker] Scanning RBI for new circulars...")
        db = SessionLocal()
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(RBI_URL, headers=HEADERS, timeout=15.0)
                if response.status_code == 200:
                    soup = BeautifulSoup(response.text, "html.parser")
                    table_rows = soup.select("table.tablebg tr") 
                    new_count = 0
                    
                    for row in table_rows:
                        link_tag = row.find("a")
                        if link_tag and link_tag.text.strip():
                            title = link_tag.text.strip()
                            link = link_tag["href"]
                            full_link = link if link.startswith("http") else f"https://www.rbi.org.in/Scripts/{link}"
                            
                            existing = db.query(models.Circular).filter(models.Circular.title == title).first()
                            if not existing:
                                new_circ = models.Circular(title=title, link=full_link)
                                db.add(new_circ)
                                new_count += 1
                                print(f"✅ [New Circular Saved]: {title}")
                    
                    db.commit()
                    if new_count == 0:
                        print("💤 [Background Worker] No new circulars. Sleeping...")
        except Exception as e:
            print(f"⚠️ [Background Worker] Scrape failed: {e}")
        finally:
            db.close()
        
        # Sleep for 1 hour (3600 seconds) before checking again
        await asyncio.sleep(3600)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start the background task when the server boots
    scraper_task = asyncio.create_task(scrape_rbi_background())
    yield
    # Safely shut it down when you kill the server
    scraper_task.cancel()

# ---------------------------------------------------------
# FASTAPI APP
# ---------------------------------------------------------
app = FastAPI(title="RegTech Compliance API", version="1.2", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CircularRequest(BaseModel):
    title: str
    link: str = ""
    content: str = "Pending PDF extraction"

@app.get("/")
def read_root():
    return {"status": "RegTech Engine is live.", "version": "1.2"}

@app.get("/api/fetch-circulars")
async def fetch_rbi_circulars(db: Session = Depends(get_db)):
    """Simply returns the latest 20 circulars directly from the database."""
    db_circulars = db.query(models.Circular).order_by(models.Circular.id.desc()).limit(20).all()
    return {
        "count": len(db_circulars), 
        "data": [{"title": c.title, "link": c.link, "summary": c.summary} for c in db_circulars]
    }

@app.post("/api/analyze-circular")
async def analyze_circular(request: CircularRequest, db: Session = Depends(get_db)):
    """Checks DB for summary. If missing, deep-scrapes the document, runs LangChain, and saves it."""
    try:
        db_circ = db.query(models.Circular).filter(models.Circular.title == request.title).first()
        
        if db_circ and db_circ.summary:
            return {"title": request.title, "compliance_summary": db_circ.summary}

        actual_content = request.content
        if request.link and request.link.startswith("http"):
            async with httpx.AsyncClient() as client:
                try:
                    res = await client.get(request.link, headers=HEADERS, timeout=15.0)
                    if res.status_code == 200:
                        soup = BeautifulSoup(res.text, "html.parser")
                        paragraphs = soup.find_all("p")
                        extracted_text = " ".join([p.text.strip() for p in paragraphs if p.text.strip()])
                        if extracted_text:
                            actual_content = extracted_text[:6000] 
                except Exception as e:
                    print(f"Deep scraping failed for {request.link}: {e}")

        summary = generate_compliance_checklist(title=request.title, content=actual_content)
        
        if db_circ:
            db_circ.summary = summary
            db.commit()
            
        return {"title": request.title, "compliance_summary": summary}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Engine Error: {str(e)}")