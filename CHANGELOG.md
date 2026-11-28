# Changelog

## 2.0.0 (multi-shop platform)
- **Accounts:** logins for shopkeepers and a platform admin; PBKDF2-hashed passwords, token sessions, lockout after wrong passwords.
- **Data isolation:** one SQLite database per shop; the shop is chosen only from the login.
- **Admin console:** add shops (one-time password, WhatsApp hand-over), reset passwords, pause and resume, per-shop and total counts.
- **Mixed languages:** English said with Hindi or Gujarati selected (written in Indic script) is understood; Vaani replies in the language spoken and switches the app; Gujarati heard as Devanagari and Hindi heard as Gujarati script are fixed.
- **Deployment:** GitHub Pages workflow (static app) + Render blueprint (API), configurable server address, CI for tests, build and Docker.
- **Docs:** user, admin, deployment, architecture, API, security.

## 1.3.0
- Hands-free conversation mode, chat history across reloads.
- Synonyms (deposit / add money / jama), settling the full balance, "Priya ke liye bhi", "aur 500".
- Reminders that ring, speak, vibrate and notify, with Call / WhatsApp / Done / Snooze; natural times in three languages.
- Whole app translated; plain "Today" screen.

## 1.2.0
- Customer voice signatures with SHA-256 hash chain and tamper check.
- Conversational agent: follow-up questions, memory, undo, daily hisaab; Indic numbers and names.
- Phone-first UI, PWA, https phone mode; one-command Docker.

## 1.1.0
- Khata / udhar ledger, hands-free yes/no confirmation.
