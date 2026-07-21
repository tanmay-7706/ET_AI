# Digital Public Safety Shield

*Live scam interception and fraud convergence mapping for a safer digital India.*

<!-- TODO: add demo GIF/screenshot here after recording -->

## Problem Statement

This prototype was built for the **ET AI Hackathon 2026** under **Problem Statement 6: AI for Digital Public Safety**. It specifically targets the alarming rise in "digital arrest" scams and their unexpected convergence with counterfeit currency circulation networks.

## What Makes This Different

- **Live Session Interception:** Instead of post-hoc detection, the system continuously analyzes active call/text streams in real-time, intercepting threats before financial damage occurs.
- **Shared Entity Graph:** A force-directed knowledge graph maps relationships between flagged entities, connecting organized scam networks directly to counterfeit currency circulation hubs.
- **RAG-Grounded Citizen Answers:** The public-facing "Citizen Shield" chatbot grounds its responses in real regulatory advisories (RBI, MHA, NCRB), providing users with transparent citations and reliable guidance.
- **Auto-Generated Evidence Packages:** Court-admissible style dossiers are assembled automatically, linking related sessions and entities into chronological, source-cited timelines available as PDF exports.

## Architecture

The platform operates across four primary layers: 
1. **Client Surfaces:** A Next.js frontend split into an authenticated Command Center for officers and a public-facing Citizen Shield.
2. **Inngest Event Orchestration:** A robust background job system that coordinates multi-step agent workflows safely and reliably.
3. **Convex Data/RAG Layer:** The realtime backend and vector database that powers live updates, graph storage, and semantic search for advisories.
4. **External AI Providers:** Deep integrations with state-of-the-art models for specialized tasks (Gemini via Google AI Studio, multiple models via OpenRouter).

### AI Agent Swarm
- **Classifier Agent:** Analyzes raw session transcripts to detect threat vectors and assign risk scores.
- **Graph Agent:** Traverses the database to discover hidden convergence edges between seemingly unrelated entities.
- **Evidence Agent:** Compiles chronological dossiers from raw session and entity data.
- **Alerts Agent:** Generates simulated multi-channel dispatch alerts for critical threats.
- **Incident Pattern Agent:** Analyzes temporal and geographic data to identify broader trends.
- **Counterfeit Vision Agent:** Analyzes images to detect forged currency signatures.

## Tech Stack

- **Frontend:** Next.js 15, Tailwind CSS
- **Backend/Data:** Convex (Realtime Database & Vector Search), Inngest (Event Orchestration)
- **Auth:** Clerk
- **AI/ML:** OpenRouter, Gemini API
- **Infra:** Upstash Redis (Sliding Window Rate Limiting)

## Key Features

- Live risk scoring with visible AI reasoning
- Force-directed fraud network graph with a highlighted convergence edge
- Live threat map plotting geographic hotspots
- RAG-grounded citizen chat with regional language support (English & Hindi)
- Exportable PDF evidence packages
- Officer-only role-gated command center
- Simulated multi-channel alert dispatch
- Rate-limited public API endpoints

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/tanmay-7706/ET_AI.git
   cd ET_AI
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Variables**
   Create a `.env.local` file in the root directory and add the following keys (do not commit this file):
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
   CLERK_SECRET_KEY=
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=
   NEXT_PUBLIC_CONVEX_URL=
   NEXT_PUBLIC_CONVEX_SITE_URL=
   GEMINI_API_KEY=
   OPENROUTER_API_KEY=
   UPSTASH_REDIS_REST_URL=
   UPSTASH_REDIS_REST_TOKEN=
   INNGEST_SIGNING_KEY=
   INNGEST_EVENT_KEY=
   ```

4. **Start the Convex backend**
   ```bash
   npx convex dev
   ```

5. **Seed the database (Optional but recommended)**
   ```bash
   npx convex run setup:seedMockData
   ```

6. **Start the Next.js development server**
   ```bash
   npm run dev
   ```

## Testing

The project maintains high code quality standards. Run the following commands to verify:

- **Unit Tests:** `npm test`
- **Linting:** `npm run lint`
- **Type Checking:** `npx tsc --noEmit`

## Project Structure

```text
ET_AI/
├── app/               # Next.js App Router (Pages, API Routes)
├── components/        # Reusable UI Components
├── convex/            # Convex Backend Schema, Queries, Mutations
├── lib/               # Core Utilities, AI Agents, and Testing
├── middleware.ts      # Clerk Authentication Middleware
├── package.json       # Dependencies and Scripts
└── tailwind.config.ts # Tailwind CSS Configuration
```

## Disclaimer

**IMPORTANT:** This is a hackathon prototype built on simulated data. It is NOT connected to any real law enforcement, banking, or telecom system. The AI-generated verdicts and simulated evidence packages are for demonstration purposes only and should not be used in production or relied upon for real-world legal or financial decisions.

## Credits

Built for the ET AI Hackathon 2026 by Tanmay Singh ([@tanmay-7706](https://github.com/tanmay-7706)).
