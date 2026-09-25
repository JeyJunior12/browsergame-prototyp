# Browser-Tests (gegen die Live-Datenbank)

Starten (Passwort des Testkontos nie ins Repo – nur als Datei im Scratchpad oder Umgebungsvariable):

```
G=$(npm root -g) NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt KIEZ_MAIL=… KIEZ_MAIL2=… KIEZ_PW_FILE=/pfad/pw.txt node test/browser/crawl.js
```

- `crawl.js` – klickt jedes Hauptmenü, jeden Menüpunkt, jeden Reiter, die Reiterleisten (Übersicht + Stadt) und die Stadtkarte; meldet leere Ansichten, JS-Fehler und Server-Fehler. Erwartung: `LEER: 0`.
- `spielen.js` – spielt per Klick (Verbrechen, Schnorren, Waschen, Kiezaktion, Weiterbildung, Pfandtour, Ausbau, Getränk, Lotto, Kiez-Brett, Kronkorken, Profilbild, Post) und zeigt die Meldungen.
- `banden.js` – Bande gründen, Testkonto 2 einladen, Einladung annehmen, Chat, Einzahlen (zwei Konten).
- `lib.js` – liefert die Seite vom Fake-Host `https://kiez.test/` aus dem Repo, alles andere geht über den Proxy.

- `kampf.js` / `alles.js` – brauchen den Testmodus (siehe CLAUDE.md) und vier Testkonten (`KIEZ_MAIL_BASE`).
