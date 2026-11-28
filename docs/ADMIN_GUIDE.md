# Admin guide (platform owner)

The admin console is for whoever runs VyaparVaani for many shops. Log in with the admin account
(`ADMIN_LOGIN` / `ADMIN_PASSWORD`; demo: `admin` / `admin@123`).

## First steps

1. **Change your password:** Password (top right).
2. In production, start with `SEED_DEMO=false`, or pause the two demo shops.

## Add a shop

**Add shop** → shop name, city, owner name, owner phone, **Login ID** (letters, numbers and `. _ @ + -`).
Leave the password empty to generate an easy-to-read one (like `kq7m-x3vt`).

The login and password are shown **once**. Use **Send on WhatsApp** or **Copy** to hand them over.
Passwords are stored as hashes, so they can't be shown again, only reset.

Each new shop gets its own empty database. Tick *Start with sample data* only for demos.

## Every shop at a glance

For each shop: status, owner, login, last login, and counts (customers, bills, udhar outstanding, voice commands,
voice signatures). The top cards add everything up.

The console shows **numbers only**. Customer names, khata entries and voice recordings stay private to the shop.

## Reset a password

**Reset password** → a new one-time password. The shop is logged out everywhere.

## Pause a shop

**Pause**: the shop can't log in and is signed out at once (e.g. unpaid subscription). Their data is kept.
**Resume** brings it back.

## Backups

Everything is in `DATA_DIR`: `platform.db` (accounts) and `shops/<shop_id>.db` (one per shop).
See [DEPLOYMENT.md](DEPLOYMENT.md#5-data-backups-and-upgrades).
