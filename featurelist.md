# OmaSys Feature List

## Version 1.0 — Basis

### Diashow (OmaGUI)
Fotos der Familie werden als automatische Slideshow angezeigt. Alle 8 Sekunden wechselt das Bild automatisch. Per Pfeil-Buttons kann manuell navigiert werden; nach manueller Navigation pausiert der Autoplay für 30 Sekunden.

### Uhr & Datum (OmaGUI)
In der oberen Leiste wird die aktuelle Uhrzeit und das Datum in deutscher Sprache angezeigt.

### Chat (OmaGUI & PostGUI)
Die Familie kann Textnachrichten schicken, Oma kann direkt antworten. Nachrichten erscheinen in Echtzeit per WebSocket auf beiden Seiten.

### Stimmungsknöpfe (OmaGUI)
Oma kann mit vier Buttons ihre aktuelle Stimmung mitteilen (Sehr gut, Ganz gut, Es geht, Durcheinander). Die Reaktion wird in Echtzeit an die Familie übermittelt.

### Foto-Upload (PostGUI)
Die Familie kann einzelne Fotos mit optionaler Bildunterschrift hochladen (Drag & Drop oder Dateiauswahl). Hochgeladene Fotos erscheinen sofort in Omas Diashow. Fotos können nachträglich gelöscht werden.

### Videoanruf (OmaGUI & PostGUI)
Die Familie kann Oma per Knopfdruck anrufen. Oma sieht eine Eingehende-Anruf-Anzeige und kann annehmen oder ablehnen. Der Videoanruf läuft über eine eingebettete Jitsi-Meet-Sitzung.

### Morgengruß (OmaGUI)
Jeden Morgen um 8:00 Uhr erscheint automatisch ein Vollbild-Morgengruß. Zwischen 7:00 und 10:00 Uhr wird er auch beim Öffnen der Seite angezeigt. Oma kann ihn per Knopfdruck wegklicken.

### PIN-Login (OmaGUI)
Oma meldet sich mit einem 4–8-stelligen PIN über einen großen Nummernblock an. Das Token ist 30 Tage gültig.

### Passwort-Login (PostGUI)
Die Familie meldet sich mit einem Passwort an. Das Token ist 7 Tage gültig.

---

## Version 1.1 — Erweiterungen

### Video-Unterstützung in der Diashow (OmaGUI)
Videos (MP4, WebM, MOV, AVI, MKV, OGV, M4V) werden als Teil der Diashow abgespielt. Das Video startet automatisch (stumm, gemäß Browser-Autoplay-Richtlinien) und wechselt nach dem Ende automatisch zum nächsten Bild oder Video. Der 8-Sekunden-Timer wird während der Videowiedergabe ausgesetzt. Videokontrollen sind sichtbar, damit Oma den Ton einschalten oder pausieren kann.

### Video-Upload (PostGUI)
Die Familie kann neben Fotos auch Videos hochladen. Das Dateigrößenlimit wurde auf 200 MB angehoben. Im Upload-Bereich wird eine Videovorschau angezeigt.

### Mehrfach-Upload bis zu 5 Dateien (PostGUI)
Es können bis zu 5 Dateien (Bilder und/oder Videos) gleichzeitig ausgewählt und hochgeladen werden — per Klick oder Drag & Drop. Jede Datei erhält ein eigenes Vorschau-Thumbnail und ein individuelles Beschriftungsfeld. Einzelne Dateien können vor dem Senden entfernt werden. Der Upload läuft nacheinander ab.

### Sidebar ein-/ausblenden (OmaGUI)
Ein Button in der oberen Leiste blendet die rechte Seite (Chat und Stimmungsknöpfe) aus, sodass die Diashow die volle Bildschirmbreite einnimmt. Ein erneuter Klick blendet die Sidebar wieder ein.

### HTTP-Kompatibilität (Backend)
Der CSP-Header `upgrade-insecure-requests` wurde entfernt, damit die Anwendung korrekt über einfaches HTTP ohne HTTPS-Zertifikat funktioniert.
