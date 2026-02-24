# Forex Widget (Static Replica)

This folder is **pure static HTML/CSS/JS** (no React build, no server APIs). It replicates the UI of `https://forex-widget-pro.replit.app/` as closely as possible using the same compiled Tailwind CSS output from your zip.

## Files
- `index.html` – full demo page with the same blurred overlay + background
- `widget.html` – clean page with only the widget (best for iframe/embed)
- `styles.css` – compiled CSS (taken from the original project build)
- `app.js` – vanilla JS for city + currency selectors, search, popular groups, amount formatting, rate/total, countdown, TAT
- `data/` – local JSON for cities, currencies and sample rates

## How to host on GitHub Pages
1. Create a repo
2. Upload these files to the repo root
3. GitHub → **Settings → Pages**
4. Source: `Deploy from a branch` → `main` + `/ (root)`
5. Open the Pages URL

## URL params
You can preselect values:
- `?product=note|card` (default: note)
- `?city=DEL` (city code)
- `?currency=USD`

Examples:
- `widget.html?product=card&city=BNG&currency=EUR`

## Notes
- Rates are **demo values** from `data/rates.json` (static). Replace with your real rates JSON if needed.
- "Book This Order" shows a toast in this static version. Wire it to your lead API when you want.


## URL params (for testing)
- `product=note|card`
- `city=DEL|BOM|BLR...` (uses city code from data/cities.json)
- `currency=USD|EUR...`
- Coupon simulation: `coupon=FOREXCASHBACK&cashback=100` (shows cashback applied banner)
- Optional: `rate_old=91.22` to show struck-through old rate when coupon is applied
