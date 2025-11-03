# Frontend (React + Vite)

This folder contains the frontend for the Binance Analytics App. For full project documentation and backend setup, see the repository root `README.md`.

## Scripts

Run these from inside this `frotntend/` folder:

```powershell
npm install
npm run dev     # http://localhost:5173
npm run build   # production build
npm run preview # preview built app
```

The app is configured to talk to the backend at `http://localhost:8000/api` (see `src/App.jsx`).

## Notes

- Dev server port is configured in `vite.config.js` (5173 by default).
- Charts use Plotly (via `react-plotly.js`).
- If you see an error on `npm run dev`, make sure you are on Node 18+ and reinstall dependencies (`npm install`).
