CREATE TABLE alerts (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        type        TEXT NOT NULL,
        code        TEXT NOT NULL UNIQUE,
        description TEXT NOT NULL,
        stats       TEXT NOT NULL,
        overridden  INTEGER NOT NULL DEFAULT 0
    );
CREATE TABLE analyses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                status TEXT NOT NULL,
                input_json TEXT NOT NULL,
                result_json TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            );
CREATE TABLE audit_log (
        id     INTEGER PRIMARY KEY AUTOINCREMENT,
        ts     TEXT NOT NULL,
        action TEXT NOT NULL,
        detail TEXT NOT NULL
    );
CREATE TABLE campaign_daily (
        day         TEXT NOT NULL,
        campaign_id TEXT NOT NULL REFERENCES campaigns(campaign_id),
        spend       REAL NOT NULL,
        revenue     REAL NOT NULL,
        PRIMARY KEY (day, campaign_id)
    );
CREATE TABLE campaigns (
        campaign_id TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        channel     TEXT NOT NULL,
        margin      REAL NOT NULL
    );
CREATE TABLE custom_inventory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                sku_id TEXT NOT NULL,
                product_name TEXT NOT NULL,
                stock_level INTEGER NOT NULL,
                selling_price REAL NOT NULL,
                unit_cost REAL,
                campaign_id TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            );
CREATE TABLE inventory (
        sku_id       TEXT PRIMARY KEY,
        product_name TEXT NOT NULL,
        stock_level  INTEGER NOT NULL,
        net_margin   REAL NOT NULL,
        status       TEXT NOT NULL,
        campaign_id  TEXT REFERENCES campaigns(campaign_id)
    );
CREATE TABLE sessions (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            );
CREATE TABLE sqlite_sequence(name,seq);
CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                created_at TEXT NOT NULL
            );