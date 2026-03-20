package responses

import (
	. "github.com/mad-agentic/ProxyAPI.MAD/v6/internal/constant"
	"github.com/mad-agentic/ProxyAPI.MAD/v6/internal/interfaces"
	"github.com/mad-agentic/ProxyAPI.MAD/v6/internal/translator/translator"
)

func init() {
	translator.Register(
		OpenaiResponse,
		Antigravity,
		ConvertOpenAIResponsesRequestToAntigravity,
		interfaces.TranslateResponse{
			Stream:    ConvertAntigravityResponseToOpenAIResponses,
			NonStream: ConvertAntigravityResponseToOpenAIResponsesNonStream,
		},
	)
}
