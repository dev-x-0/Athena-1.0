# ATHENA — Executive Intelligence

A unified hackathon build combining the Athena executive frontend with the SQL-backed analysis engine.

## Fastest Windows start

Double-click `run.bat`.

It will:
1. create `.venv` if needed
2. install Python dependencies
3. install frontend dependencies if needed
4. build the React frontend
5. start FastAPI on `http://127.0.0.1:8000`
6. serve the website directly from the same server

Then open:

`http://127.0.0.1:8000`

## Manual start

### Backend

```powershell
py -m venv .venv
.venv\Scripts\activate
pip install -r backend\requirements.txt
python run.py
```

### Frontend development mode

```powershell
cd frontend
npm install
npm run dev
```

Development mode uses `http://localhost:5173` and talks to the API on port 8000.

## Product flow

Intro animation → authentication → three Athena modes:

1. Analysis History
2. Run Analysis
3. Data References

Run Analysis accepts a custom inventory/campaign scenario and returns:

- projected revenue
- projected spend
- ROAS
- contribution where margin is available
- inventory coverage/risk
- revenue trajectory
- inventory trajectory
- scenario comparison
- explainable recommendation
- provenance and limitations

## Data integrity

Athena does not fabricate unavailable funnel metrics. Missing source fields remain unavailable. Forecasts and scenario values are explicitly identified as derived/forecast values.

The included `backend/athena.db` is the local SQL demo database. The earlier MySQL ingestion files are retained under `backend/mysql_stream.py` and `backend/mysql_engine.py` for later connection to the MySQL dataset.

## Important

Do not commit a real `.env` containing MySQL passwords or other secrets.
