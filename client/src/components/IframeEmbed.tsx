import { useState } from "react";
import { RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface IframeEmbedProps {
  src: string;
  title: string;
  externalUrl?: string;
}

export default function IframeEmbed({ src, title, externalUrl }: IframeEmbedProps) {
  const [key, setKey] = useState(0);
  const [loading, setLoading] = useState(true);

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/60" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
            <div className="w-3 h-3 rounded-full bg-green-500/60" />
          </div>
          <span className="text-xs text-muted-foreground font-mono truncate max-w-xs">{src}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => { setLoading(true); setKey((k) => k + 1); }}
            title="Recarregar"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          {externalUrl && (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild title="Abrir em nova aba">
              <a href={externalUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Iframe */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-muted-foreground">Carregando {title}...</span>
            </div>
          </div>
        )}
        <iframe
          key={key}
          src={src}
          title={title}
          className="w-full h-full border-0"
          onLoad={() => setLoading(false)}
          allow="clipboard-write; clipboard-read"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
        />
      </div>
    </div>
  );
}
