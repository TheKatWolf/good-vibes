# 🏛️ City of Montgomery Economic Engine

**A real-time, AI-driven civic intelligence and economic forecasting platform.**
*Built by Team Good - Vibes for the 2026 GenAI Academy Global Hackathon.*
CEE (City Economic Engine) is the name of the app and it plays on the word "see".

## 📌 The Vision
Economic development and city planning currently rely on heavily fragmented, lagging data. The **City of Montgomery Economic Engine** solves this by fusing deep historical municipal data with live, web - scraped corporate intent signals. Powered by Google Antigravity, this platform provides a daily momentum index and a 365 - day predictive forecast, transforming how Montgomery attracts capital, supports its citizens, and negotiates with hyperscale data centers.

## 👥 Persona - Driven Architecture (Target ICPs)
The dashboard dynamically shifts its data visualizations and tools to serve four distinct Ideal Customer Profiles shaping the city's future:
1. **Economic Development Organizations (EDOs):** Tracking live job velocity, corporate intent, and business licenses to win site selectors and negotiate tech investments.
2. **Commercial Real Estate Investors & Developers:** Validating capital risk by analyzing commercial building permits, zoning lookups, and real - time lease absorption rates.
3. **Citizens & Relocators:** Assessing hyper - local survival metrics like active housing inventory, student - to - teacher ratios, and neighborhood safety scores.
4. **City Planners & IT Leadership:** Monitoring 311/911 infrastructure strain, predicting municipal service loads, and ensuring inclusive wealth growth.

## ⚙️ The Data Engine & AI Pipelines
To achieve daily forecasting without hallucination, our backend employs a **"Split Horizon"** architecture. It orchestrates three distinct data pipelines into the Google Antigravity engine, ensuring both deep historical context and lightning - fast current signals.

### Pipeline A: Bright Data Web Scraper (Live Intent Velocity)
* **Constraint:** Strictly filters for web signals from **January 1, 2025, onward** to guarantee maximum freshness, processing speed, and relevance for our GTM trends reporting.
* **Data:** Job posting velocity, salary bands, active rent/buy housing inventory, real - time Cost of Living (COL) index, and corporate relocation intent keywords.

### Pipeline B: Montgomery Open Data (Municipal Baseline)
* **Constraint:** Pulls structural historical data from **January 1, 2021, onward** to establish a reliable 5 - year civic baseline capturing the post - pandemic economic recovery.
* **Transactional (Live):** New business licenses and building permits (using exact issue dates).
* **Batched (Lagging):** 311 infrastructure and 911 emergency dispatch volumes. *Antigravity mathematically interpolates these monthly batches into a smooth daily run - rate.*

### Pipeline C: Federal APIs (Macro Structure)
* **Constraint:** Pulls structural historical data from **January 1, 2021, onward**.
* **Data:** Median household income, poverty estimates, unemployment rates (FRED), and school district ratings (GreatSchools). 

### The Antigravity AI Orchestrator
Google Antigravity ingests these three pipelines. It interpolates the historical Municipal and Macro data (2021 baseline), overlays the live Bright Data web signals (2025 baseline), and calculates a daily 0 to 100 momentum score across six civic categories. It then generates a 365 - day predictive forecast array (`isForecast: true`) and pushes the final JSON to Firebase.

## 🛠️ Core Features & Tools
* **Interactive Time - Series Forecasting:** Toggle between *Historical Statistics* (Jan 1, 2021 - Present) and *Future Trends* (1 - Year Projections).
* **AI Site Selector & Relocation Chatbot:** A RAG - powered assistant that answers hyper - local queries (e.g., "Which neighborhoods have the best walkability and home prices under $300k?").
* **Hyperscaler ROI Simulator:** An interactive widget allowing city planners to adjust data center water usage, grid draw, and tax abatements to instantly calculate the net fiscal impact on the city.

## 💻 Tech Stack & UI/UX Guidelines
* **Frontend:** Next.js, React, Recharts.
* **Backend / Database:** Firebase Firestore.
* **AI / Orchestration:** Google Antigravity.
* **Data Extraction:** Bright Data Web Unlockers, City of Montgomery ArcGIS.
* **Brand Styling:** Strictly adheres to official Montgomery municipal hex codes: Navy (`#032045`), Gold (`#B98646`), and Gray (`#343434`).

## 🚀 Local Development Setup

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/your-org/good-vibes.git](https://github.com/your-org/good-vibes.git)

🟢 Live Demo: Click here to view the active dashboard
