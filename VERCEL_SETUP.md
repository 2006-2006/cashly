# 🚀 Vercel Deployment Guide for Cashly

This project is configured as a monorepo with a **Vite Frontend** and an **Express Backend**.

## 1. Environment Variables
You MUST add these keys in the **Vercel Dashboard** (Settings > Environment Variables):

### 🌐 Frontend (Framework: Vite)
*   `VITE_SUPABASE_URL`: Your Supabase Project URL
*   `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Key
*   `VITE_API_URL`: `/api` (This is already set for production in `.env.production`)

### ⚙️ Backend (Framework: Node.js)
*   `SUPABASE_URL`: Same as above
*   `SUPABASE_ANON_KEY`: Same as above
*   `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Service Role Key (Keep this secret!)
*   `GEMINI_API_KEY`: Your Google Gemini API Key
*   `OPENROUTER_API_KEY`: (Optional) If you want to use Llama-3 via OpenRouter
*   `LANGCHAIN_API_KEY`: (Optional) For tracing
*   `CLIENT_URL`: Your Vercel deployment URL (e.g., `https://cashly-yourname.vercel.app`)

## 2. Deployment Steps
1.  Connect your GitHub repository to Vercel.
2.  Vercel will detect the `vercel.json` at the root and configure the builds automatically.
3.  Add the environment variables listed above.
4.  Deploy!

## 3. Important Notes
*   **API Path**: The backend is hosted at `/api`. The frontend is configured to call this automatically.
*   **Security**: Ensure `SUPABASE_SERVICE_ROLE_KEY` is ONLY added to Vercel and NEVER committed to GitHub.
*   **CORS**: The `CLIENT_URL` in the backend ensures secure communication between your frontend and backend.
