package claude

import (
	. "github.com/mad-agentic/ProxyAPI.MAD/v6/internal/constant"
	"github.com/mad-agentic/ProxyAPI.MAD/v6/internal/interfaces"
	"github.com/mad-agentic/ProxyAPI.MAD/v6/internal/translator/translator"
)

func init() {
	translator.Register(
		Claude,
		GeminiCLI,
		ConvertClaudeRequestToCLI,
		interfaces.TranslateResponse{
			Stream:     ConvertGeminiCLIResponseToClaude,
			NonStream:  ConvertGeminiCLIResponseToClaudeNonStream,
			TokenCount: ClaudeTokenCount,
		},
	)
}
