```
██████╗  █████╗  ██████╗ ██╗   ██╗ █████╗ ██╗   ██╗██╗  ████████╗
██╔══██╗██╔══██╗██╔════╝ ██║   ██║██╔══██╗██║   ██║██║  ╚══██╔══╝
██████╔╝███████║██║  ███╗██║   ██║███████║██║   ██║██║     ██║   
██╔══██╗██╔══██║██║   ██║╚██╗ ██╔╝██╔══██║██║   ██║██║     ██║   
██║  ██║██║  ██║╚██████╔╝ ╚████╔╝ ██║  ██║╚██████╔╝███████╗██║   
╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝   ╚═══╝  ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝   
```

<div align="center">

**The Definitive Database for Vintage T-Shirts**

[![Live Demo](https://img.shields.io/badge/demo-ragvault.com-blue?style=for-the-badge)](https://ragvault.com)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-Database-green?style=for-the-badge&logo=supabase)](https://supabase.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://typescriptlang.org)

*Catalog. Collect. Connect.*

</div>

---

## 🔥 What is RagVault?

RagVault is a community-driven encyclopedia and marketplace for vintage t-shirts. Think of it as the **Wikipedia + Discogs** for vintage tees — a place where collectors can catalog their finds, verify authenticity, discover rare pieces, and connect with fellow enthusiasts.

---

## ✨ Features

### 🗄️ The Vault
A comprehensive database of vintage t-shirts with detailed metadata:
- **Subject & Category** — Band, motorcycle, movie, sports, advertising, and more
- **Tag Identification** — Brands, stitch types, materials, origins
- **Era Dating** — Year ranges and production periods
- **Reference Images** — Community-contributed photos
- **Verification System** — Crowd-sourced authenticity confirmation

### 👕 Personal Collections
- Upload and catalog your own vintage shirts
- Link items to Vault entries for instant metadata
- Track your collection's value and history
- Share your collection with the community

### 🔍 Smart Search & Discovery
- Full-text search across subjects, descriptions, and tags
- Category filtering with quick filter chips
- Multiple sort options (verified, newest, A-Z, top rated)
- Infinite scroll browsing
- Grid and list view toggle

### 📝 Articles & Guides
Block-based article system for editorial content:
- **Find of the Week** — Featured vintage discoveries
- **Tag Guides** — Educational content on tag identification
- **Collection Spotlights** — Featured collector showcases
- **Authentication Tips** — How to spot fakes

### ⭐ Karma & Community
- Earn karma for contributions (uploads, verifications, edits)
- Tiered reputation system (Newcomer → Contributor → Expert → Curator)
- Vote on items and edits
- Activity feed showing community actions

### 🛠️ Additional Features
- **Variant System** — Link related shirts (regional releases, reprints, bootlegs)
- **Related Shirts** — Discover similar items
- **Edit Proposals** — Suggest corrections with community review
- **Real-time Activity** — Live feed of uploads, verifications, and sales

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth |
| **Storage** | Supabase Storage |
| **Hosting** | Vercel |

---

## 🏃 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account

### Installation

```bash
# Clone the repository
git clone https://github.com/fishyfrenzy/rag-vault.git
cd rag-vault

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your Supabase credentials to .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Database Setup

```bash
# Push migrations to Supabase
supabase db push
```

---

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── articles/          # Article system
│   ├── vault/             # Vault browsing & detail pages
│   ├── collection/        # User collections
│   └── ...
├── components/
│   ├── article/           # Article editor & renderer
│   ├── vault/             # Vault cards, search, forms
│   ├── karma/             # Voting, proposals
│   └── ui/                # Reusable UI primitives
├── lib/
│   ├── supabase/          # Database client
│   └── queries/           # Data fetching functions
└── types/                 # TypeScript definitions
```

---

## 🤝 Contributing

Contributions are welcome! Whether it's:
- 🐛 Bug fixes
- ✨ New features
- 📝 Documentation improvements
- 🎨 UI/UX enhancements

Please open an issue first to discuss what you'd like to change.

---

## 📄 License

This project is private and proprietary.

---

<div align="center">

**Built with ❤️ for the vintage community**

[Visit RagVault](https://ragvault.com) • [Report Bug](https://github.com/fishyfrenzy/rag-vault/issues)

</div>
