# good-vibes
Built by team Good Vibes for the 2026 GenAI Academy Hackathon. The 'City of Montgomery Economic Engine' uses Google Antigravity to fuse live corporate intent signals with historical municipal data. This real - time platform forecasts economic momentum, empowering EDOs, investors, and citizens to make data-driven civic decisions.
🏛️ City of Montgomery Economic Engine

**A real-time, AI-driven civic intelligence and economic forecasting platform.**
*Built by Kat Wolfe and Jennifer Watters for the 2026 GenAI Academy Global Hackathon.*

📌 The Vision

Economic Development Organizations (EDOs) and city planners are forced to build the cities of tomorrow using lagging census data from last year. The **City of Montgomery Economic Engine** solves this by fusing deep historical municipal data with live, web - scraped corporate intent signals. Powered by Google Antigravity, this platform provides a daily momentum index and a 365 - day predictive forecast, transforming how Montgomery attracts capital, supports its citizens, and negotiates with hyperscale data centers.

👥 Persona - Driven Architecture

The dashboard dynamically shifts its data visualizations based on four distinct user profiles:

1. **EDOs:** Tracking live job velocity, corporate intent, and business licenses to win site selectors.
2. **Investors & Developers:** Validating commercial real estate absorption rates and building permits.
3. **Citizens & Relocators:** Assessing hyper - local survival metrics like active housing inventory, student - to - teacher ratios, and neighborhood safety scores.
4. **City Planners:** Monitoring 311/911 infrastructure strain and ensuring inclusive wealth growth.

⚙️ The Data Engine & AI Pipelines

To achieve daily forecasting without hallucination, our backend orchestrates three distinct data pipelines into the Google Antigravity engine.

### Pipeline A: Bright Data Web Scraper (Live Intent Velocity)

* **Constraint:** Strictly filters for web signals from **January 1, 2025, onward** to guarantee maximum freshness and processing speed.
* **Data:** Job posting velocity, salary bands, active rent/buy housing inventory, real - time Cost of Living (COL) index, and corporate relocation intent keywords.

### Pipeline B: Montgomery Open Data (Municipal Baseline)

* **Transactional (Live):** New business licenses and building permits (using exact issue dates).
* **Batched (Lagging):** 311 infrastructure and 911 emergency dispatch volumes. *Antigravity mathematically interpolates these monthly batches into a smooth daily run - rate.*

### Pipeline C: Federal APIs (Macro Structure)

* **Data:** Median household income, poverty estimates, unemployment rates (FRED), and school district ratings (GreatSchools).

### The Antigravity AI Orchestrator

Google Antigravity ingests these three pipelines, overlays the live transactional data onto the interpolated historical baselines, and calculates a daily 0 to 100 momentum score across six civic categories. It then generates a 365 - day predictive forecast array (`isForecast: true`) and pushes the final JSON to Firebase.

🛠️ Core Features & Tools

* **Interactive Time - Series Forecasting:** Toggle between *Historical Statistics* (Jan 1, 2025 - Present) and *Future Trends* (1 - Year Projections).
* **AI Site Selector & Relocation Chatbot:** A RAG - powered assistant that answers hyper - local queries (e.g., "Which neighborhoods have the best walkability and home prices under $300k?").
* **Hyperscaler ROI Simulator:** An interactive widget allowing city planners to adjust data center water usage, grid draw, and tax abatements to instantly calculate the net fiscal impact on the city.

💻 Tech Stack & UI/UX Guidelines

* **Frontend:** Next.js, React, Recharts (optimized for massive time - series data volume).
* **Backend / Database:** Firebase Firestore.
* **AI / Orchestration:** Google Antigravity.
* **Data Extraction:** Bright Data Web Unlockers, City of Montgomery ArcGIS.
* **Brand Styling:** Strictly adheres to official Montgomery municipal hex codes: Navy (`#032045`), Gold (`#B98646`), and Gray (`#343434`).

🚀 Local Development Setup

1. **Clone the repository:**
```bash
git clone https://github.com/your-org/montgomery-economic-engine.git

```


2. **Install dependencies:**
```bash
npm install

```


3. **Configure Environment Variables:**
Create a `.env.local` file in the root directory and add your keys:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_key
BRIGHT_DATA_API_KEY=your_bright_data_key
GOOGLE_ANTIGRAVITY_API_KEY=your_antigravity_key

```


4. **Run the development server:**
```bash
npm run dev

```


5. Open [http://localhost:3000](https://www.google.com/search?q=http://localhost:3000) with your browser to see the result.
