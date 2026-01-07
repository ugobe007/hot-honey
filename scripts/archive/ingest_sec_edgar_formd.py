import requests
import json
from datetime import datetime, timedelta

# SEC EDGAR Form D endpoint (no auth required)
BASE_URL = "https://data.sec.gov/submissions/CIK{cik}.json"
HEADERS = {"User-Agent": "HotHoney/1.0 (admin@hothoney.ai)"}

# Example: List of CIKs to fetch (replace with dynamic list or search logic)
CIKS = ["0001326801", "0001469367", "0001541401"]  # Example CIKs

results = []
for cik in CIKS:
    url = BASE_URL.format(cik=cik.zfill(10))
    try:
        resp = requests.get(url, headers=HEADERS, timeout=10)
        if resp.status_code != 200:
            print(f"Failed to fetch CIK {cik}: {resp.status_code}")
            continue
        data = resp.json()
        # Extract recent Form D filings
        filings = data.get("filings", {}).get("recent", {})
        for i, form in enumerate(filings.get("form", [])):
            if form == "D":
                filing = {
                    "cik": cik,
                    "company": data.get("name"),
                    "filed": filings["filingDate"][i],
                    "accession": filings["accessionNumber"][i],
                    "amount_raised": filings.get("primaryDocDescription", [None])[i],
                    "industry": data.get("sicDescription"),
                    "url": f"https://www.sec.gov/Archives/edgar/data/{cik}/{filings['accessionNumber'][i].replace('-', '')}/{filings['primaryDocument'][i]}"
                }
                results.append(filing)
    except Exception as e:
        print(f"Error fetching CIK {cik}: {e}")

# Output results as JSON
with open("sec_formd_filings.json", "w") as f:
    json.dump(results, f, indent=2)

print(f"Fetched {len(results)} Form D filings. Saved to sec_formd_filings.json.")
