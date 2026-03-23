import { useMemo, useState } from "react"
import { marked } from "marked"
import { Globe } from "lucide-react"
import { cn } from "../lib/utils"

// Vite raw imports — Docs/*.md are the source of truth
import docsEn from "@docs/index.md?raw"
import docsVN from "@docs/index_VN.md?raw"

type Lang = "en" | "vi"

// Configure marked options
marked.setOptions({ gfm: true, breaks: false })

export function Docs() {
  const [lang, setLang] = useState<Lang>("en")

  const html = useMemo(() => {
    const raw = lang === "vi" ? docsVN : docsEn
    return marked.parse(raw) as string
  }, [lang])

  return (
    <div className="max-w-4xl mx-auto">
      {/* Language Toggle */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <Globe className="w-4 h-4 text-emerald-400" />
          <span>Language / Ngôn ngữ</span>
        </div>
        <div className="flex items-center gap-1 rounded-xl bg-gray-800/60 border border-gray-700/40 p-1">
          <button
            onClick={() => setLang("vi")}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer",
              lang === "vi"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm"
                : "text-gray-400 hover:text-gray-200"
            )}
          >
            Tiếng Việt
          </button>
          <button
            onClick={() => setLang("en")}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer",
              lang === "en"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm"
                : "text-gray-400 hover:text-gray-200"
            )}
          >
            English
          </button>
        </div>
      </div>

      {/* Markdown Content */}
      <div className="rounded-2xl border border-gray-800/60 bg-gray-900/30 backdrop-blur-sm p-8 lg:p-12">
        <div
          className={cn(
            "prose prose-invert prose-sm lg:prose-base max-w-none",
            // Headings
            "prose-headings:text-gray-100 prose-headings:font-semibold",
            "prose-h1:text-2xl prose-h1:border-b prose-h1:border-gray-700/60 prose-h1:pb-4 prose-h1:mb-6",
            "prose-h2:text-xl prose-h2:text-emerald-300 prose-h2:mt-10 prose-h2:mb-4",
            "prose-h3:text-base prose-h3:text-gray-200 prose-h3:mt-6",
            // Body text
            "prose-p:text-gray-300 prose-p:leading-relaxed",
            "prose-li:text-gray-300",
            // Links
            "prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:underline",
            // Code
            "prose-code:text-emerald-300 prose-code:bg-emerald-900/20 prose-code:border prose-code:border-emerald-800/40 prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-code:text-[0.82em] prose-code:font-mono prose-code:before:content-none prose-code:after:content-none",
            "prose-pre:bg-gray-950/60 prose-pre:border prose-pre:border-gray-700/50 prose-pre:rounded-xl prose-pre:text-gray-300",
            "prose-pre:code:bg-transparent prose-pre:code:border-none prose-pre:code:p-0",
            // Tables
            "prose-table:border-collapse",
            "prose-th:text-gray-200 prose-th:bg-gray-800/60 prose-th:border prose-th:border-gray-700/50 prose-th:px-4 prose-th:py-2",
            "prose-td:text-gray-300 prose-td:border prose-td:border-gray-700/40 prose-td:px-4 prose-td:py-2",
            // Blockquotes & hr
            "prose-blockquote:border-l-emerald-500 prose-blockquote:text-gray-400 prose-blockquote:bg-emerald-900/10 prose-blockquote:rounded-r-lg",
            "prose-hr:border-gray-700/60",
            // Lists
            "prose-ul:space-y-1 prose-ol:space-y-1",
            // Strong/em
            "prose-strong:text-gray-100 prose-em:text-gray-300"
          )}
          // Content is from developer-controlled static markdown files in Docs/
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>

      {/* Footer */}
      <p className="mt-6 text-center text-xs text-gray-600">
        Source: <code className="text-gray-500">Docs/index{lang === "vi" ? "_VN" : ""}.md</code>
      </p>
    </div>
  )
}
