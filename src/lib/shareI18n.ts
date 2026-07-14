import { useEffect, useState } from 'react';

const STORAGE_KEY = 'b1m.website.language';
const LANGUAGE_CHANGE_EVENT = 'b1m:languagechange';

type ShareCopy = {
  nativeShare: string;
  copyLink: string;
  copied: string;
  qrButton: string;
  shareInPerson: string;
  qrTitle: string;
  qrInstruction: string;
  loadingQr: string;
  generatingQr: string;
  retry: string;
  closeQr: string;
  shareLabel: string;
  shareVia: string;
};

const COPY: Record<string, ShareCopy> = {
  en: {
    nativeShare: 'Native share', copyLink: 'Copy link', copied: 'Link copied', qrButton: 'Show Post QR Code',
    shareInPerson: 'Share in person', qrTitle: 'Show Post QR Code', qrInstruction: 'Scan this QR code to open this post.',
    loadingQr: 'Loading QR Code…', generatingQr: 'Generating the QR code…', retry: 'Try again', closeQr: 'Close QR code',
    shareLabel: 'Share this content', shareVia: 'Share via',
  },
  nl: {
    nativeShare: 'Native delen', copyLink: 'Kopieer link', copied: 'Link gekopieerd', qrButton: 'Toon QR-code van post',
    shareInPerson: 'Deel persoonlijk', qrTitle: 'Toon QR-code van post', qrInstruction: 'Scan deze QR-code om deze post te openen.',
    loadingQr: 'QR-code laden…', generatingQr: 'QR-code genereren…', retry: 'Probeer opnieuw', closeQr: 'QR-code sluiten',
    shareLabel: 'Deel deze inhoud', shareVia: 'Deel via',
  },
  fr: {
    nativeShare: 'Partage natif', copyLink: 'Copier le lien', copied: 'Lien copié', qrButton: 'Afficher le QR code',
    shareInPerson: 'Partager en personne', qrTitle: 'Afficher le QR code du post', qrInstruction: 'Scannez ce QR code pour ouvrir ce post.',
    loadingQr: 'Chargement du QR code…', generatingQr: 'Génération du QR code…', retry: 'Réessayer', closeQr: 'Fermer le QR code',
    shareLabel: 'Partager ce contenu', shareVia: 'Partager via',
  },
  es: {
    nativeShare: 'Compartir', copyLink: 'Copiar enlace', copied: 'Enlace copiado', qrButton: 'Mostrar código QR',
    shareInPerson: 'Compartir en persona', qrTitle: 'Mostrar código QR de la publicación', qrInstruction: 'Escanea este código QR para abrir esta publicación.',
    loadingQr: 'Cargando código QR…', generatingQr: 'Generando el código QR…', retry: 'Intentar de nuevo', closeQr: 'Cerrar código QR',
    shareLabel: 'Compartir este contenido', shareVia: 'Compartir por',
  },
  de: {
    nativeShare: 'Teilen', copyLink: 'Link kopieren', copied: 'Link kopiert', qrButton: 'QR-Code anzeigen',
    shareInPerson: 'Persönlich teilen', qrTitle: 'QR-Code des Beitrags anzeigen', qrInstruction: 'Scannen Sie diesen QR-Code, um den Beitrag zu öffnen.',
    loadingQr: 'QR-Code wird geladen…', generatingQr: 'QR-Code wird erstellt…', retry: 'Erneut versuchen', closeQr: 'QR-Code schließen',
    shareLabel: 'Diesen Inhalt teilen', shareVia: 'Teilen über',
  },
  it: {
    nativeShare: 'Condividi', copyLink: 'Copia link', copied: 'Link copiato', qrButton: 'Mostra codice QR',
    shareInPerson: 'Condividi di persona', qrTitle: 'Mostra il codice QR del post', qrInstruction: 'Scansiona questo codice QR per aprire il post.',
    loadingQr: 'Caricamento codice QR…', generatingQr: 'Generazione codice QR…', retry: 'Riprova', closeQr: 'Chiudi codice QR',
    shareLabel: 'Condividi questo contenuto', shareVia: 'Condividi tramite',
  },
  pt: {
    nativeShare: 'Partilhar', copyLink: 'Copiar ligação', copied: 'Ligação copiada', qrButton: 'Mostrar código QR',
    shareInPerson: 'Partilhar pessoalmente', qrTitle: 'Mostrar código QR da publicação', qrInstruction: 'Digitalize este código QR para abrir esta publicação.',
    loadingQr: 'A carregar código QR…', generatingQr: 'A gerar código QR…', retry: 'Tentar novamente', closeQr: 'Fechar código QR',
    shareLabel: 'Partilhar este conteúdo', shareVia: 'Partilhar via',
  },
};

function currentLanguage() {
  const queryLanguage = new URLSearchParams(window.location.search).get('lang');
  const storedLanguage = window.localStorage.getItem(STORAGE_KEY);
  return (queryLanguage || storedLanguage || document.documentElement.lang || 'en').toLowerCase().split('-')[0];
}

export function useShareCopy() {
  const [language, setLanguage] = useState(currentLanguage);

  useEffect(() => {
    const update = (event?: Event) => {
      const eventLanguage = (event as CustomEvent<{ language?: string }> | undefined)?.detail?.language;
      setLanguage((eventLanguage || currentLanguage()).toLowerCase().split('-')[0]);
    };
    window.addEventListener(LANGUAGE_CHANGE_EVENT, update);
    window.addEventListener('popstate', update);
    return () => {
      window.removeEventListener(LANGUAGE_CHANGE_EVENT, update);
      window.removeEventListener('popstate', update);
    };
  }, []);

  return COPY[language] || COPY.en;
}
