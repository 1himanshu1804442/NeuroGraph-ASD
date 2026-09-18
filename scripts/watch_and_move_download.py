"""
Automated Watcher & Relocator.
Monitors the background Zenodo dataset download, and as soon as it reaches 100%,
automatically moves a copy directly into the user's Windows Downloads directory (C:\\Users\\hy180\\Downloads).
"""

import os
import time
import shutil

SOURCE_PATH = os.path.abspath("data/zenodo/Resources_for_Experiments.rar")
DOWNLOADS_DIR = os.path.expanduser(r"C:\Users\hy180\Downloads")
DEST_PATH = os.path.join(DOWNLOADS_DIR, "Resources for Experiments.rar")
LOG_PATH = os.path.abspath("data/zenodo/move_watcher.log")

EXPECTED_TOTAL_BYTES = 4615704033  # Exact byte length from Zenodo Content-Length


def log(msg: str):
    timestamp = time.strftime("[%Y-%m-%d %H:%M:%S]")
    line = f"{timestamp} {msg}"
    print(line, flush=True)
    try:
        with open(LOG_PATH, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass


def watch_and_move():
    log(f"Watcher started. Monitoring '{SOURCE_PATH}'...")
    log(f"Target destination: '{DEST_PATH}'")

    stable_count = 0
    last_size = -1

    while True:
        if os.path.exists(SOURCE_PATH):
            current_size = os.path.getsize(SOURCE_PATH)

            # Check if download reached full byte length
            if current_size >= EXPECTED_TOTAL_BYTES:
                log(f"Download reached 100% ({current_size / (1024**3):.2f} GB). Starting relocation...")
                break

            # If size hasn't changed for 6 consecutive checks (1 min), curl might have finished
            if current_size == last_size and current_size > 4000 * 1024 * 1024:
                stable_count += 1
                if stable_count >= 6:
                    log(f"Download stable at {current_size / (1024**3):.2f} GB. Proceeding with relocation...")
                    break
            else:
                stable_count = 0

            last_size = current_size
            pct = (current_size / EXPECTED_TOTAL_BYTES) * 100.0
            log(f"Current progress: {pct:.1f}% ({current_size / (1024**2):.1f} MB / {EXPECTED_TOTAL_BYTES / (1024**2):.1f} MB)")

        time.sleep(15)

    # Perform relocation
    try:
        log(f"Copying file to Downloads: {DEST_PATH}...")
        shutil.copy2(SOURCE_PATH, DEST_PATH)
        log(f"SUCCESS: Successfully placed '{DEST_PATH}' in your Downloads folder! ({os.path.getsize(DEST_PATH) / (1024**3):.2f} GB)")
    except Exception as e:
        log(f"Error while copying to Downloads: {e}")

    # Perform automated extraction into project dataset directory
    try:
        extract_dir = os.path.abspath("data/zenodo/extracted")
        os.makedirs(extract_dir, exist_ok=True)
        log(f"Starting extraction of dataset into: {extract_dir}...")
        import subprocess
        cmd = f'tar -xf "{SOURCE_PATH}" -C "{extract_dir}"'
        res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        if res.returncode == 0:
            log(f"SUCCESS: Dataset fully unpacked into {extract_dir}!")
        else:
            log(f"Extraction finished with code {res.returncode}: {res.stderr}")
    except Exception as e:
        log(f"Extraction error: {e}")


if __name__ == "__main__":
    watch_and_move()

