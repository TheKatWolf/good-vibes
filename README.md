# Montgomery CEE: City Data as a Service (CDaaS)

**A Vibe-Coded Accountability Engine for Civic Investments**

**Team Good-Vibes:** Kat Wolfe & Jennifer Watters  (learning, completed project by vibe coding)
**Event:** GenAI Academy Hackathon - March 09, 2026  
**Challenge Track:** Workforce, Business & Economic Growth  
https://jenai.ca/montgomery-transparency-gap
---

## 🎯 The Transparency Gap
Meta, AWS, and DC BLOX pledged $1.63 billion and over 100 permanent, high-wage jobs to Montgomery. It is a massive civic win - but how does local government actually verify those promises? 

Right now, Economic Development Offices (EDOs) are forced to wait two years for lagging census data, long after the window to intervene has closed. City leaders are making billion-dollar bets blindfolded. 

**Montgomery CEE** solves this. We replace lagging guesswork with real-time accountability. We don't just visualize the economy - we score the promise.

---

## ⚙️ The Split Horizon Architecture
To eliminate AI hallucinations and provide mathematically grounded insights, CEE utilizes a three-tiered data architecture:

* **Layer 1: Municipal Baseline (The Ground Truth)**
    We ingest verifiable data directly from the **City of Montgomery Open Data Portal** (tracking new business licenses and commercial permits) and **FRED** (tracking baseline unemployment). 
* **Layer 2: Live Intent (Powered by Bright Data)**
    To bypass the census lag, we integrate the **Bright Data Web Unlocker**. We scour LinkedIn and local Montgomery job boards to pull real-time talent mobility metrics, new tech roles, and out-of-state relocation signals directly from the labor market.
* **Layer 3: Live AI Synthesis (Google AI Studio)**
    **Google AI Studio** synthesizes the live intent signals against the municipal baseline. This engine generates a live "AI Confidence Score" regarding corporate promises and triggers actionable civic interventions.

---

## 💡 Social Value & Active Intervention
CEE is not a passive dashboard. It is an active intervention engine designed for immediate civic ROI. 

If our Bright Data pipeline flags a 40% out-of-state relocation ratio for newly created tech roles, Google AI Studio immediately recommends triggering a local Alabama State University (ASU) hiring fair protocol. We catch the gap today so the city can intervene tomorrow - ensuring wealth is redirected back to Montgomery residents. 

---

## 🛠️ Tech Stack
* **Frontend UI:** Next.js, React, Tailwind CSS
* **Live Data Scraping:** Bright Data API
* **Government APIs:** City of Montgomery Open Data API, FRED API
* **AI Synthesis:** Google AI Studio

Live Data Sources
This platform synthesizes live data from four primary streams:

Bright Data (LinkedIn + Indeed job scraping)

FRED API (Federal Reserve economic data)

Montgomery Open Data Portal (ArcGIS Hub)

Anthropic Claude API (AI synthesis)

Running Locally
Prerequisites
Node.js 18+

npm

Setup
Clone the repo:

Bash
git clone https://github.com/YOUR_USERNAME/montgomery-transparency-gap
cd montgomery-transparency-gap
Install dependencies:

Bash
npm install
Create your .env file (see API Keys section below):

Bash
cp .env.example .env
Start the backend:

Bash
node server.js
Start the frontend (new terminal tab):

Bash
npm run dev
Open browser: http://localhost:5173

API Keys - How to Get Yours
You will need 4 API keys. Create a .env file in the root of the project and add each one:

1. Bright Data (Job Scraping - LinkedIn + Indeed)
This is the core data source. Required to pull live job postings.

Go to https://brightdata.com and create a free account.

Navigate to Proxies & Scraping -> Web Scraper API.

Create a new zone - name it anything (e.g., montgomeryjobs).

Copy your API key from the zone settings.

You will also need two Dataset IDs (These are public Bright Data dataset IDs - no setup needed):

LinkedIn Jobs: gd_lpfll7v5hcqtkxl6l

Indeed Jobs: gd_l4dx9j9sscpvs7no2

Add to .env:

Code snippet
BRIGHTDATA_API_KEY=your_key_here
2. FRED API (Federal Reserve Economic Data)
Free, no credit card required.

Go to https://fred.stlouisfed.org/docs/api/api_key.html

Create a free account.

Request an API key (instant approval).

Add to .env:

Code snippet
FRED_API_KEY=your_key_here
3. Anthropic Claude API (AI Synthesis)
Powers the live synthesis block. Requires credits (~$5 is plenty).

Go to https://console.anthropic.com

Create an account.

Navigate to API Keys -> Create Key.

Add billing credits (minimum $5) at Plans & Billing.

Add to .env:

Code snippet
ANTHROPIC_API_KEY=your_key_here
4. Montgomery Open Data
No API key required. Data is pulled directly from Montgomery's public ArcGIS Hub: https://data.montgomeryal.gov

.env File Format
Create a file called .env in the root directory:

Code snippet
BRIGHTDATA_API_KEY=your_brightdata_key
FRED_API_KEY=your_fred_key
ANTHROPIC_API_KEY=your_anthropic_key
Never commit this file. It is listed in .gitignore.

Tech Stack
Frontend: React + Vite

Backend: Node.js + Express

Charts: Recharts

Job Data: Bright Data (LinkedIn + Indeed scrapers)

Economic Data: FRED API

Civic Data: Montgomery Open Data Portal (ArcGIS)

AI Layer: Anthropic Claude API (Haiku)

Hosting: Vercel

Data Sources & Methodology
Job Postings: Scraped daily from LinkedIn and Indeed for Montgomery, AL using 10 keyword searches covering data center, cybersecurity, network engineering, and adjacent tech roles. Deduplicated by normalized title and company name.

Salary Data: Pulled directly from job posting salary ranges where disclosed. Average calculated across all postings with salary data.

Construction Data: Live from Montgomery's ArcGIS Hub, fiscal year Oct - Sep.

Business Licenses: Live from Montgomery Open Data Portal.

Unemployment: FRED BLS data, Montgomery Metro MSA.

Team
Built by Good Vibes - Kat Wolfe & Jennifer Watters
Built for GenAI Works - World Wide Vibes Hackathon, March 2026

🔍 Technical Methodology & Anticipated FAQ
To ensure total transparency in our engineering process, we have outlined the specific logic behind the Montgomery CEE architecture.

1. How do you prevent municipal API data from hallucinating massive spikes in the dashboard?
Targeted for IT Leadership & Data Governance (Tony Porterfield)
When pulling from the Montgomery Open Data Portal, a raw API call for "Business Licenses" returns historical, active, and renewed licenses - creating artificially massive numbers. To provide a true "Ripple Effect" metric, our backend specifically filters the API payload for new issuances only starting after the corporate commitment date, and filters by specific NAICS (North American Industry Classification System) codes related to commercial HVAC, logistics, and IT services. This ensures the dashboard reflects actual ecosystem growth, not administrative renewals.

2. Why use Bright Data instead of standard job board APIs?
Targeted for Developer Relations & Data Pipelines (Rafael Levi)
Standard job board APIs are notoriously delayed and heavily restricted. By utilizing the Bright Data Web Unlocker, we bypass standard anti-bot defenses on platforms like Dice and Indeed. This allows us to scrape unstructured, real-time intent signals - such as salary bands, active hiring surges, and candidate location updates. We aren't just counting job postings; we are scraping the metadata of the labor market to track the velocity of the $1.53B investment.

3. How does the platform differentiate between out-of-state relocations and local talent absorption?
Targeted for Civic Strategy & University Leadership (Bryn Bakoyema)
Tracking the raw number of jobs created is insufficient if those jobs bypass the citizens of Montgomery. Our web scraping pipeline includes targeted keyword matching against local university pipelines (e.g., "Alabama State University" and "Auburn University at Montgomery"). By cross-referencing new data center hires with these educational keywords and recent graduation years, we provide Economic Development Offices with a live "Local Absorption vs. Relocation" ratio to ensure civic equity.

4. What exactly is Google AI Studio doing in this architecture?
Targeted for GenAI Technical Judges (Janson Lim, Chris McMilan, Remus Ranca, Sam Cummings)
The core problem is that municipal data is structured but lagging, while web-scraped intent data is real-time but unstructured. Google AI Studio acts as the synthesis engine. It ingests the raw Bright Data JSON payloads (job postings, salary averages, relocation signals) and cross-references them against the static baselines (FRED unemployment, municipal permits). It then mathematically weights these signals to generate the dynamic AI Confidence Score for both Workforce Vitality and the Economic Ripple Effect.
