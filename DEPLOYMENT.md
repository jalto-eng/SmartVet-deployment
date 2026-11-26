# SmartVet demonstration deployment
Use a Node.js 22.12+ host with HTTPS and a persistent writable disk. One instance only.
Build command: npm ci --prefix backend && npm ci --prefix frontend && npm run build --prefix frontend
Start command: npm start --prefix backend
Environment: NODE_ENV=production; DATA_DIR=absolute persistent disk directory; ADMIN_PASSWORD=your private strong password; PORT=provided by host. Set TRUST_PROXY=1 only if host confirms exactly one trusted reverse proxy hop. No separate frontend service needed.
Health check: /api/health
Local development: npm ci in each folder; set ADMIN_PASSWORD in backend terminal; npm start in backend; npm run dev in frontend.
Seed data contains no appointments or administrator password. Initial username admin. Change credentials in Settings after login. Never commit live JSON files or secrets. Back up persistent disk regularly. Verify booking, tracking, modifications, cancellations, admin and persistence before accepting real data.
