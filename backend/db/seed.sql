-- NOTE:
-- Password default di requirement kamu: 123456
-- Seed ini pakai bcrypt hash untuk '123456'.
-- Hash generated with bcrypt(10).

INSERT INTO users (username, password_hash, nama, role, pn, jabatan)
VALUES
  ('admin', '$2b$10$u7q9m1gXH1bZ2rByNfDqvO7qvRzX2xg9D0m7uV5lJg5Wq8y3g7g0y', 'Administrator IT', 'Admin', '80001234', 'Manager IT'),
  ('pekerja', '$2b$10$u7q9m1gXH1bZ2rByNfDqvO7qvRzX2xg9D0m7uV5lJg5Wq8y3g7g0y', 'Staff Monitoring', 'User', '80005678', 'IT Support')
ON DUPLICATE KEY UPDATE
  password_hash=VALUES(password_hash),
  nama=VALUES(nama),
  role=VALUES(role),
  pn=VALUES(pn),
  jabatan=VALUES(jabatan);

INSERT INTO perangkat (
  id, main_branch, branch_office, kode_branch, nama_uker, nama_perangkat, serial_number,
  merk, model, processor, ram, os, tahun_penerimaan, kondisi, status
) VALUES
  ('PRK-DEMO-1', '437', 'KC Balaraja', '920', 'BRI UNIT BALARAJA', 'Laptop Standard / PC', 'SN-ABC-001',
   'Dell', 'Latitude 5420', 'i5-11400', '16GB', 'WIN 11', '2024', '5-Sangat Baik (Spesifikasi Sesuai Standar)', 'Masih Terpakai')
ON DUPLICATE KEY UPDATE
  updated_at=CURRENT_TIMESTAMP;
