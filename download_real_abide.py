import io
import urllib.request
from pathlib import Path
import numpy as np
import pandas as pd
from concurrent.futures import ThreadPoolExecutor, as_completed

def fetch_real_abide(n_subjects: int = 100, save_dir: str = "data"):
    data_root = Path(save_dir)
    pheno_dir = data_root / "phenotypic"
    proc_dir = data_root / "processed"
    pheno_dir.mkdir(parents=True, exist_ok=True)
    proc_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 70)
    print("  Fetching Real ABIDE I Dataset from Official AWS S3 Open Repository")
    print("=" * 70)

    # 1. Download official phenotypic metadata CSV
    meta_url = "https://s3.amazonaws.com/fcp-indi/data/Projects/ABIDE_Initiative/Phenotypic_V1_0b_preprocessed1.csv"
    print(f"\n[1/3] Downloading official phenotypic metadata CSV from:\n      {meta_url}")
    
    req = urllib.request.Request(meta_url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req) as resp:
        meta_bytes = resp.read()
    
    df_raw = pd.read_csv(io.BytesIO(meta_bytes))
    print(f"      Total subjects in ABIDE I database: {len(df_raw)}")

    # Filter out entries with missing file IDs or corrupted metadata
    valid_df = df_raw[
        (df_raw["FILE_ID"].notna()) & 
        (df_raw["FILE_ID"] != "no_filename") &
        (df_raw["DX_GROUP"].isin([1, 2]))
    ].copy()

    # Recode DX_GROUP: in ABIDE raw CSV, 1=Autism, 2=Control. Convert to 1=ASD, 0=Control standard.
    valid_df["DX_GROUP"] = valid_df["DX_GROUP"].apply(lambda x: 1 if x == 1 else 0)

    # Balance cohort (equal ASD vs Control)
    asd_df = valid_df[valid_df["DX_GROUP"] == 1]
    ctrl_df = valid_df[valid_df["DX_GROUP"] == 0]
    
    n_per_group = n_subjects // 2
    selected_asd = asd_df.head(n_per_group)
    selected_ctrl = ctrl_df.head(n_per_group)
    cohort_df = pd.concat([selected_asd, selected_ctrl]).sample(frac=1.0, random_state=42).reset_index(drop=True)

    print(f"      Selected balanced cohort: {len(cohort_df)} subjects ({len(selected_asd)} ASD, {len(selected_ctrl)} Control)")

    # 2. Download genuine AAL-116 fMRI ROI time-series (.1D files) concurrently
    base_s3_url = "https://s3.amazonaws.com/fcp-indi/data/Projects/ABIDE_Initiative/Outputs/cpac/filt_noglobal/rois_aal"
    print(f"\n[2/3] Downloading genuine AAL-116 fMRI time-series for {len(cohort_df)} subjects in parallel...")

    fc_matrices = np.zeros((len(cohort_df), 116, 116), dtype=np.float32)
    successful_indices = []

    def download_subject(idx, file_id):
        url = f"{base_s3_url}/{file_id}_rois_aal.1D"
        try:
            r = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(r, timeout=20) as s:
                content = s.read().decode("utf-8")
            ts = np.loadtxt(io.StringIO(content))
            if ts.shape[1] == 116:
                # Compute Pearson FC matrix
                corr = np.corrcoef(ts, rowvar=False)
                corr = np.nan_to_num(corr, nan=0.0, posinf=1.0, neginf=-1.0)
                # Apply Fisher r-to-z transformation
                clipped = np.clip(corr, -0.9999, 0.9999)
                fc_mat = np.arctanh(clipped)
                np.fill_diagonal(fc_mat, 0.0)
                return idx, fc_mat, True
            return idx, None, False
        except Exception:
            return idx, None, False

    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(download_subject, idx, row["FILE_ID"]): idx for idx, row in cohort_df.iterrows()}
        downloaded_count = 0
        for future in as_completed(futures):
            idx, fc_mat, success = future.result()
            if success:
                fc_matrices[idx] = fc_mat
                successful_indices.append(idx)
                downloaded_count += 1
                if downloaded_count % 10 == 0 or downloaded_count == len(cohort_df):
                    print(f"      Progress: {downloaded_count}/{len(cohort_df)} real fMRI connectomes downloaded")

    # Filter cohort to only successfully downloaded subjects
    final_df = cohort_df.iloc[successful_indices].reset_index(drop=True)
    final_matrices = fc_matrices[successful_indices]

    final_df = final_df.rename(columns={
        "SUB_ID": "SUB_ID",
        "DX_GROUP": "DX_GROUP",
        "AGE_AT_SCAN": "AGE_AT_SCAN",
        "SEX": "SEX",
        "FIQ": "FIQ",
        "SITE_ID": "SITE_ID"
    })
    final_df["COHORT"] = "ABIDE_I_REAL"

    # 3. Save to disk
    pheno_path = pheno_dir / "ABIDE_I_phenotypic.csv"
    matrix_path = proc_dir / "ABIDE_I_fc_matrices.npy"
    print(f"\n[3/3] Saving real ABIDE I dataset to disk...")
    final_df.to_csv(pheno_path, index=False)
    np.save(matrix_path, final_matrices)
    print(f"      Saved phenotypic metadata -> {pheno_path}")
    print(f"      Saved 3D FC matrices ({final_matrices.shape}) -> {matrix_path}")
    print(f"\n Real ABIDE I dataset ingestion completed successfully!")

if __name__ == "__main__":
    fetch_real_abide(n_subjects=100)
