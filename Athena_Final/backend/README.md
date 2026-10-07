# Athena Backend

FastAPI backend with:

- local SQL demo database (`athena.db`)
- authentication with hashed passwords and bearer sessions
- analysis history
- custom inventory scenario analysis
- OLS revenue forecasting
- inventory coverage / risk
- explainable SCALE / HOLD / REDUCE / PAUSE decisions
- provenance/reference endpoint
- optional MySQL ingestion modules retained from the earlier Athena build

The included SQLite database is the stable demo source so the project can run without MySQL. MySQL credentials are never included.
