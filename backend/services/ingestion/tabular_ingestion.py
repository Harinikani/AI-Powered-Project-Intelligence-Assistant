import os
import re
import math
import pandas as pd
from uuid import uuid4
from typing import List, Dict, Any
from google import genai
from database.client import collection
from dotenv import load_dotenv
from services.storage.document_store import add_document

# =========================================================
# STEP 1: Load environment variables and initialize Gemini
# =========================================================
# We load the API key from .env so secrets are not hardcoded.
load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


# =========================================================
# STEP 2: Convert text chunks into embeddings
# =========================================================
# This function sends each cleaned row text to Gemini embedding model.
# Each returned embedding is a vector representation of the row.
# Later, these vectors are stored in Chroma for retrieval.
def get_embeddings(texts: List[str]) -> List[List[float]]:
    embeddings = []

    for text in texts:
        response = client.models.embed_content(
            model="gemini-embedding-001",
            contents=text,
            config={"task_type": "RETRIEVAL_DOCUMENT"}
        )
        embeddings.append(response.embeddings[0].values)

    return embeddings


# =========================================================
# STEP 3: Safely read CSV files
# =========================================================
# Real-world CSVs are often messy:
# - inconsistent quoting
# - bad rows
# - blank cells
# - "N/A", "-", "null" etc.
#
# We first try normal pandas read_csv().
# If that fails, we fall back to a more forgiving parser.
def safe_read_csv(file_path: str) -> pd.DataFrame:
    common_na = ["", " ", "NA", "N/A", "na", "n/a", "null", "NULL", "None", "none", "-", "--"]

    try:
        return pd.read_csv(file_path, na_values=common_na, keep_default_na=True)
    except Exception:
        return pd.read_csv(
            file_path,
            engine="python",
            on_bad_lines="skip",
            quotechar='"',
            skipinitialspace=True,
            na_values=common_na,
            keep_default_na=True
        )


# =========================================================
# STEP 4: Safely read Excel files
# =========================================================
# Excel files can have multiple sheets.
# We read every sheet, attach the sheet name to each row,
# and combine them into one dataframe.
def safe_read_excel(file_path: str) -> pd.DataFrame:
    common_na = ["", " ", "NA", "N/A", "na", "n/a", "null", "NULL", "None", "none", "-", "--"]

    excel_data = pd.read_excel(file_path, sheet_name=None, na_values=common_na)

    dfs = []

    for sheet_name, df in excel_data.items():
        if df is None or df.empty:
            continue

        # Make a copy so we do not mutate the original
        df = df.copy()

        # Keep sheet name for traceability
        df["__sheet_name__"] = sheet_name
        dfs.append(df)

    if not dfs:
        return pd.DataFrame()

    return pd.concat(dfs, ignore_index=True)


# =========================================================
# STEP 5: Helper to detect missing values
# =========================================================
# We do not rely only on pandas NaN because users may type:
# "", "-", "n/a", "null", etc.
def is_missing(value: Any) -> bool:
    if pd.isna(value):
        return True

    if isinstance(value, str) and value.strip().lower() in {
        "", "na", "n/a", "null", "none", "-", "--"
    }:
        return True

    return False


# =========================================================
# STEP 6: Clean basic text formatting
# =========================================================
# This removes extra spaces and standardizes text fields.
# Example:
# "  Project   Alpha  " -> "Project Alpha"
def normalize_whitespace(value: Any) -> Any:
    if is_missing(value):
        return None

    if isinstance(value, str):
        return re.sub(r"\s+", " ", value).strip()

    return value


# =========================================================
# STEP 7: Clean numeric values
# =========================================================
# This handles messy number formats such as:
# - 1,200,000
# - USD 1,200,000
# - RM 1.2M
# - 8%
# - (1200) meaning negative
# - 2.5k / 1.2m / 3b
#
# Output is converted to float where possible.
def clean_number(value: Any):
    if is_missing(value):
        return None

    # If value is already numeric, keep it
    if isinstance(value, (int, float)) and not pd.isna(value):
        return float(value)

    s = str(value).strip().lower()

    # Detect accounting-style negatives like (1200)
    is_negative = s.startswith("(") and s.endswith(")")
    s = s.strip("()")

    # Keep only useful characters:
    # digits, dot, comma, minus, percent, k/m/b
    s = re.sub(r"[^\d.,\-%kmb]", "", s)

    if not s:
        return None

    # Remove % sign because we want numeric value only
    s = s.replace("%", "")

    # Remove commas from thousands formatting
    s = s.replace(",", "")

    # Detect shorthand formats
    multiplier = 1.0
    if s.endswith("k"):
        multiplier = 1_000
        s = s[:-1]
    elif s.endswith("m"):
        multiplier = 1_000_000
        s = s[:-1]
    elif s.endswith("b"):
        multiplier = 1_000_000_000
        s = s[:-1]

    try:
        num = float(s) * multiplier

        if is_negative:
            num = -num

        return num
    except Exception:
        return None


# =========================================================
# STEP 8: Clean percentages
# =========================================================
# For this project, percentages like "8%" become 8.0.
# If later you want ratio form instead, you can divide by 100.
def clean_percentage(value: Any):
    return clean_number(value)


# =========================================================
# STEP 9: Clean dates
# =========================================================
# This handles formats such as:
# - 2025-01
# - Jan-2025
# - 2025/02
# - 02-2025
# - March 2025
#
# We normalize everything into YYYY-MM-DD for consistency.
def clean_date(value: Any):
    if is_missing(value):
        return None

    try:
        dt = pd.to_datetime(value, errors="coerce")
        if pd.isna(dt):
            return None

        return dt.strftime("%Y-%m-%d")
    except Exception:
        return None


# =========================================================
# STEP 10: Normalize project names
# =========================================================
# Small text normalization improves retrieval consistency.
# Example:
# "bridge rehab" -> "Bridge Rehabilitation"
# "phase i" -> "phase 1"
def normalize_project_name(name: Any):
    if is_missing(name):
        return None

    name = str(name).lower().strip()

    replacements = {
        "rehab": "rehabilitation",
        "phase i": "phase 1",
        "phase one": "phase 1",
        "dev": "development"
    }

    for old, new in replacements.items():
        name = name.replace(old, new)

    name = re.sub(r"\s+", " ", name)
    return name.title()


# =========================================================
# STEP 11: Normalize column names
# =========================================================
# Removes weird spacing from headers.
# Example:
# " Total   Budget (USD) " -> "Total Budget (USD)"
def normalize_column_name(col: str) -> str:
    col = str(col).strip()
    col = re.sub(r"\s+", " ", col)
    return col


# =========================================================
# STEP 12: Infer rough column types automatically
# =========================================================
# Since uploaded spreadsheets may vary, we infer types from
# column names so cleaning can still work on unfamiliar files.
#
# Example:
# "Actual Spend" -> number
# "Month" -> date
# "Cost Variance (%)" -> percentage
def infer_column_types(df: pd.DataFrame) -> Dict[str, str]:
    inferred = {}

    for col in df.columns:
        col_l = str(col).lower()

        if any(x in col_l for x in ["date", "month", "period"]):
            inferred[col] = "date"
        elif any(x in col_l for x in ["budget", "spend", "cost", "amount", "price", "revenue", "forecast"]):
            inferred[col] = "number"
        elif any(x in col_l for x in ["variance", "margin", "rate", "ratio", "%", "percent"]):
            inferred[col] = "percentage"
        elif any(x in col_l for x in ["project name", "name", "title"]):
            inferred[col] = "name"
        else:
            inferred[col] = "text"

    return inferred


# =========================================================
# STEP 13: Main dataframe cleaning pipeline
# =========================================================
# This is the core cleaning step before embedding.
#
# What it does:
# 1. normalize headers
# 2. drop empty rows
# 3. clean all cells
# 4. infer data types
# 5. standardize specific columns
# 6. remove duplicates
def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    if df.empty:
        return df

    # 13.1 Normalize column names
    df.columns = [normalize_column_name(col) for col in df.columns]

    # 13.2 Remove rows where every value is empty
    df = df.dropna(how="all")

    # 13.3 Clean whitespace / empty markers in every cell first
    for col in df.columns:
        df[col] = df[col].apply(normalize_whitespace)

    # 13.4 Drop rows that are mostly empty
    # At least 30% of fields should have content, minimum 2 fields.
    min_non_null = max(2, math.ceil(len(df.columns) * 0.3))
    df = df.dropna(thresh=min_non_null)

    # 13.5 Infer column types and clean accordingly
    column_types = infer_column_types(df)

    for col, col_type in column_types.items():
        if col_type == "number":
            df[col] = df[col].apply(clean_number)
        elif col_type == "percentage":
            df[col] = df[col].apply(clean_percentage)
        elif col_type == "date":
            df[col] = df[col].apply(clean_date)
        elif col_type == "name" and "project" in col.lower():
            df[col] = df[col].apply(normalize_project_name)
        else:
            df[col] = df[col].apply(normalize_whitespace)

    # 13.6 Standardize common business fields if they exist
    if "Project Name" in df.columns:
        df["Project Name"] = df["Project Name"].apply(normalize_project_name)

    if "Project ID" in df.columns:
        df["Project ID"] = df["Project ID"].apply(
            lambda x: str(x).strip().upper() if not is_missing(x) else None
        )

    if "Currency" in df.columns:
        df["Currency"] = df["Currency"].apply(
            lambda x: str(x).strip().upper() if not is_missing(x) else None
        )

    # 13.7 Remove exact duplicate rows
    df = df.drop_duplicates()

    # 13.8 Remove likely duplicates based on business keys
    # Example: same project + same month should not appear twice
    dedupe_keys = [c for c in ["Project ID", "Project Name", "Month"] if c in df.columns]
    if len(dedupe_keys) >= 2:
        df = df.drop_duplicates(subset=dedupe_keys, keep="first")

    # 13.9 Reset index after cleaning
    df = df.reset_index(drop=True)

    return df


# =========================================================
# STEP 14: Build row-level quality metadata
# =========================================================
# This is useful because we want to know:
# - what fields are missing in each row
# - how complete the row is
#
# This metadata can help with later filtering/debugging.
def build_row_quality_metadata(row: pd.Series) -> Dict[str, Any]:
    missing_fields = []
    filled_fields = []

    for col, value in row.items():
        if is_missing(value):
            missing_fields.append(col)
        else:
            filled_fields.append(col)

    return {
        "missing_fields": missing_fields,
        "missing_count": len(missing_fields),
        "filled_count": len(filled_fields),
    }


# =========================================================
# STEP 15: Convert cleaned dataframe rows into text chunks
# =========================================================
# Embedding models accept text, not raw tables.
# So each row is converted into a structured text format like:
#
# "Project ID: P-001 | Project Name: Highway Expansion Phase 1 |
#  Month: 2025-01-01 | Actual Spend: 1150000.0 | ..."
#
# Missing fields are also noted for context.
def dataframe_to_text_chunks(df: pd.DataFrame) -> List[Dict[str, Any]]:
    chunks = []

    for idx, row in df.iterrows():
        row_dict = row.to_dict()
        quality = build_row_quality_metadata(row)

        usable_fields = []

        # Only include non-missing values in embedded text
        for col, value in row_dict.items():
            if not is_missing(value):
                usable_fields.append(f"{col}: {value}")

        row_text = " | ".join(usable_fields)

        # Optionally append missing field info
        if quality["missing_fields"]:
            row_text += f" | Missing fields: {', '.join(quality['missing_fields'])}"

        chunks.append({
            "text": row_text,
            "row_index": idx,
            "quality": quality,
        })

    return chunks


# =========================================================
# STEP 16: Main ingestion function
# =========================================================
# Full ingestion flow:
# 1. Load CSV or Excel
# 2. Clean dataframe
# 3. Convert each row into text
# 4. Embed each row
# 5. Store in Chroma with metadata
def ingest_tabular_file(file_path: str):
    print(f"[INFO] Ingesting tabular file: {file_path}")

    ext = os.path.splitext(file_path)[1].lower()

    # 16.1 Load file depending on extension
    if ext == ".csv":
        df = safe_read_csv(file_path)
    elif ext in [".xlsx", ".xls"]:
        df = safe_read_excel(file_path)
    else:
        raise ValueError("Unsupported file type")

    print(f"[INFO] Raw rows: {len(df)}")

    # 16.2 Clean the data before embedding
    df = clean_dataframe(df)

    print(f"[INFO] Cleaned rows: {len(df)}")

    if df.empty:
        print("[WARNING] No usable rows after cleaning")
        return 0

    # 16.3 Convert rows to text chunks
    chunk_payloads = dataframe_to_text_chunks(df)
    text_chunks = [item["text"] for item in chunk_payloads]

    # 16.4 Generate embeddings for each row-text
    embeddings = get_embeddings(text_chunks)

    # 16.5 Create unique IDs for vector database
    ids = [str(uuid4()) for _ in text_chunks]

    # 16.6 Build metadata for each row

    filename = os.path.basename(file_path)
    chunk_counter = 0

    metadatas = []
    for item in chunk_payloads:
        metadata = {
            "filename": filename,
            "type": "tabular",
            "row": item["row_index"],
            "chunk_index": chunk_counter, 
            "missing_count": item["quality"]["missing_count"],
            "filled_count": item["quality"]["filled_count"],
            "missing_fields": ", ".join(item["quality"]["missing_fields"]),
        }
        metadatas.append(metadata)
        chunk_counter += 1

    # 16.7 Store everything in ChromaDB
    collection.add(
        documents=text_chunks,
        embeddings=embeddings,
        metadatas=metadatas,
        ids=ids
    )

    num_chunks = len(text_chunks)
    print(f"[SUCCESS] Stored {num_chunks} cleaned rows")

     # ✅ Store document metadata
    add_document(filename, num_chunks)

    return num_chunks