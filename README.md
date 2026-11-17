# RegTech Intelligence Platform

> Turn dense RBI circulars into clear, actionable compliance checklists.

An enterprise-grade regulatory technology (RegTech) dashboard for the Indian FinTech ecosystem. The platform monitors Reserve Bank of India (RBI) circulars, ingests the full regulatory text, and uses a 120B-parameter LLM to produce structured compliance checklists.

<!-- Add a screenshot after your first run:
![Dashboard screenshot](docs/dashboard.png)
-->

## Features

- **Autonomous background scraping.** A FastAPI background worker monitors the RBI press release portal and saves new circulars to a local SQLite database, with no manual steps.
- **Deep text extraction.** Opens each circular link and extracts the actual regulatory text with BeautifulSoup, instead of analyzing titles alone.
- **120B AI compliance engine.** Uses LangChain with the Groq API (`openai/gpt-oss-120b`) to summarize mandates, identify affected entities and generate structured checklists.
- **Intelligent caching.** Stores AI summaries in the database, so repeat requests skip the LLM. This avoids redundant API calls and rate limits, and repeat loads are instant.
- **Polished dashboard.** A responsive Next.js interface with category tags, live loading states and print-to-PDF export.

## Tech stack

| Layer | Technologies |
| --- | --- |
| Frontend | Next.js 15 (App Router), React, Tailwind CSS, Lucide React |
| Backend | Python 3.10+, FastAPI, SQLAlchemy, SQLite |
| AI | LangChain, Groq API (`openai/gpt-oss-120b`) |
| Scraping | BeautifulSoup4, HTTPX (async) |
| Tooling | `uv` (fast Python package manager) |

## Getting started

### Prerequisites

- Python 3.10 or newer
- Node.js 18 or newer
- [`uv`](https://docs.astral.sh/uv/) installed
- A [Groq API key](https://console.groq.com/keys)

### 1. Clone the repository

```bash
git clone https://github.com/imomchaubey/regtech-compliance-engine.git
cd regtech-compliance-engine
```

### 2. Set up the backend

```bash
cd backend
uv venv
```

Activate the virtual environment:

```bash
# Windows
.\.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate
```

Install the dependencies:

```bash
uv pip install fastapi uvicorn httpx beautifulsoup4 python-dotenv pydantic sqlalchemy langchain langchain-groq
```

Create a `.env` file inside `backend/`:

```env
GROQ_API_KEY=your_groq_api_key_here
```

Start the server:

```bash
uvicorn main:app --reload
```

The API runs at `http://127.0.0.1:8000`. The background worker starts scanning the RBI portal as soon as the server boots.

### 3. Set up the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The dashboard runs at `http://localhost:3000`.

To point the frontend at a different backend, create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

## Usage

1. Make sure both the backend and the frontend are running.
2. Open <http://localhost:3000>. The dashboard lists the latest RBI circulars.
3. Click a circular in the list. The backend fetches the full text and runs the AI analysis.
4. Read the compliance summary, then use **Copy summary** or **Print or save as PDF** to share it.

Reviewed circulars are cached, so opening one again loads instantly. Use **Run again** to regenerate a summary.

## API reference

Interactive docs are available at <http://127.0.0.1:8000/docs> (Swagger UI).

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/fetch-circulars` | Returns the latest circulars stored in the database |
| `POST` | `/api/analyze-circular` | Extracts the circular text and returns the AI compliance summary |

## Project structure

```text
regtech-compliance-engine/
├── backend/
│   ├── main.py            # FastAPI app, routes and background worker
│   ├── database.py        # SQLAlchemy + SQLite connection
│   ├── models.py          # Database schema for circulars
│   ├── summarizer.py      # LangChain + Groq LLM logic
│   └── .env               # API keys (not tracked in Git)
├── frontend/
│   ├── src/app/page.tsx   # Main dashboard UI
│   ├── package.json       # Node dependencies
│   └── tailwind.config.ts # Styling configuration
└── .gitignore
```

## Roadmap

- [ ] Full PDF text extraction for circulars published as attachments
- [ ] Export compliance tasks to Jira
- [ ] Email alerts for new high-impact circulars

## Author

**Om Prakash Chaubey**
[GitHub](https://github.com/imomchaubey) · [LinkedIn](https://www.linkedin.com/in/ochaubey) · [Portfolio](https://om-prakash-chaubey.vercel.app/)