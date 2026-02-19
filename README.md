# TRALO

**TRALO** is a business management web app built for small and growing businesses. It brings sales tracking, inventory management, expense recording, and daily business activity into one clean, fast interface.

> "Tralo helps small and growing businesses track sales, inventory, customers, and daily activity — all in one place."

---

## Features

- **Dashboard** — At-a-glance metrics: today's sales, monthly goods traded, current stock value, and profit
- **Sales Tracking** — Record and review sales with bulk upload and historical data support
- **Inventory Management** — Track stock levels, group items, manage suppliers, and handle stock conversions
- **Expenses** — Log and review business expenses
- **Documents** — Generate and share invoices, receipts, purchase orders, proforma invoices, waybills, and financial statements
- **Trade Index** — Market insights and watchlist for informed trading decisions
- **Reminders** — Schedule and manage business reminders with notifications
- **Trust Score** — A credibility metric that reflects business activity and reliability
- **Achievements** — Track milestones and business growth progress
- **QR Code & Business Card** — Generate shareable QR codes and a digital business card
- **WhatsApp Sharing** — Share documents and summaries directly via WhatsApp
- **Dark / Light Theme** — Full theme support across the app

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| UI Components | shadcn/ui, Radix UI, Tailwind CSS |
| Backend / Auth | Supabase (PostgreSQL, Auth, Edge Functions, Storage) |
| Data Fetching | TanStack Query (React Query) |
| PDF Generation | jsPDF, html2canvas |
| Deployment | Vercel |
| Analytics | Vercel Analytics |

---

## Getting Started

**Prerequisites:** Node.js (v18+) and npm. Install Node via [nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
# 1. Clone the repository
git clone https://github.com/your-username/tralo.git

# 2. Navigate into the project
cd tralo

# 3. Install dependencies
npm install

# 4. Set up environment variables
#    Create a .env.local file and add your Supabase credentials:
#    VITE_SUPABASE_URL=your_supabase_url
#    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# 5. Start the development server
npm run dev
```

The app runs at `http://localhost:8080` by default.

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |

---

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── documents/    # Document creation & history components
│   ├── inventory/    # Inventory management components
│   ├── sales/        # Sales components
│   ├── expenses/     # Expense components
│   ├── reminders/    # Reminder components
│   ├── achievements/ # Achievements & milestones
│   └── ui/           # Base UI primitives (shadcn/ui)
├── hooks/            # Custom React hooks
├── pages/            # Route-level page components
├── integrations/     # Supabase client & type definitions
├── lib/              # Utility functions
└── types/            # Shared TypeScript types

supabase/
├── functions/        # Edge Functions (invoice gen, notifications, etc.)
└── migrations/       # Database migration files
```

---

## Deployment

The project is configured for **Vercel**. All routes are rewritten to `index.html` for SPA routing (see `vercel.json`).

To deploy:
1. Push to your GitHub repository
2. Import the project in [Vercel](https://vercel.com)
3. Set the required environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
4. Deploy

---

## License

Private project. All rights reserved.
