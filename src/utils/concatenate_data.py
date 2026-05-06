import os
import re
import pandas as pd
from datetime import datetime

def clean_header_and_drop_unused_rows(tmp_df):
    tmp_df.columns = tmp_df.iloc[0]
    tmp_df = tmp_df[1:].reset_index(drop=True)
    if 'Date' in tmp_df.columns:
        tmp_df = tmp_df[~pd.isna(tmp_df['Date'])]
    return tmp_df

def preprocess_and_add_datetime(tmp_df, filename):
    # extract “MM-YYYY” from filename
    match = re.search(r"(\d{2})-(\d{4})", filename)
    if not match:
        raise ValueError(f"Cannot extract date from filename: {filename}")
    month, year = int(match.group(1)), int(match.group(2))

    tmp_df = tmp_df.reset_index(drop=True)
    # one day per row
    dates = pd.date_range(start=datetime(year, month, 1),
                          periods=len(tmp_df), freq='D')
    tmp_df['Date'] = dates

    # coerce all other columns to numeric
    val_cols = [c for c in tmp_df.columns if c != 'Date']
    tmp_df[val_cols] = tmp_df[val_cols].apply(pd.to_numeric, errors='coerce')
    return tmp_df

def gather_files(root_dir, extension):
    out = []
    for subdir, _, files in os.walk(root_dir):
        for f in files:
            if f.lower().endswith(extension):
                full = os.path.join(subdir, f)
                rel  = os.path.relpath(full, root_dir)
                out.append((full, rel))
    return out

def concatenate_preprocessed_data(output_dir):
    dfs = []
    for subdir, _, files in os.walk(output_dir):
        for f in files:
            if f.lower().endswith('.csv'):
                path = os.path.join(subdir, f)
                try:
                    dfs.append(pd.read_csv(path))
                except Exception:
                    pass
    return pd.concat(dfs, ignore_index=True) if dfs else pd.DataFrame()

# in utils/concatenate_data.py, replace your convert_to_timeseries_long_format with:

def convert_to_timeseries_long_format(df):
    time_columns = [col for col in df.columns if re.match(r"^\d{1,2}:\d{2}$", str(col))]
    long_df = df.melt(id_vars=['station_name', 'Date'], value_vars=time_columns,
                      var_name='Time', value_name='Electricity(kW)')
    long_df['Date'] = pd.to_datetime(long_df['Date'].astype(str) + ' ' + long_df['Time'])
    long_df.drop(columns=['Time'], inplace=True)
    long_df.sort_values(by=['station_name', 'Date'], inplace=True)
    return long_df


def run_pipeline(
    root_xlsx_dir="Load-data",
    cleaned_csv_dir="cleaned_data",
    preprocessed_csv_dir="preprocessed_data",
    final_wide_csv="all_data_df.csv",
    final_long_csv="all_data_timeseries.csv",
):
    # --- Step 1: Excel → cleaned CSV
    os.makedirs(cleaned_csv_dir, exist_ok=True)
    for fp, rel in gather_files(root_xlsx_dir, ".xlsx"):
        df = pd.read_excel(fp)
        dfc = clean_header_and_drop_unused_rows(df)
        out = os.path.join(cleaned_csv_dir, rel).replace(".xlsx", ".csv")
        os.makedirs(os.path.dirname(out), exist_ok=True)
        dfc.to_csv(out, index=False)

    # --- Step 2: cleaned CSV → preprocessed CSV
    os.makedirs(preprocessed_csv_dir, exist_ok=True)
    for fp, rel in gather_files(cleaned_csv_dir, ".csv"):
        df = pd.read_csv(fp)
        dfp = preprocess_and_add_datetime(df, os.path.basename(fp))
        station = rel.split(os.sep)[0]
        dfp.insert(0, 'station_name', station)
        out = os.path.join(preprocessed_csv_dir, rel)
        os.makedirs(os.path.dirname(out), exist_ok=True)
        dfp.to_csv(out, index=False)

    # --- Step 3: concatenate wide
    all_df = concatenate_preprocessed_data(preprocessed_csv_dir)
    if not all_df.empty:
        all_df.to_csv(final_wide_csv, index=False)
    else:
        print("⚠️ No data to concatenate (wide).")

    # --- Step 4: long time‑series
    if not all_df.empty:
        long_df = convert_to_timeseries_long_format(all_df)
        long_df.to_csv(final_long_csv, index=False)
    else:
        print("⚠️ No data to convert (long).")

    return all_df, (long_df if 'long_df' in locals() else pd.DataFrame())
