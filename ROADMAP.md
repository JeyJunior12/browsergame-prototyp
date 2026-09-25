# Kiezkönig – Gesamtplan

Ziel: alle Kernfunktionen von Pennergame, voll funktionsfähig (Logik in Supabase-SQL, Oberfläche in `index.html`),
mit eigenen Texten und Bildern. Jede Etappe = Migration(en) + Tests + Browser-Test mit Testkonto + Push.

```
Browser (index.html) ──rpc──▶ Supabase SQL-Funktionen (Spiellogik, SECURITY DEFINER)
        ▲                               │
        └────── select (nur lesen) ◀────┘ Tabellen mit SELECT-Policies
GitHub push ──▶ Action: Tests (Postgres) ──▶ Migration live in Supabase
```

## Stand der Funktionen

| Bereich | Pennergame | Kiezkönig | Etappe |
|---|---|---|---|
| Pfandtour mit Dauer, Flaschenkurs, Verkaufen | ✔ | ✔ | – |
| Punkte / Level / Kampfbereich 80–150 % | ✔ | ✔ (0002) | 3 ✅ |
| Weiterbildungen (8 Skills), Konzentration | ✔ | ✔ (0002 mit Nachteil) | 3 ✅ |
| Kämpfe, Schutzzeit, Knast, Kaution, Verbrechen | ✔ | ✔ | 3 ✅ |
| Alkohol/Promille, Apotheke, Krankenversicherung | ✔ | ✔ (0002 sinnvoll) | 3 ✅ |
| Schnorren, Schnorrplätze nach Gebiet, Musizieren | ✔ | ✔ (0002: 6 Plätze) | 3 ✅ |
| Waschen/Sauberkeit, Unterkünfte, Geldbehälter | ✔ | ✔ | – |
| Waffen/Schutz/Zubehör, Haustiere + Training | ✔ | ✔ | – |
| Tagesbelohnung, Tagesmission, Erfolge | ✔ | teilweise (6 Erfolge) | 6 |
| **Spendenlink** (andere geben dir Geld per Link) | ✔ | ✗ | 4 |
| **Plunder** (Fundstücke mit Effekten, anlegen) | ✔ | nur Oberfläche | 4 |
| **Kronkorken** (Nebenwährung, Tausch) | ✔ | nur Oberfläche | 4 |
| **Profil: Bio, Gästebuch, Profilansicht** | ✔ | nur Oberfläche | 4 |
| **Freundesliste / Blockieren** | ✔ | ✗ | 4 |
| Nachrichten | ✔ | ✔ | – |
| **Bande: Einladungen, Ränge, Kasse-Protokoll** | ✔ | teilweise | 5 |
| **Bandenkämpfe, Banden-Highscore** | ✔ | ✗ | 5 |
| **Tierkämpfe** | ✔ | ✗ | 6 |
| **Wetter, Flaschen-Preisverlauf** | ✔ | nur Oberfläche | 6 |
| **Events / Wochen-Wettbewerbe, mehr Erfolge** | ✔ | ✗ | 6 |
| Highscore Spieler (Punkte), Häuser-Galerie | ✔ | teilweise | 6 |
| Admin/Moderation, Live-Check, Mobile, Startseite | – | teilweise | 7 |

## Etappen
1. ✅ Bestandsaufnahme
2. ✅ Sicherheit & Logikfehler (0001) – offen: XSS-Fix per PR nach `main`
3. ✅ Balancing (0002): ein Punkte-System, Kampfbereich, Versicherung, Konzentration, Preise, Schnorren
4. Soziales & Nebenwährungen: Spendenlink, Plunder, Kronkorken, Profil/Bio/Gästebuch, Freunde
5. Banden komplett: Einladungen, Ränge/Rechte, Kassenprotokoll, Bandenkämpfe, Banden-Highscore
6. Langzeitmotivation: Tierkämpfe, Wetter, Preisverlauf, Events, Wettbewerbe, 30+ Erfolge, Highscores
7. Go-Live: Production-Audit, Admin-Werkzeuge, Mobile-Feinschliff, Startseite/SEO, Merge nach `main`
