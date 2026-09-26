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
 "kk-dusche": "hot water running from a shower head in a shabby public shower with steam",
 "bande-gruenden": "a black flag with a white bottle cap symbol waving on a wooden pole",
 "bande-liste": "a brick wall fully covered with colorful abstract graffiti tags, no readable letters",
 "bande-krieg": "two crossed wooden baseball bats lying in front of a burning fire barrel",
 "bande-mitglieder": "a group of five homeless men standing together under a concrete bridge",
 "bande-kasse": "a battered metal cash box full of euro coins and euro banknotes next to a worn notebook",
 "brett": "a cork board with many pinned paper notes and colorful pushpins hanging on a wall",
 "wettbewerb-pokal": "a dented tin trophy cup standing upright on a beer crate",
 "wettbewerb-banden": "a small wooden winner podium with three steps of different heights",
 "erfolg-03": "an overflowing public glass recycling container with many bottles piled around it",
 "erfolg-13": "brass knuckles decorated with metal bottle caps",
 "erfolg-18": "a man flexing his strong tattooed biceps",
 "erfolg-23": "a small toy castle built from cardboard boxes with towers and battlements",
 "rang-08": "a big menacing dark shadow of a man cast on a house wall by a street lamp",
 "rang-11": "a VIP entry wristband and a glass of beer on a bar counter",
 "einst-name": "a dented blank metal door name plate without any letters",
 "lotto": "numbered lottery balls tumbling inside a small round wire drum",
 "gebiet-luxus": "the back entrance of a luxury hotel with a black limousine and a doorman",
 "vert-elektrozaun": "an improvised electric fence made of wires strung between wooden posts, with a car battery",
 "vert-fischernetz": "a fishing net stretched between two walls across an alley",
 "vert-fallgrube": "a hole dug in the ground partly covered with cardboard and leaves, a trap",
 "klein-grashalm": "close-up of two thumbs holding a blade of grass to whistle on it",
 "szene-pruegelei": "two homeless men facing each other ready to fight in a backyard, other people watching, beer crates",
 "szene-erfolge": "a flea market table on the street covered with old medals, trophies and badges",
 "stadt-supermarkt": "shopping carts in front of a cheap discount supermarket entrance, no signs, no text",
 "ausbau-0": "a torn plastic bag full of empty deposit bottles",
 "ausbau-6": "an open black metal cash box with euro banknotes",
 "ausbau-7": "a shopping cart with a small motor and engine mounted on it, homemade vehicle",
 "laden-schirm-halb": "half of an umbrella, only half of the canopy left, broken",
 "laden-trillerpfeife": "a shiny metal sports whistle on a lanyard",
 "laden-taschenlampe": "a black flashlight switched on, casting a light beam",
 "laden-geldversteck": "an old tin can with rolled euro banknotes hidden inside",
 "waffe-limoflasche": "a broken glass bottle with the top smashed off and sharp jagged edges, a bottleneck weapon",
 "waffe-schlagring": "brass knuckles with four finger holes, metal knuckle duster weapon, close-up",
 "waffe-silvesterknaller": "red firecrackers with fuses and a lighter",
 "waffe-gummiknueppel": "a black police rubber baton",
 "waffe-nagelkeule": "a wooden baseball bat with many nails hammered through it",
 "essen-kartonwein": "a cheap red wine tetra pak carton with a straw",
 "vert-bananen": "several brown banana peels scattered on the ground",
 "vert-tarnen": "a man hidden under a pile of cardboard and autumn leaves, only his eyes visible",
 "heim-brunnen": "a sleeping bag next to an old stone city fountain with water",
 "heim-wolfsrudel": "a homeless man sleeping on blankets surrounded by several stray dogs",
 "verbrechen-einbruch": "a crowbar jammed into a broken wooden door",
 "verbrechen-bank": "a black ski mask and a sack of euro banknotes lying on the ground",
 "kampf-verteidigung": "a metal trash can lid held as a shield",
 "rubbellose": "several scratch-off lottery tickets with silver scratched areas and a coin",
}

if __name__ == "__main__":
    import os, sys
    sys.path.insert(0, os.path.dirname(__file__))
    import erzeugen as e
    art = {n: a for n, a, m in e.BILDER}
    out = os.path.join(os.environ["TEMP"], "kzstil", "kandidaten"); os.makedirs(out, exist_ok=True)
    e.OUT = out; e.CFG = 6
    for name in (sys.argv[1:] or NEU):
        for i in range(1):
            if os.path.exists(os.path.join(out, name + "-" + str(i) + ".webp")): continue
            for versuch in range(3):
                try: e.erzeuge(name + "-" + str(i), art[name], NEU[name]); break
                except Exception as x: print("fehler", name, x, flush=True)
        print("ok", name, flush=True)
    print("fertig")
