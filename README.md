# IT Monitoring - Region 8 (Frontend + Backend MySQL)

Struktur folder:

- `backend/` = REST API (Node.js + Express + MySQL)
- `backend/db/` = `schema.sql` & `seed.sql`
- `frontend/` = UI (single page `index.html`)

## 1) Setup MySQL

1. Buat database (nama bebas, contoh `it_monitoring_region8`).
2. Jalankan schema:

```sql
SOURCE backend/db/schema.sql;
```

3. Jalankan seed (user default):

```sql
SOURCE backend/db/seed.sql;
```

> Seed membuat user:
> - `admin / 123456` (Admin)
> - `pekerja / 123456` (User)

## 2) Jalankan Backend

```bash
cd backend
cp .env.example .env
npm install
npm run start
```

Backend akan jalan di `http://localhost:3000`.

## 3) Jalankan Frontend

Cara paling mudah:

- VS Code extension **Live Server** (port 5500), buka `frontend/index.html`.

Jika backend berbeda host/port, ubah base URL API:

```js
localStorage.setItem('API_BASE', 'http://localhost:3000');
```

Lalu refresh halaman.

## Endpoint API

- `POST /api/login` `{ username, password }`
- `GET /api/perangkat` (optional query: `branch_office`, `kode_branch`)
- `POST /api/perangkat` (create/update)
- `POST /api/perangkat/bulk` `{ rows: [...] }`
- `DELETE /api/perangkat/:id`

## Catatan

- Frontend sudah mengaktifkan download **CSV** dan **XLSX** dari data yang sedang terfilter.
- Operating System punya opsi **OTHER** + input manual.
- Tahun Penerimaan memakai **input search (datalist)**.
