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
| Tagesbelohnung, Tagesmission, Erfolge | ✔ | ✔ 34 Erfolge (0005) | 6 ✅ |
| Spendenlink (auch ohne Login) | ✔ | ✔ (0003/0006) | 4 ✅ |
| Plunder (14 Stück, anlegen, verkaufen) | ✔ | ✔ (0003) | 4 ✅ |
| Kronkorken + Tauschladen | ✔ | ✔ (0003) | 4 ✅ |
| Profil: Bio, Motto, Gästebuch, fremde Profile | ✔ | ✔ (0003) | 4 ✅ |
| Freundesliste, Spielersuche, Blockieren | ✔ | ✔ (0003) | 4 ✅ |
| Nachrichten | ✔ | ✔ | – |
| Bande: Ränge, Einladungen, Bewerbungen, Chat, Protokoll | ✔ | ✔ (0004) | 5 ✅ |
| Bandenkriege, Banden-Highscore | ✔ | ✔ (0004) | 5 ✅ |
| Tierkämpfe | ✔ | ✔ (0005) | 6 ✅ |
| Wetter (Server, wirkt auf Pfand), Preisverlauf | ✔ | ✔ (0003) | 6 ✅ |
| Events (Admin), Wochenwettbewerb mit Preisen | ✔ | ✔ (0005) | 6 ✅ |
| Highscore Spieler (Punkte), Häuser mit Preisen | ✔ | ✔ | 6 ✅ |
| Admin/Moderation, Live-Check, Mobile | – | ✔ live | 7 ✅ |
| Systemnachrichten (Kampfberichte, Anfragen, Gewinne), gelesen/ungelesen | ✔ | ✔ (0008) | 8 ✅ |
| Profilbild, Einstellungen (Passwort, Name), Freunde werben | ✔ | ✔ (0008) | 8 ✅ |
| Gegenstände verkaufen, Essen, Kiez-Lotto, Kiez-Brett, Kiez-News | ✔ | ✔ (0008/0009) | 8 ✅ |

## Etappen
1. ✅ Bestandsaufnahme
2. ✅ Sicherheit & Logikfehler (0001)
3. ✅ Balancing (0002): ein Punkte-System, Kampfbereich, Versicherung, Konzentration, Preise, Schnorren
4. ✅ Soziales & Nebenwährungen (0003, 0006)
5. ✅ Banden komplett (0004)
6. ✅ Langzeitmotivation (0005)
7. ✅ Go-Live: Rechte-Check (0006), Admin (0007), Mobile geprüft, live auf Vercel
8. ✅ Runde 2: Klick-Tests aller Seiten/Knöpfe, leere Reiter repariert, Verbrechen repariert (0009), restliche Pennergame-Funktionen (0008/0009)
