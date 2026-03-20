package responses

import (
	. "github.com/mad-agentic/ProxyAPI.MAD/v6/internal/constant"
	"github.com/mad-agentic/ProxyAPI.MAD/v6/internal/interfaces"
	"github.com/mad-agentic/ProxyAPI.MAD/v6/internal/translator/translator"
)

func init() {
	translator.Register(
		OpenaiResponse,
		GeminiCLI,
		ConvertOpenAIResponsesRequestToGeminiCLI,
		interfaces.TranslateResponse{
			Stream:    ConvertGeminiCLIResponseToOpenAIResponses,
			NonStream: ConvertGeminiCLIResponseToOpenAIResponsesNonStream,
		},
	)
}
