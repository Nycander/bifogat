# Driftsättning av Bifogat på GitHub Pages

Eftersom **Bifogat** är en renodlad klientapplikation (PWA) som körs i webbläsaren med IndexedDB och pratar direkt med Google Sheets API, behöver du ingen egen server eller databasserver. Du kan drifta den helt kostnadsfritt på GitHub Pages.

---

## Steg 1: Skapa ett GitHub-repository

1. Logga in på [github.com](https://github.com) och skapa ett nytt repository (t.ex. `bifogat` eller `biodling`).
2. Klona eller initiera repot på din dator och lägg till filerna från detta projekt:

```bash
git init
git add .
git commit -m "Initial release of Bifogat Beekeeping PWA"
git branch -M main
git remote add origin https://github.com/<DITT_GITHUB_ANVÄNDARNAMN>/bifogat.git
git push -u origin main
```

---

## Steg 2: Aktivera GitHub Pages i ditt repository

1. Gå till ditt repository på GitHub: `https://github.com/<DITT_GITHUB_ANVÄNDARNAMN>/bifogat`.
2. Klicka på **Settings** (kugghjulet längst upp till höger).
3. I vänstermenyn, klicka på **Pages**.
4. Under **Build and deployment** > **Source**, välj **GitHub Actions**.
5. Klicka på fliken **Actions** längst upp – du kommer se att `.github/workflows/deploy.yml` automatiskt startar, bygger projektet, kör testerna och driftsätter appen!
6. När åtgärden är klar hittar du din länk under Pages-inställningarna, t.ex:
   `https://<DITT_GITHUB_ANVÄNDARNAMN>.github.io/bifogat/`

---

## Steg 3: Tillåt din GitHub Pages-domän i Google Cloud Console

För att Google Sign-in och Google Sheets API ska tillåta inloggning från din GitHub Pages-adress:

1. Gå till [Google Cloud Console](https://console.cloud.google.com/).
2. Välj ditt projekt (t.ex. `gen-lang-client-0062602270` eller ditt eget projekt).
3. Gå till **APIs & Services** > **Credentials** (Autentiseringsuppgifter).
4. Klicka på ditt **OAuth 2.0 Client ID** för webbapplikationen.
5. Under **Authorized JavaScript origins** (Auktoriserade JavaScript-ursprung), lägg till:
   - `https://<DITT_GITHUB_ANVÄNDARNAMN>.github.io`
6. Klicka på **Save** (Spara).

---

## Säkerhet och Skrivskydd

- **Skrivskydd som standard**: I appens inställningar är *Kräv manuellt godkännande innan data skrivs till Google Sheets* aktiverat som standard.
- Du kan fritt läsa från dina kalkylark och göra lokala registreringar offline i IndexedDB.
- När du vill spara lokala registreringar till Google Sheets klickar du på **Förhandsgranska & skicka ändringar**. Där visas varje enskild rad och kolumn innan du bekräftar skrivningen.
