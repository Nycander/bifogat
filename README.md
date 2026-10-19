# Bifogat 🐝

> Kupjournal, skördelogg och ekonomihantering för biodlare — helt offline-kapabel PWA byggd med React, TypeScript, Tailwind och pnpm.

## Översikt

**Bifogat** är utformat för biodlare som behöver en snabb, pålitlig och offline-först journal direkt i bigården.
- **Kupjournal & Besökslogg**: Registrera besiktning, invintring, behandling och avläggare. Se och bocka av planerade åtgärder under besöket och skapa nya uppgifter till nästa gång.
- **Optimerat Skördeflöde & Batch-hantering**:
  - **1) Skördedag / Slungning**: Skapa skördepartier (t.ex. *Vårskörd 2026*, *Sensommarskörd 2026*), registrera slungad vikt (kg), insamlingsdatum och vattenhalt (%) mätt med refraktometer.
  - **2) Tappning på burk**: Registrera burkfyllning (antal burkar och storlek) vid flera tillfällen mot batchen, även parallellt från flera partier, med automatisk beräkning av kvarvarande honungsmängd i mognadskärl.
- **Uppgiftshantering**: Håll koll på att-göra för enskilda kupor eller allmänna sysslor i bigården.
- **Ekonomi & Kassa**: Intäkter (honungsförsäljning) och utgifter (ramar, foder, redskap) med import från svenskt bank-CSV.
- **Lokal lagring & Synk**: Data sparas lokalt i IndexedDB (fungerar helt utan internet). Valfri molnsynk mot Google Sheets via OAuth eller Firebase Firestore.

---

## Snabbstart lokalt

Projektet använder **pnpm**:

```bash
# Installera beroenden
pnpm install

# Starta utvecklingsservern
pnpm dev

# Kör tester
pnpm test

# Bygg produktions-PWA
pnpm build
```

---

## Driftsättning på GitHub Pages

Eftersom Bifogat är en klientapplikation (SPA/PWA) kan den driftas helt gratis via GitHub Pages med automatisk bygg- och deploypipeline.

### 1. Skapa repository & pusha koden
```bash
git remote add origin https://github.com/<ditt-användarnamn>/bifogat.git
git branch -M main
git push -u origin main
```

### 2. Aktivera GitHub Pages
1. Gå till repot på GitHub: **Settings > Pages**.
2. Under **Build and deployment > Source**, välj **GitHub Actions**.
3. Arbetsflödet `.github/workflows/deploy.yml` bygger automatiskt applikationen med `pnpm` och distribuerar till GitHub Pages vid varje push till `main`.

### 3. Google OAuth & Firebase Secrets (om du vill ha molnsynk)
Om du använder Google Sheets-synk eller Firebase på din egen Pages-domän (`https://<användare>.github.io/bifogat/`):
- Lägg till din GitHub Pages-URL under **Authorized JavaScript origins** i Google Cloud Console för ditt OAuth Client ID.
- Om du använder GitHub Secrets, lägg till `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN` etc. under **Settings > Secrets and variables > Actions**.

---

## Licens

Öppen källkod under MIT-licens.
