# 🎙️ VyaparVaani AI (व्यापार वाणी / વ્યાપાર વાણી)
### Multilingual Voice-First Business Assistant for Indian Small Businesses
> **Build for Bharat — Round 2 Build Submission**  
> **Theme:** Livelihoods and small business  
> **Participant:** Nandani Ramoliya  
> **Tagline:** *"Speak naturally. Let AI understand. Get business tasks done."*

---

## 🌟 Executive Summary

In India's vibrant Tier-2 and Tier-3 commercial hubs (such as Surat, Ahmedabad, Rajkot, Jaipur, and Indore), millions of small business owners—garment wholesalers, textile merchants, boutique owners, and kirana store proprietors—manage daily business through:
* **WhatsApp chats and audio voice notes**
* **Handwritten notebooks (*Chopda*)**
* **Verbal promises and mental memory**

Traditional business software fails these merchants because it demands complex typing, English fluency, and tedious multi-step form submissions.

**VyaparVaani AI** solves this with a voice-first operating system. Merchants speak in **English, Hindi (हिन्दी / Hinglish), or Gujarati (ગુજરાતી / Gujlish)** to create orders, schedule client follow-up reminders, register new customers, and check daily revenue—hands-free.

---

## 🔑 Crucial Guarantee: Zero-Key Ready (Runs Out-of-the-Box)

The project has been engineered specifically to satisfy the **Build for Bharat submission rules**:
> *"Code on GitHub: Public, and starts without any secret keys."*

* **100% Offline / Zero-Key by Default:** Uses a built-in deterministic multilingual NLP extraction engine. Evaluators and hackathon judges can clone the repository and run it immediately without entering any paid OpenAI or Gemini API keys.
* **Auto-Seeded Local Storage:** Includes SQLite database pre-seeded with realistic Indian small business records (Rahul Sharma Garments Surat, Priya Patel Ahmedabad Boutique, Suresh Verma Rajkot).
* **Optional Cloud LLM Hook:** If `GEMINI_API_KEY` or `OPENAI_API_KEY` is provided in `.env`, the system automatically leverages cloud LLMs for free-form intent reasoning.

---

## ⚡ The Core Demo Workflow (Voice-to-Order)

The primary demo workflow is fully functional end-to-end:

```
[Merchants Speaks]
"Add an order for Rahul. 20 shirts, total 15000 rupees."
         │
         ▼
[Web Speech API Recognition]
Transcribes spoken audio into text in real time.
         │
         ▼
[VyaparVaani NLP Engine]
Extracts structured entity parameters:
{
  "intent": "create_order",
  "customer_name": "Rahul Sharma",
  "product_name": "Cotton Shirts",
  "quantity": 20,
  "total_amount": 15000.0
}
         │
         ▼
[Spoken & Visual Confirmation]
Assistant prompts via Text-to-Speech & UI:
"You want to add 20 shirts for Rahul for ₹15,000. Should I save this order?"
         │
         ▼
[User Confirms]
Merchant says "Yes, save it" or clicks "Yes, Save Order".
         │
         ▼
[Backend Persistence & Dashboard Update]
Order is validated, written to database, stats update, confetti bursts,
and assistant replies: "Your order has been saved successfully!"
```

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 19 + TypeScript + Vite | Blazing fast client rendering, zero SSR hydration delays with Web Speech API |
| **Styling** | Tailwind CSS v4 + Lucide Icons | Responsive mobile-first SaaS interface with custom soundwave animations |
| **Backend** | Python 3.12 + FastAPI | High-throughput asynchronous REST APIs, Pydantic schemas, CORS |
| **Speech-to-Text** | Web Speech API (`SpeechRecognition`) | Native browser speech transcription supporting Indian English, Hindi & Gujarati |
| **Text-to-Speech** | Web Speech Synthesis API | Spoken audio confirmation in Indian regional accents |
| **AI Processing** | Multilingual Rule-Engine + LLM Hook | Deterministic zero-key fallback with entity regex tokenization |
| **Database** | SQLite + Supabase Ready | Zero-setup local SQLite fallback; compatible with Supabase PostgreSQL |
| **Testing** | Pytest + FastAPI TestClient | 100% passing test coverage for NLP parsing and order lifecycle |

---

## 📂 Project Directory Structure

```
vyapar-vaani/
├── run_app.bat             # One-click Windows launcher (starts backend + frontend)
├── start_backend.bat       # Starts FastAPI server on http://127.0.0.1:8000
├── start_frontend.bat      # Starts Vite React dev server on http://localhost:3000
├── test_backend.bat        # Runs pytest test suite
├── .env.example            # Environment variables template
├── .gitignore              # Ignores venv, node_modules, and databases
├── README.md               # This documentation
├── backend/
│   ├── requirements.txt    # FastAPI, uvicorn, pydantic, pytest
│   ├── .env.example
│   ├── app/
│   │   ├── main.py         # App factory, CORS, lifespan database init
│   │   ├── config.py       # Configuration and fallback toggles
│   │   ├── database/
│   │   │   └── db.py       # SQLite schema and sample data seed
│   │   ├── models/
│   │   │   └── schemas.py  # Pydantic schemas for orders, customers, stats
│   │   ├── routers/
│   │   │   ├── voice.py    # /api/voice/process & /api/voice/confirm
│   │   │   ├── orders.py   # CRUD for orders & status updates
│   │   │   ├── customers.py# Customer directory & history
│   │   │   ├── reminders.py# Follow-up reminders
│   │   │   ├── dashboard.py# Aggregated sales & metrics
│   │   │   └── settings_router.py # Zero-key system status
│   │   └── services/
│   │       ├── nlp_parser.py     # Multilingual intent & entity parser
│   │       └── business_logic.py # Order execution and stats aggregation
│   └── tests/
│       ├── test_nlp.py     # Multilingual parser test cases
│       └── test_flow.py    # End-to-end voice-to-order API workflow test
└── frontend/
    ├── package.json
    ├── vite.config.ts      # Proxies /api to http://127.0.0.1:8000
    ├── src/
    │   ├── types.ts        # TypeScript data types
    │   ├── hooks/
    │   │   └── useVoice.ts # SpeechRecognition & SpeechSynthesis hook
    │   ├── services/
    │   │   └── api.ts      # Backend REST client
    │   ├── components/
    │   │   ├── Sidebar.tsx
    │   │   ├── Header.tsx
    │   │   ├── VoiceAssistantModal.tsx  # Central Hero Voice Interface
    │   │   ├── DashboardTab.tsx
    │   │   ├── OrdersTab.tsx
    │   │   ├── CustomersTab.tsx
    │   │   ├── RemindersTab.tsx
    │   │   ├── VoiceHistoryTab.tsx
    │   │   └── SettingsTab.tsx
    │   └── App.tsx
```

---

## 🚀 Quickstart Guide

### Option 1: One-Click Launch (Windows)
Double-click `run_app.bat` or run:
```cmd
.\run_app.bat
```
*It starts the FastAPI backend on port 8000, the React frontend on port 3000, and opens your browser automatically.*

---

### Option 2: Manual Terminal Commands

#### 1. Start Backend (Terminal 1)
```bash
cd backend
python -m venv venv

# Windows:
.\venv\Scripts\activate
# Linux/macOS:
# source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
*Backend runs on `http://127.0.0.1:8000` (API Docs available at `http://127.0.0.1:8000/docs`).*

#### 2. Start Frontend (Terminal 2)
```bash
cd frontend
npm install
npm run dev -- --port 3000
```
*Frontend runs on `http://localhost:3000`.*

---

## 🧪 Running Automated Tests

Run backend unit and workflow integration tests:
```bash
cd backend
.\venv\Scripts\python -m pytest tests/ -v
```
All 8 test suites pass, verifying:
* English order extraction
* Hindi order extraction
* Gujarati order extraction
* Reminder creation
* Customer registration
* Full end-to-end voice process -> confirm -> database write -> dashboard update

---

## 📹 3-Minute YouTube Demo Video Script

**Target Duration:** 2 minutes 45 seconds (Under the 3:00 minute challenge limit)

* **[0:00 - 0:35] Problem & Introduction**
  * *Visual:* Camera on speaker or overview of Surat textile wholesale market.
  * *Voiceover:* "Namaste! For millions of small business owners across India, typing into complex business apps is painful. Shop owners in Surat and Ahmedabad run their business through WhatsApp voice notes and paper diaries. Introducing VyaparVaani AI—a voice-first business assistant built for Bharat that lets shop owners run their operations entirely by speaking."
* **[0:35 - 1:45] The Core Voice-to-Order Demo (Live)**
  * *Visual:* Screen recording of VyaparVaani dashboard at `localhost:3000`.
  * *Action:* Click the microphone button.
  * *Spoken Command:* *"Add an order for Rahul. 20 shirts, total 15000 rupees."*
  * *Visual:* Soundwave pulses. Live interim transcript appears.
  * *Visual:* Extraction card appears instantly showing: Customer: Rahul Sharma, Product: Cotton Shirts, Quantity: 20, Amount: ₹15,000.
  * *Assistant Audio:* Speaks: *"You want to add 20 shirts for Rahul for ₹15,000. Should I save this order?"*
  * *Action:* User clicks "Yes, Save Order" (or says "Yes, save it").
  * *Visual:* Confetti bursts! Assistant speaks confirmation: *"Your order has been saved successfully!"*
  * *Visual:* Show the Orders tab and Dashboard updating live with the new order and updated revenue.
* **[1:45 - 2:15] Multilingual Capability (Hindi & Gujarati)**
  * *Visual:* Switch language toggle to Gujarati.
  * *Action:* Click mic and speak: *"રાહુલ માટે 20 શર્ટ નો ઓર્ડર ઉમેરો, કુલ 15000 રૂપિયા"*
  * *Visual:* UI displays Gujarati prompt and Gujarati spoken confirmation.
* **[2:15 - 2:45] Architecture & Zero-Key Guarantee**
  * *Visual:* Show Settings tab displaying "Zero-Key Offline AI Ready". Show terminal running tests.
  * *Voiceover:* "VyaparVaani runs completely without paid API keys, with full mock fallbacks. Thank you, Build for Bharat!"

---

## 📊 Pitch Deck Structure (PDF Guide)

A companion 5-slide pitch deck for the required submission:

1. **Slide 1: Problem**
   * Indian MSMEs generate ₹150 Lakh Crore in economic output, but 85% in Tier 2/3 cities still rely on paper notebooks and verbal notes because modern software is English-centric and typing-heavy.
2. **Slide 2: Target Users**
   * Wholesalers, Garment Boutiques, Kirana Stores, Independent Service Providers.
   * Persona: "Rameshbhai, 48, Surat Textile Wholesaler". Fluent in Gujarati and Hindi, uses WhatsApp daily, struggles with complex ERP software.
3. **Slide 3: Solution & Core Demo**
   * Hands-free voice assistant. Speak naturally in local languages. Automated entity extraction, verification step to prevent errors, instant database commit.
4. **Slide 4: Technical Architecture & Dependencies**
   * Web Speech Recognition + Web Speech Synthesis.
   * FastAPI + SQLite / Supabase PostgreSQL.
   * Zero-cost deterministic offline fallback guarantees high availability and zero API costs.
5. **Slide 5: Launch & Go-To-Market Plan**
   * Phase 1: Pilot with 50 Surat textile market traders via WhatsApp integration.
   * Phase 2: Add voice invoice generation and UPI payment link generation.
   * Phase 3: Regional expansion to Maharashtra (Marathi) and Tamil Nadu (Tamil).

---

## 🏆 Round 2 Submission Checklist

- [x] **Public GitHub Repository:** Ready to push with complete source code, tests, and `.env.example`.
- [x] **Starts Without Secret Keys:** 100% verified zero-key execution mode.
- [x] **Core Voice-to-Order Flow:** Fully functional with voice input, entity extraction, confirmation prompt, database persistence, and dashboard update.
- [x] **Multilingual Support:** English, Hindi, and Gujarati presets and parsers implemented.
- [x] **Audio Speech Synthesis:** Spoken confirmation prompts and success responses.
- [x] **YouTube Demo Script:** Ready for recording under 3 minutes.
- [x] **Pitch Deck Outline:** Comprehensive roadmap included.

---

*VyaparVaani AI — Empowering Bharat's Small Businesses through Voice.*
