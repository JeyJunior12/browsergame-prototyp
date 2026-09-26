# Erzeugt alle Bilder aus BILDERLISTE.md über die lokale Forge-API (SD WebUI) -> bilder/*.webp
# Aufruf: python bilder-neu/erzeugen.py [dateiname ...]   (ohne Namen: alle fehlenden)
import base64, io, json, os, sys, urllib.request
from PIL import Image

API = "http://127.0.0.1:7860/sdapi/v1/txt2img"
OUT = os.path.join(os.path.dirname(__file__), "..", "bilder")
# Stil "Handyfoto Tageslicht" (vom Nutzer gewählt): echt wirkende Schnappschüsse, kein Kino-Look
OBJ = ("amateur smartphone photo of {}, old, worn and dirty, belonging of a homeless person, "
       "lying on flattened cardboard on a grubby sidewalk in a German city, empty deposit bottles and litter nearby, "
       "grey overcast daylight, unedited, raw, candid everyday snapshot, real photo")
SCN = ("amateur smartphone photo of {}, homeless street life in a run-down German city district, "
       "cardboard, old sleeping bag, empty deposit bottles, plastic bags, litter, faded graffiti, "
       "grey overcast daylight, unedited, raw, candid everyday snapshot, real photo")
NEG = ("cinematic, dramatic lighting, hdr, cgi, 3d render, digital art, illustration, painting, cartoon, anime, "
       "oversaturated, color grading, glow, rim light, studio lighting, bokeh, perfect, polished, fantasy, "
       "text, letters, words, numbers, writing, logo, brand, label, watermark, signature, blurry, deformed, bad hands")

# (datei, art, motiv)  art: o = Gegenstand 512, q = Szene quadratisch 512, s = Szene 800x500, h = 1600x700
BILDER = [
 # A Startseite
 ("start-hero", "h", "a narrow night street in a German city district, wet cobblestones, empty deposit bottles lined up at the curb, warm street lamp, small kiosk glowing in the background"),
 ("start-pfand", "s", "a shopping cart full of empty glass and plastic bottles in a side alley"),
 ("start-weiterbilden", "s", "a stack of worn dog-eared books and a burning candle on a park bench"),
 ("start-kampf", "s", "bandaged fists of a street fighter, next to him a scruffy dog, backyard"),
 ("start-bande", "s", "a group of anonymous silhouettes under a bridge around a burning fire barrel"),
 ("start-plunder", "s", "a wooden crate full of junk and trinkets, bottle caps and lottery balls"),
 ("start-wettbewerb", "s", "a dented tin trophy cup standing on stacked beer crates, spotlight"),
 # B Profil
 ("profil-standard", "q", "a hooded figure seen from behind standing under a street lamp"),
 ("profil-spende", "o", "an upturned worn hat with coins in it on the sidewalk"),
 ("profil-bearbeiten", "o", "a fountain pen lying on a crumpled notepad"),
 ("profil-gaestebuch", "o", "an old open leather book with unreadable scribbles"),
 # C Plunder, Lager, Basteln
 ("plunder-kronkorkenkette", "o", "a necklace made of metal bottle caps on a string"),
 ("plunder-alufolienkrone", "o", "a king's crown made of crumpled aluminium foil"),
 ("plunder-ein_handschuh", "o", "a single worn wool glove"),
 ("plunder-rostiger_schluessel", "o", "a big rusty old key"),
 ("plunder-plastikblume", "o", "a dusty plastic flower in a cracked flower pot"),
 ("plunder-taschenlampe", "o", "an old flashlight with its battery compartment open and empty"),
 ("plunder-fahrradkette", "o", "a greasy coiled bicycle chain"),
 ("plunder-dosenpanzer", "o", "a chest armor made of crushed blank tin cans tied together with a belt"),
 ("plunder-glueckspfandbon", "o", "a faded yellowed paper receipt with a four-leaf clover taped on it"),
 ("plunder-stadtplan", "o", "a torn stained folded paper city map"),
 ("plunder-bauhelm", "o", "a yellow construction helmet with a glowing headlamp"),
 ("plunder-goldene_dose", "o", "a shining golden drink can glowing like treasure"),
 ("plunder-kiezzepter", "o", "a scepter made of a broomstick covered in glitter with a star on top"),
 ("lager-inventar", "o", "a bulging jute sack filled with bottles, nails, planks and rags"),
 ("basteln-holzschild", "o", "a round shield made of old wooden planks"),
 ("basteln-stachelschild", "o", "a wooden plank shield studded with nails"),
 ("basteln-glasstachelschild", "o", "a wooden plank shield studded with shards of broken glass"),
 ("basteln-doppelschild", "o", "a double reinforced wooden plank shield with metal bands"),
 ("basteln-anzug-alt", "o", "a shabby torn suit on a wire hanger"),
 ("basteln-anzug-fein", "o", "a patched but elegant dark suit on a wooden hanger"),
 ("basteln-schirm-kaputt", "o", "a broken umbrella with snapped ribs"),
 ("basteln-schirm", "o", "a repaired black umbrella, open"),
 # D Kronkorken
 ("kk-vorrat", "o", "a handful of shiny metal bottle caps"),
 ("kk-energie", "o", "a blank energy drink can with a lightning bolt drawn on it"),
 ("kk-dusche", "o", "a steaming hot shower head with water drops"),
 ("kk-kaffee", "o", "a chipped mug of strong black coffee with steam"),
 ("kk-knast", "o", "a bundle of banknotes next to a prison key ring"),
 ("kk-plunderkiste", "o", "an old wooden crate overflowing with junk and trinkets"),
 # E Banden
 ("bande-gruenden", "o", "a black flag with a white bottle cap symbol on a wooden pole"),
 ("bande-liste", "q", "a colorful abstract graffiti brick wall"),
 ("bande-krieg", "o", "two crossed wooden planks in front of a burning fire barrel"),
 ("bande-chat", "o", "two old walkie-talkies"),
 ("bande-mitglieder", "q", "silhouettes of a group of people under a bridge"),
 ("bande-kasse", "o", "a battered tin cash box with coins next to a worn notebook"),
 # F Brett, Freunde
 ("brett", "o", "a cork board with blank paper notes and pushpins"),
 ("freunde-suche", "o", "a magnifying glass over a paper street map"),
 ("freunde", "o", "two hands in fingerless gloves shaking hands"),
 # G Wettbewerb
 ("wetter", "q", "a street lamp in the rain with a puddle reflecting the light"),
 ("events", "q", "a string of fairy lights hanging over a narrow alley"),
 ("wettbewerb-pokal", "o", "a dented tin trophy cup"),
 ("wettbewerb-banden", "o", "a small wooden winner podium with three steps"),
 # H Erfolge
 ("erfolg-01", "o", "a plastic bag with a few empty deposit bottles"),
 ("erfolg-02", "o", "a crate full of empty glass bottles"),
 ("erfolg-03", "q", "an overflowing glass recycling container"),
 ("erfolg-04", "o", "a hand holding a glass bottle to an ear, listening"),
 ("erfolg-05", "o", "a golden glowing pile of bottles"),
 ("erfolg-06", "o", "a blank metal street sign with a star sticker"),
 ("erfolg-07", "o", "a worn old medal on a ribbon"),
 ("erfolg-08", "o", "a crumpled blank newspaper"),
 ("erfolg-09", "o", "a signet ring set with a bottle cap"),
 ("erfolg-10", "o", "a crown made of bottle caps on a red velvet cushion"),
 ("erfolg-11", "o", "a clenched fist in a fingerless glove"),
 ("erfolg-12", "o", "boxing hand wraps hanging on a rusty nail"),
 ("erfolg-13", "o", "a brass knuckle made of bottle caps"),
 ("erfolg-14", "o", "a metal trash can lid used as a shield"),
 ("erfolg-15", "o", "a small pile of copper coins"),
 ("erfolg-16", "o", "a bulging jute money sack"),
 ("erfolg-17", "o", "a thick bundle of banknotes with a rubber band"),
 ("erfolg-18", "o", "a flexed muscular arm with a bottle tattoo"),
 ("erfolg-19", "o", "a thick worn leather jacket"),
 ("erfolg-20", "o", "a handshake over two paper coffee cups"),
 ("erfolg-21", "o", "an old acoustic guitar with a hat in front of it"),
 ("erfolg-22", "q", "a tent under a bridge glowing with warm light inside"),
 ("erfolg-23", "o", "a small castle built from cardboard boxes"),
 ("erfolg-24", "o", "a paper city map with many routes drawn on it"),
 ("erfolg-25", "o", "a paper calendar page with every day crossed out"),
 ("erfolg-26", "o", "an old pocket watch with a cracked glass"),
 ("erfolg-27", "o", "a scruffy dog looking up"),
 ("erfolg-28", "o", "a pigeon eating from an open hand"),
 ("erfolg-29", "o", "an old cabinet full of junk and trinkets"),
 ("erfolg-30", "o", "a scepter made of scrap metal"),
 ("erfolg-31", "q", "a chalk heart drawn on cobblestones"),
 ("erfolg-32", "o", "a leather jacket with a blank embroidered patch"),
 ("erfolg-33", "o", "a hat full of coins and banknotes"),
 ("erfolg-34", "q", "a dark alley entrance lit by red light"),
 ("erfolg-meilensteine", "o", "chalk tally marks and a chalk target drawn on a brick wall"),
 # I Ränge
 ("rang-01", "q", "a torn plastic bag lying in the rain"),
 ("rang-02", "o", "a dog nose sniffing at a glass bottle"),
 ("rang-03", "q", "a park bench at night with a newspaper blanket"),
 ("rang-04", "q", "a small kiosk window at night with warm light"),
 ("rang-05", "q", "a hooded figure standing under a street lamp"),
 ("rang-06", "o", "a captain's cap on a stack of cardboard boxes"),
 ("rang-07", "q", "a throne made of old car tires in a backyard"),
 ("rang-08", "q", "a menacing large shadow of a man on a house wall"),
 ("rang-09", "o", "a worn medal and a dog tag"),
 ("rang-10", "o", "a black top hat on a stack of bottles"),
 ("rang-11", "o", "a VIP wristband lying on a pub counter"),
 ("rang-12", "o", "an open steel safe full of empty bottles"),
 ("rang-13", "q", "a bronze statue of a street hero holding a bottle"),
 ("rang-14", "o", "a crown made of concrete and rebar"),
 ("rang-15", "o", "a golden throne built from bottle crates"),
 # J Einstellungen
 ("einst-profilbild", "o", "an old instant camera with a photo sliding out"),
 ("einst-name", "o", "a dented blank metal name plate on a wooden door"),
 ("einst-passwort", "o", "a heavy rusty padlock"),
 ("einst-abmelden", "q", "an old wooden door slightly open with warm light behind it"),
 # K
 ("lotto", "o", "lottery balls in a small wire drum"),
 # L Sammelgebiete
 ("gebiet-bahnhof", "s", "a backyard next to a train station, rail tracks, graffiti walls"),
 ("gebiet-altglas", "s", "an alley with glass recycling containers"),
 ("gebiet-park", "s", "a neglected city park at night, bench, litter"),
 ("gebiet-touristen", "s", "a busy shopping street with souvenir stalls"),
 ("gebiet-luxus", "s", "the back entrance of a luxury hotel with a black limousine"),
 # M Verteidigung
 ("vert-elektrozaun", "o", "an improvised electric fence made of wires and cables"),
 ("vert-fischernetz", "q", "a fishing net stretched across an alley"),
 ("vert-stacheldraht", "o", "a coil of barbed wire"),
 ("vert-selbstschuss", "o", "a homemade confetti cannon built from metal pipes"),
 ("vert-wassergraben", "q", "a water-filled ditch in front of a small tent"),
 ("vert-fallgrube", "q", "a pit covered with cardboard on the ground"),
 ("vert-schlingfalle", "o", "a rope snare trap with a beer bottle as bait"),
 # N Kleinigkeiten
 ("klein-werben", "o", "a megaphone hanging on a street lamp post"),
 ("klein-container", "o", "a tin can used as a donation box with coins"),
 ("klein-grashalm", "o", "a blade of grass held between two thumbs"),
 ("klein-park", "q", "a meadow with a small camp made of cardboard boxes"),
]

GEN = {"o": (1024, 1024), "q": (1024, 1024), "s": (1216, 760), "h": (1536, 672)}
ZIEL = {"o": (512, 512), "q": (512, 512), "s": (800, 500), "h": (1600, 700)}

def erzeuge(name, art, motiv):
    w, h = GEN[art]
    body = {"prompt": (OBJ if art == "o" else SCN).format(motiv), "negative_prompt": NEG,
            "width": w, "height": h, "steps": 26, "cfg_scale": 4.5, "sampler_name": "DPM++ 2M SDE",
            "scheduler": "Karras", "seed": -1}
    req = urllib.request.Request(API, json.dumps(body).encode(), {"Content-Type": "application/json"})
    img = Image.open(io.BytesIO(base64.b64decode(json.load(urllib.request.urlopen(req, timeout=900))["images"][0])))
    tw, th = ZIEL[art]
    s = max(tw / img.width, th / img.height)
    img = img.convert("RGB").resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)
    l, t = (img.width - tw) // 2, (img.height - th) // 2
    img.crop((l, t, l + tw, t + th)).save(os.path.join(OUT, name + ".webp"), "WEBP", quality=80, method=6)

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    wahl = set(sys.argv[1:])
    for name, art, motiv in BILDER:
        ziel = os.path.join(OUT, name + ".webp")
        if (wahl and name not in wahl) or (not wahl and os.path.exists(ziel)):
            continue
        for versuch in range(3):  # Forge hängt manchmal – dann neu versuchen
            try:
                erzeuge(name, art, motiv); break
            except Exception as e:
                print("fehler", name, e, flush=True)
        else:
            continue
        print("ok", name, os.path.getsize(ziel) // 1024, "KB", flush=True)
    print("fertig", len(BILDER))
