import { ExternalLink, Video, Sparkles, ImageIcon, FileVideo, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const GERADOR_URL = "https://diagensetor-dhzgehtk.manus.space";

const features = [
  {
    icon: Video,
    title: "Gerador de Reels",
    desc: "Crie Reels profissionais com IA a partir de briefings aprovados pelo Olimpo.",
  },
  {
    icon: ImageIcon,
    title: "Biblioteca de Assets",
    desc: "Acesse e gerencie imagens, vídeos e elementos visuais da Dia Solutions.",
  },
  {
    icon: Wand2,
    title: "Criativos com IA",
    desc: "Gere variações de criativos 3:4 e 9:16 no estilo clean e tecnológico da marca.",
  },
  {
    icon: FileVideo,
    title: "Histórico de Campanhas",
    desc: "Visualize todos os conteúdos gerados, aprovados e publicados por campanha.",
  },
];

export default function GeradorPage() {
  return (
    <div className="min-h-full flex flex-col items-center justify-center px-6 py-12">
      {/* Header */}
      <div className="flex flex-col items-center gap-4 mb-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Gerador de Conteúdo
          </h1>
          <p className="text-muted-foreground text-sm mt-1 max-w-md">
            Esta ferramenta roda em uma aplicação dedicada com autenticação própria.
            Clique abaixo para acessá-la diretamente.
          </p>
        </div>
      </div>

      {/* CTA principal */}
      <a
        href={GERADOR_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mb-12"
      >
        <Button
          size="lg"
          className="gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-6 text-base rounded-xl shadow-lg shadow-blue-600/25 transition-all hover:shadow-blue-500/40 hover:scale-[1.02]"
        >
          <ExternalLink className="w-5 h-5" />
          Abrir Gerador de Conteúdo
        </Button>
      </a>

      {/* Grid de funcionalidades */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
        {features.map(({ icon: Icon, title, desc }) => (
          <a
            key={title}
            href={GERADOR_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex gap-4 p-4 rounded-xl border border-border bg-card hover:border-blue-500/50 hover:bg-blue-500/5 transition-all cursor-pointer"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 group-hover:bg-blue-500/20 transition-colors">
              <Icon className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
            </div>
          </a>
        ))}
      </div>

      {/* Nota informativa */}
      <div className="mt-10 max-w-md text-center">
        <p className="text-xs text-muted-foreground/60">
          O Gerador de Conteúdo utiliza autenticação independente via Manus OAuth.
          Em breve será integrado diretamente neste portal.
        </p>
      </div>
    </div>
  );
}
