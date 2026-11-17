# RegTech Intelligence Platform

An enterprise-grade regulatory technology (RegTech) dashboard designed for the Indian FinTech ecosystem. This platform autonomously monitors, ingests, and analyzes Reserve Bank of India (RBI) circulars, transforming dense legal text into actionable compliance checklists using a 120B parameter LLM.

## 🚀 Key Features

*   **Autonomous Background Scraping:** A FastAPI background worker continuously monitors the RBI press release portal, automatically saving new circulars to a local SQLite database without manual intervention.
*   **Deep Text Extraction:** Bypasses simple title analysis by navigating to individual circular links and extracting the actual regulatory text using `BeautifulSoup`.
*   **120B AI Compliance Engine:** Integrates LangChain with the Groq API (`openai/gpt-oss-120b`) to synthesize regulatory mandates, identify affected entities, and generate structured compliance checklists.
*   **Intelligent Caching:** Persists AI summaries in the database to eliminate redundant LLM API calls, mitigating rate limits and ensuring instant load times on subsequent requests.
*   **Enterprise UI:** A highly polished, responsive Next.js dashboard featuring categorical tagging, real-time analysis loading states, and native print-to-PDF export capabilities.

## 🛠️ Tech Stack

**Frontend:**
*   Next.js 15 (App Router)
*   React & Tailwind CSS
*   Lucide React (Icons)

**Backend & AI:**
*   Python 3.10+ & FastAPI
*   LangChain & Groq API 
*   SQLAlchemy & SQLite
*   BeautifulSoup4 & HTTPX (Asynchronous Scraping)
*   `uv` (Ultra-fast Python package manager)

## ⚙️ Local Setup & Installation

### 1. Clone the Repository
```bash
git clone [https://github.com/imomchaubey/regtech-compliance-engine.git](https://github.com/imomchaubey/regtech-compliance-engine.git)
cd regtech-compliance-engine

2. Backend Setup
Navigate to the backend directory and configure the Python environment:

cd backend
uv venv
# Activate the virtual environment
# Windows: .\.venv\Scripts\activate
# Mac/Linux: source .venv/bin/activate

# Install dependencies
uv pip install fastapi uvicorn httpx beautifulsoup4 python-dotenv pydantic sqlalchemy langchain langchain-groq


Create a .env file in the backend directory and add your Groq API key:
GROQ_API_KEY=your_groq_api_key_here

uvicorn main:app --reload

Note: The background worker will immediately begin scanning the RBI portal upon startup.

3. Frontend Setup
Open a new terminal window, navigate to the frontend directory, and install dependencies:
cd frontend
npm install
npm run dev

📂 Project Structure

regtech-compliance-engine/
├── backend/
│   ├── main.py              # FastAPI app, routing, and background worker
│   ├── database.py          # SQLAlchemy SQLite connection setup
│   ├── models.py            # Database schema for circulars
│   ├── summarizer.py        # LangChain & Groq LLM logic
│   └── .env                 # API keys (Not tracked in Git)
├── frontend/
│   ├── src/app/page.tsx     # Main Next.js dashboard UI
│   ├── package.json         # Node dependencies
│   └── tailwind.config.ts   # UI styling configurations
└── .gitignore

📖 Usage
Ensure both the backend and frontend servers are running.

Open http://localhost:3000 in your browser.

The dashboard will display the latest RBI circulars fetched by the backend.

Click Generate Checklist (or the respective circular button) to run the deep-scraper and LLM analysis.

Click Print or save as PDF to export a clean compliance report.
