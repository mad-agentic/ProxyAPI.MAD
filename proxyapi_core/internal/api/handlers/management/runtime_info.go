package management

import (
	"net/http"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	ampmodule "github.com/mad-agentic/ProxyAPI.MAD/v6/internal/api/modules/amp"
	"github.com/mad-agentic/ProxyAPI.MAD/v6/internal/cache"
	"github.com/mad-agentic/ProxyAPI.MAD/v6/internal/logging"
	"github.com/mad-agentic/ProxyAPI.MAD/v6/internal/usage"
	"github.com/mad-agentic/ProxyAPI.MAD/v6/internal/util"
)

func absoluteOrEmpty(path string) string {
	trimmed := strings.TrimSpace(path)
	if trimmed == "" {
		return ""
	}
	if filepath.IsAbs(trimmed) {
		return filepath.Clean(trimmed)
	}
	if abs, err := filepath.Abs(trimmed); err == nil {
		return abs
	}
	return filepath.Clean(trimmed)
}

// GetRuntimeInfo returns resolved filesystem paths and cache/persistence details.
func (h *Handler) GetRuntimeInfo(c *gin.Context) {
	var authDir string
	if h != nil && h.cfg != nil {
		resolvedAuthDir, err := util.ResolveAuthDir(h.cfg.AuthDir)
		if err == nil {
			authDir = resolvedAuthDir
		}
	}

	logDir := absoluteOrEmpty(logging.ResolveLogDirectory(h.cfg))
	usageFile := absoluteOrEmpty(usage.ResolvePersistencePath(h.cfg))
	ampSecretsFile := absoluteOrEmpty(ampmodule.DefaultSecretsFilePath())
	writablePath := absoluteOrEmpty(util.WritablePath())
	configFile := ""
	if h != nil {
		configFile = absoluteOrEmpty(h.configFilePath)
	}

	c.JSON(http.StatusOK, gin.H{
		"paths": gin.H{
			"config_file":      configFile,
			"auth_dir":         absoluteOrEmpty(authDir),
			"log_dir":          logDir,
			"log_file":         absoluteOrEmpty(filepath.Join(logDir, "main.log")),
			"usage_stats_file": usageFile,
			"amp_secrets_file": ampSecretsFile,
			"writable_path":    writablePath,
		},
		"cache": gin.H{
			"signature_cache": gin.H{
				"type":        "memory",
				"path":        nil,
				"ttl_seconds": int(cache.SignatureCacheTTL.Seconds()),
			},
			"amp_secret_cache": gin.H{
				"type":        "memory+file-source",
				"path":        ampSecretsFile,
				"ttl_seconds": int(ampmodule.DefaultSecretCacheTTL.Seconds()),
			},
		},
		"usage_statistics": gin.H{
			"enabled":          h != nil && h.cfg != nil && h.cfg.UsageStatisticsEnabled,
			"persisted":        true,
			"persistence_file": usageFile,
		},
	})
}
