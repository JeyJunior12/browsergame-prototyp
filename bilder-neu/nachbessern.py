# Nachbesserung nach Einzelprüfung (Bild passte nicht zur Karte). Überschreibt das Motiv in erzeugen.py.
# Aufruf: python bilder-neu/nachbessern.py [name ...]  -> je 1 Kandidat nach $TEMP/kzstil/kandidaten
NEU = {
 "plunder-alufolienkrone": "a homemade king crown folded from crumpled shiny aluminium kitchen foil",
 "plunder-dosenpanzer": "a homemade chest armor made of flattened crushed aluminium beer cans without labels tied together with string and a belt",
 "plunder-kiezzepter": "a wooden broomstick decorated with glitter and a cardboard star on top, used as a king scepter",
 "basteln-stachelschild": "a round shield made of old wooden planks with many long iron nails sticking out of the front",
 "basteln-doppelschild": "a thick shield made of two layers of wooden planks nailed crosswise, with a leather handle",
 "basteln-anzug-alt": "a torn dirty old suit jacket and trousers with holes and stains on a wire hanger",
 "basteln-schirm-kaputt": "a black umbrella with bent and broken ribs and torn fabric",
 "kk-dusche": "a shower head spraying hot water with steam in a shabby tiled public shower room",
 "bande-gruenden": "a plain black flag with a single round white circle on it, tied to a wooden stick stuck in a pile of beer crates",
 "bande-liste": "an underpass wall covered from top to bottom in bright colorful graffiti murals, abstract colorful shapes, a group of hooded people standing in front",
 "bande-krieg": "two crossed wooden baseball bats lying in front of a burning fire barrel",
 "bande-mitglieder": "a group of five homeless men standing together under a concrete bridge",
 "bande-kasse": "an open battered metal cash box full of euro coins, next to a worn notebook and a pencil",
 "brett": "a cork board with many pinned paper notes and colorful pushpins hanging on a wall",
 "wettbewerb-pokal": "a dented tin trophy cup standing upright on a beer crate",
 "wettbewerb-banden": "a small wooden winner podium with three steps of different heights",
 "erfolg-03": "an overflowing public glass recycling container with many bottles piled around it",
 "erfolg-13": "a worn wooden baseball bat with many tally marks carved into the wood",
 "erfolg-18": "a man flexing his strong tattooed biceps",
 "erfolg-23": "a small toy castle built from cardboard boxes with towers and battlements",
 "rang-08": "the huge black silhouette shadow of a man in a long coat projected on a bright white house wall",
 "rang-11": "a VIP entry wristband and a glass of beer on a bar counter",
 "einst-name": "a dented blank metal door name plate without any letters",
 "lotto": "a clear glass bowl filled with small colorful numbered lottery balls on a kiosk counter",
 "gebiet-luxus": "the back entrance of a luxury hotel with a black limousine and a doorman",
 "vert-elektrozaun": "a makeshift fence of several horizontal wires strung between wooden posts around a tent, connected to a car battery with cables",
 "vert-fischernetz": "a fishing net stretched between two walls across an alley",
 "vert-fallgrube": "a hole dug in the ground partly covered with cardboard and leaves, a trap",
 "klein-grashalm": "close-up of two thumbs holding a blade of grass to whistle on it",
 "szene-pruegelei": "two homeless men wrestling each other in a backyard, a small crowd of people watching and cheering",
 "szene-erfolge": "a flea market table on the street covered with old medals, trophies and badges",
 "stadt-supermarkt": "shopping carts in front of a cheap discount supermarket entrance, no signs, no text",
 "ausbau-0": "a torn plastic bag full of empty deposit bottles",
 "ausbau-6": "an open black metal cash box with euro banknotes",
 "ausbau-7": "a shopping cart with a small lawnmower engine and exhaust pipe mounted at the back, homemade motor vehicle",
 "laden-schirm-halb": "a broken black umbrella with half of its fabric ripped away so the bare metal ribs stick out on one side",
 "laden-trillerpfeife": "a shiny metal sports whistle on a lanyard",
 "laden-taschenlampe": "a black flashlight switched on, casting a light beam",
 "laden-geldversteck": "an old tin can with rolled euro banknotes hidden inside",
 "waffe-limoflasche": "the broken-off top of a green glass bottle, only the neck and shoulder with a sharp jagged broken edge, surrounded by green glass shards, close-up",
 "waffe-schlagring": "brass knuckles with four finger holes, metal knuckle duster weapon, close-up",
 "waffe-silvesterknaller": "red firecrackers with fuses and a lighter",
 "waffe-gummiknueppel": "a black police rubber baton",
 "waffe-nagelkeule": "a wooden baseball bat with many nails hammered through it",
 "essen-kartonwein": "a cheap red wine tetra pak carton with a straw",
 "vert-bananen": "banana peels scattered on the ground",
 "vert-tarnen": "a man lying covered head to toe under a pile of autumn leaves in a park, only his face peeking out",
 "heim-brunnen": "a sleeping bag next to an old stone city fountain with water",
 "heim-wolfsrudel": "a homeless man sleeping on blankets surrounded by several stray dogs",
 "verbrechen-einbruch": "close-up of a red crowbar prying open a wooden door, wood splinters",
 "verbrechen-bank": "a black ski mask and a sack of euro banknotes lying on the ground",
 "kampf-verteidigung": "a homeless man holding a round metal trash can lid in front of his body like a shield",
 "rubbellose": "a small shabby street kiosk window with a rack of colorful scratch cards and lottery tickets, a hand holding a coin, no text",
}
# Szenen- statt Gegenstands-Vorlage (sonst liegt alles auf dem Gehweg)
ART = {"rubbellose": "q", "kampf-verteidigung": "q", "kk-dusche": "q", "bande-gruenden": "q", "bande-liste": "q", "rang-08": "q", "vert-elektrozaun": "q",
       "vert-fallgrube": "q", "heim-brunnen": "q", "heim-wolfsrudel": "q", "vert-tarnen": "q", "verbrechen-einbruch": "q"}

if __name__ == "__main__":
    import os, sys
    sys.path.insert(0, os.path.dirname(__file__))
    import erzeugen as e
    art = {n: a for n, a, m in e.BILDER}
    out = os.path.join(os.environ["TEMP"], "kzstil", "kandidaten"); os.makedirs(out, exist_ok=True)
    e.OUT = out; e.CFG = 6
    for name in (sys.argv[1:] or NEU):
        for i in range(int(os.environ.get("KZ_N", "1"))):
            if os.path.exists(os.path.join(out, name + "-" + str(i) + ".webp")): continue
            for versuch in range(3):
                try: e.erzeuge(name + "-" + str(i), art[name], NEU[name]); break
                except Exception as x: print("fehler", name, x, flush=True)
        print("ok", name, flush=True)
    print("fertig")
