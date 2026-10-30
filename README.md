# Diritto Proprio IVE — versione italiana finale

Versione it-1.6 · 30 ottobre 2026

La biblioteca comprende 17 testi, 3,406 paragrafi numerati e 3,742 note: Costituzioni, Direttorio di Spiritualità e i quindici Direttori dei Volumi I, II e III.

Le Costituzioni e tutti i Direttori dei tre volumi sono stati aggiornati con le versioni HTML fornite. Il Direttorio di Spiritualità conserva il testo italiano già presente. Sono inclusi i paragrafi con numerazione alfabetica, le appendici e dodici schemi illustrati.

## Avvio locale

Da questa cartella, eseguire:

```sh
python3 -m http.server 8000
```

Aprire http://localhost:8000 nel browser. Aprire direttamente index.html dal Finder non permette di caricare la biblioteca.

## Pubblicazione

Caricare il contenuto di questa cartella nella radice di un repository GitHub. In Settings → Pages selezionare Deploy from a branch e la cartella radice. Conservare il file .nojekyll. Non è necessaria una compilazione. Questa consegna non pubblica automaticamente l’app.

## Installazione e uso offline

Aprire l’app online e attendere «Pronto: disponibile offline». Installarla dal menu del browser. Su iPhone/iPad usare Condividi → Aggiungi alla schermata Home. Biblioteca, ricerca, caratteri e immagini sono salvati per l’uso offline. Impostazioni, segnalibri e posizione di lettura rimangono sul dispositivo e nel browser utilizzato.

La ricerca ignora maiuscole e accenti. Le virgolette cercano una frase esatta, per esempio `"vita fraterna"`. Riferimenti come `Const 254` aprono direttamente il paragrafo. I filtri limitano la ricerca a una categoria o a un testo.

Toccare il numero di un paragrafo per copiarlo con la citazione, condividerlo o salvarlo nei segnalibri. Toccare un richiamo in apice per leggere la nota. Le note hanno lo stesso stile in tutta la biblioteca. Gli schemi si possono ingrandire.

## Verifica finale

Verificati i testi importati, i paragrafi numerati e alfabetici, i collegamenti alle note, gli indici, le destinazioni dei risultati di ricerca, le immagini, l’inventario offline e l’integrità dell’archivio ZIP. Verificata la sintassi dei programmi dell’app e il funzionamento della ricerca con parole, frasi e accenti.

## Aggiornamenti successivi

I testi sono in data/docs/, l’elenco della biblioteca in data/library.json e l’indice di ricerca in data/search.json. Dopo modifiche ai contenuti aggiornare VERSION e ASSETS in sw.js. L’edizione italiana usa impostazioni e cache separate dall’edizione spagnola.



## Miglioramenti della versione 1.6

- Indici ripuliti: titoli spezzati riuniti e frammenti esclusi dalla navigazione. Testi, note e indirizzi dei paragrafi sono conservati.
- Ricerca e «Vai al numero» accettano anche paragrafi come 2a, 5a e 214a. Le destinazioni vengono verificate contro la numerazione effettiva del documento.
- Nella pagina Segnalibri sono disponibili «Esporta backup» e «Importa backup». Il file JSON può essere conservato o trasferito a un altro dispositivo. L’importazione aggiunge i segnalibri validi, mantiene quelli già presenti e ignora duplicati e riferimenti non riconosciuti. I file non validi non modificano i segnalibri.

Verifiche della versione 1.6: riferimenti numerici e alfabetici, destinazioni inesistenti, formato del backup, esportazione/importazione dei dati, deduplicazione, fusione senza perdita dei segnalibri esistenti, 968 voci degli indici, ricerca e integrità dell’archivio. La verifica dal vivo nel browser non è stata eseguita in questa sessione perché l’ambiente non consentiva di avviare il server di anteprima locale.

Le icone istituzionali SVG fornite sono usate in tutte le edizioni: rosso per IVE, blu per SSVM. Le varianti per installazione, browser e intestazione sono incluse.
