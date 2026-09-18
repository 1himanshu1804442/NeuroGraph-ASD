"""
Resumable Downloader for Zenodo ASD Dataset (Record 15073612).
Downloads 'Resources for Experiments.rar' (4.4 GB) with automatic HTTP Range resumption.
"""

import os
import sys
import time
import urllib.request
import urllib.error

URL = "https://zenodo.org/api/records/15073612/files/Resources%20for%20Experiments.rar/content"
DEST_DIR = os.path.join(os.getcwd(), "data", "zenodo")
DEST_FILE = os.path.join(DEST_DIR, "Resources_for_Experiments.rar")
LOG_FILE = os.path.join(DEST_DIR, "download_progress.log")

TOTAL_SIZE_BYTES = 4615705344  # ~4.40 GB


def log(msg: str):
    timestamp = time.strftime("[%Y-%m-%d %H:%M:%S]")
    line = f"{timestamp} {msg}"
    print(line, flush=True)
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass


def download_dataset():
    os.makedirs(DEST_DIR, exist_ok=True)
    existing_bytes = 0

    if os.path.exists(DEST_FILE):
        existing_bytes = os.path.getsize(DEST_FILE)
        if existing_bytes >= TOTAL_SIZE_BYTES:
            log(f"File already completely downloaded ({existing_bytes / (1024**3):.2f} GB).")
            return
        log(f"Found partial download: {existing_bytes / (1024**2):.1f} MB. Resuming from byte {existing_bytes}...")
    else:
        log("Starting fresh download for Zenodo ASD Dataset (4.4 GB)...")

    chunk_size = 1024 * 1024  # 1 MB chunk
    start_time = time.time()
    last_log_time = start_time
    downloaded_session = 0

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    if existing_bytes > 0:
        headers["Range"] = f"bytes={existing_bytes}-"

    req = urllib.request.Request(URL, headers=headers)

    try:
        with urllib.request.urlopen(req, timeout=30) as response, open(DEST_FILE, "ab" if existing_bytes > 0 else "wb") as out_file:
            while True:
                chunk = response.read(chunk_size)
                if not chunk:
                    break
                out_file.write(chunk)
                downloaded_session += len(chunk)
                current_total = existing_bytes + downloaded_session

                now = time.time()
                if now - last_log_time >= 10.0:
                    pct = (current_total / TOTAL_SIZE_BYTES) * 100.0
                    elapsed = now - start_time
                    speed_mb = (downloaded_session / (1024 * 1024)) / (elapsed if elapsed > 0 else 1)
                    log(f"Progress: {pct:.1f}% ({current_total / (1024**2):.1f} MB / {TOTAL_SIZE_BYTES / (1024**2):.1f} MB) at {speed_mb:.2f} MB/s")
                    last_log_time = now

        final_size = os.path.getsize(DEST_FILE)
        log(f"Download complete! Final size: {final_size / (1024**3):.2f} GB at {DEST_FILE}")

    except Exception as e:
        log(f"Download paused or interrupted: {e}")
        log("Run this script again anytime to resume seamlessly!")
        sys.exit(1)


if __name__ == "__main__":
    download_dataset()
