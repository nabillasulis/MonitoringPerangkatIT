import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { nanoid } from 'nanoid';
import bcrypt from 'bcrypt';

dotenv.config();

const app = express();
app.use(express.json({ limit: '5mb' }));

const PORT = Number(process.env.PORT || 3000);
const CORS_ORIGIN = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (CORS_ORIGIN.length === 0) return cb(null, true);
    if (CORS_ORIGIN.includes(origin)) return cb(null, true);
    return cb(new Error('CORS blocked for origin: ' + origin));
  },
  credentials: true
}));

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

function pick(obj, keys) {
  const out = {};
  for (const k of keys) out[k] = obj?.[k] ?? null;
  return out;
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'username dan password wajib diisi' });
    }

    const [rows] = await pool.query('SELECT username, password_hash, nama, role, pn, jabatan FROM users WHERE LOWER(username)=LOWER(?) LIMIT 1', [String(username).trim()]);
    if (!rows || rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Username atau Password salah!' });
    }

    const user = rows[0];
    const ok = await bcrypt.compare(String(password), String(user.password_hash));
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Username atau Password salah!' });
    }

    return res.json({
      success: true,
      user: {
        username: user.username,
        nama: user.nama,
        role: user.role,
        pn: user.pn || '-',
        jabatan: user.jabatan || '-'
      }
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: String(e?.message || e) });
  }
});

// List perangkat
app.get('/api/perangkat', async (req, res) => {
  try {
    const { branch_office, kode_branch } = req.query;

    const where = [];
    const params = [];
    if (branch_office) { where.push('branch_office = ?'); params.push(String(branch_office)); }
    if (kode_branch) { where.push('kode_branch = ?'); params.push(String(kode_branch)); }

    const sql = `SELECT * FROM perangkat ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY updated_at DESC`;
    const [rows] = await pool.query(sql, params);
    return res.json({ success: true, data: rows || [] });
  } catch (e) {
    return res.status(500).json({ success: false, message: String(e?.message || e), data: [] });
  }
});

// Upsert perangkat
app.post('/api/perangkat', async (req, res) => {
  try {
    const payload = req.body || {};

    const data = pick(payload, [
      'main_branch','branch_office','kode_branch','nama_uker','nama_perangkat','serial_number',
      'merk','model','processor','ram','os','tahun_penerimaan','kondisi','status'
    ]);

    let id = String(payload.id || '').trim();
    if (!id) id = 'PRK-' + nanoid(10);

    await pool.query(
      `INSERT INTO perangkat (id, main_branch, branch_office, kode_branch, nama_uker, nama_perangkat, serial_number, merk, model, processor, ram, os, tahun_penerimaan, kondisi, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         main_branch=VALUES(main_branch),
         branch_office=VALUES(branch_office),
         kode_branch=VALUES(kode_branch),
         nama_uker=VALUES(nama_uker),
         nama_perangkat=VALUES(nama_perangkat),
         serial_number=VALUES(serial_number),
         merk=VALUES(merk),
         model=VALUES(model),
         processor=VALUES(processor),
         ram=VALUES(ram),
         os=VALUES(os),
         tahun_penerimaan=VALUES(tahun_penerimaan),
         kondisi=VALUES(kondisi),
         status=VALUES(status),
         updated_at=CURRENT_TIMESTAMP`,
      [
        id,
        data.main_branch,
        data.branch_office,
        data.kode_branch,
        data.nama_uker,
        data.nama_perangkat,
        data.serial_number,
        data.merk,
        data.model,
        data.processor,
        data.ram,
        data.os,
        data.tahun_penerimaan,
        data.kondisi,
        data.status
      ]
    );

    return res.json({ success: true, message: payload.id ? 'Data berhasil diperbarui.' : 'Data berhasil ditambahkan.', id });
  } catch (e) {
    return res.status(500).json({ success: false, message: String(e?.message || e) });
  }
});

// Bulk insert
app.post('/api/perangkat/bulk', async (req, res) => {
  try {
    const rows = Array.isArray(req.body) ? req.body : (req.body?.rows || []);
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Tidak ada data untuk disimpan.' });
    }

    const values = rows.map((r) => {
      const id = String(r.id || '').trim() || ('UPL-' + nanoid(10));
      const data = pick(r, [
        'main_branch','branch_office','kode_branch','nama_uker','nama_perangkat','serial_number',
        'merk','model','processor','ram','os','tahun_penerimaan','kondisi','status'
      ]);
      return [
        id,
        data.main_branch,
        data.branch_office,
        data.kode_branch,
        data.nama_uker,
        data.nama_perangkat,
        data.serial_number,
        data.merk,
        data.model,
        data.processor,
        data.ram,
        data.os,
        data.tahun_penerimaan,
        data.kondisi,
        data.status
      ];
    });

    // Build placeholders
    const placeholders = values.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').join(',');
    const flat = values.flat();

    await pool.query(
      `INSERT INTO perangkat (id, main_branch, branch_office, kode_branch, nama_uker, nama_perangkat, serial_number, merk, model, processor, ram, os, tahun_penerimaan, kondisi, status)
       VALUES ${placeholders}
       ON DUPLICATE KEY UPDATE
         main_branch=VALUES(main_branch),
         branch_office=VALUES(branch_office),
         kode_branch=VALUES(kode_branch),
         nama_uker=VALUES(nama_uker),
         nama_perangkat=VALUES(nama_perangkat),
         serial_number=VALUES(serial_number),
         merk=VALUES(merk),
         model=VALUES(model),
         processor=VALUES(processor),
         ram=VALUES(ram),
         os=VALUES(os),
         tahun_penerimaan=VALUES(tahun_penerimaan),
         kondisi=VALUES(kondisi),
         status=VALUES(status),
         updated_at=CURRENT_TIMESTAMP`,
      flat
    );

    return res.json({ success: true, message: `${values.length} data berhasil diupload ke database.` });
  } catch (e) {
    return res.status(500).json({ success: false, message: String(e?.message || e) });
  }
});

// Delete
app.delete('/api/perangkat/:id', async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ success: false, message: 'ID wajib.' });

    const [result] = await pool.query('DELETE FROM perangkat WHERE id=?', [id]);
    const affected = result?.affectedRows || 0;
    if (affected === 0) return res.status(404).json({ success: false, message: 'ID tidak ditemukan dalam database.' });

    return res.json({ success: true, message: 'Data berhasil dihapus.' });
  } catch (e) {
    return res.status(500).json({ success: false, message: String(e?.message || e) });
  }
});

app.listen(PORT, () => {
  console.log(`[backend] running on http://localhost:${PORT}`);
});
