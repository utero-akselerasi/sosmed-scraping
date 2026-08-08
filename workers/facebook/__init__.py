"""
Facebook Worker - Festival Mbois Intelligence Platform.

Worker scraping postingan publik dari halaman Facebook (public pages)
menggunakan Playwright dengan autentikasi cookie ekspor (Netscape format),
tanpa username/password. Hasil dinormalisasi ke struktur yang sama dengan
Instagram worker dan disimpan ke tabel posts lewat shared.database.

Import utama: `from facebook.worker import FacebookWorker`.
"""
