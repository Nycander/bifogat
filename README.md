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
- **Lokal lagring & Synk**: Data sparas lokalt i IndexedDB (fungerar helt utan internet). Valfri molnsynk till Google Sheets via Google-inloggning med Firebase Authentication.

---

## Snabbstart lokalt

Projektet kräver **Node.js 24 eller senare** och använder **pnpm**:

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

### 3. Firebase- och Google-konfiguration (om du vill ha molnsynk)
Firebase används för Google-inloggning, inte för att lagra appdata: molnsynken använder Google Sheets. För att aktivera den på din Pages-domän (`https://<användare>.github.io/bifogat/`):
- Aktivera Google som inloggningsleverantör i Firebase Authentication och lägg till din Pages-domän under **Authorized domains**.
- Aktivera Google Sheets API i det kopplade Google Cloud-projektet.
- Lägg till följande Actions-secrets under **Settings > Secrets and variables > Actions**. Arbetsflödet använder dem när klienten byggs; utan dem fungerar appens lokala lagring fortfarande, men Google-inloggning och molnsynk gör det inte.
  - `VITE_FIREBASE_API_KEY`
  - `VITE_FIREBASE_AUTH_DOMAIN`
  - `VITE_FIREBASE_PROJECT_ID`
  - `VITE_FIREBASE_STORAGE_BUCKET`
  - `VITE_FIREBASE_MESSAGING_SENDER_ID`
  - `VITE_FIREBASE_APP_ID`

---

## Licens

Öppen källkod under MIT-licens.
