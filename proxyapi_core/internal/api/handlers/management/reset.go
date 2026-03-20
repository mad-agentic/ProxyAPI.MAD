package management

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/mad-agentic/ProxyAPI.MAD/v6/internal/cache"
	"github.com/mad-agentic/ProxyAPI.MAD/v6/internal/config"
	"github.com/mad-agentic/ProxyAPI.MAD/v6/internal/usage"
)

// ResetDefault clears stored credentials, logs, usage snapshots, and runtime caches,
// then resets credential-related config fields to defaults.
func (h *Handler) ResetDefault(c *gin.Context) {
	if h == nil || h.cfg == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "configuration unavailable"})
		return
	}
	if strings.TrimSpace(h.configFilePath) == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "config file path unavailable"})
		return
	}

	ctx := c.Request.Context()
	removedAuthFiles := 0
	removedLogFiles := 0

	if authDir := strings.TrimSpace(h.cfg.AuthDir); authDir != "" {
		entries, err := os.ReadDir(authDir)
		if err != nil && !os.IsNotExist(err) {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to read auth dir: %v", err)})
			return
		}
		for _, entry := range entries {
			if entry.IsDir() {
				continue
			}
			name := entry.Name()
			if !strings.HasSuffix(strings.ToLower(name), ".json") {
				continue
			}
			fullPath := filepath.Join(authDir, name)
			if !filepath.IsAbs(fullPath) {
				if abs, errAbs := filepath.Abs(fullPath); errAbs == nil {
					fullPath = abs
				}
			}
			if err := os.Remove(fullPath); err != nil {
				if os.IsNotExist(err) {
					continue
				}
				c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to remove auth file %s: %v", name, err)})
				return
			}
			if err := h.deleteTokenRecord(ctx, fullPath); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			h.disableAuth(ctx, fullPath)
			removedAuthFiles++
		}
	}

	if h.usageStats != nil {
		h.usageStats.Reset()
	}
	if usageFile := strings.TrimSpace(usage.ResolvePersistencePath(h.cfg)); usageFile != "" {
		if err := os.Remove(usageFile); err != nil && !os.IsNotExist(err) {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to remove usage snapshot: %v", err)})
			return
		}
	}

	if logDir := strings.TrimSpace(h.logDirectory()); logDir != "" {
		entries, err := os.ReadDir(logDir)
		if err != nil && !os.IsNotExist(err) {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to read log dir: %v", err)})
			return
		}
		for _, entry := range entries {
			if entry.IsDir() {
				continue
			}
			fullPath := filepath.Join(logDir, entry.Name())
			if err := os.Remove(fullPath); err != nil {
				if os.IsNotExist(err) {
					continue
				}
				if errTruncate := os.Truncate(fullPath, 0); errTruncate != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to clear log file %s: %v", entry.Name(), err)})
					return
				}
			}
			removedLogFiles++
		}
	}

	cache.ClearSignatureCache("")

	h.cfg.ProxyURL = ""
	h.cfg.APIKeys = nil
	h.cfg.GeminiKey = nil
	h.cfg.ClaudeKey = nil
	h.cfg.CodexKey = nil
	h.cfg.OpenAICompatibility = nil
	h.cfg.VertexCompatAPIKey = nil
	h.cfg.OAuthExcludedModels = nil
	h.cfg.OAuthModelAlias = nil
	h.cfg.Payload = config.PayloadConfig{}
	h.cfg.AmpCode.UpstreamURL = ""
	h.cfg.AmpCode.UpstreamAPIKey = ""
	h.cfg.AmpCode.UpstreamAPIKeys = nil
	h.cfg.AmpCode.ModelMappings = nil
	h.cfg.AmpCode.ForceModelMappings = false

	h.mu.Lock()
	errSave := config.SaveConfigPreserveComments(h.configFilePath, h.cfg)
	h.mu.Unlock()
	if errSave != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to save config: %v", errSave)})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":             "ok",
		"message":            "reset completed",
		"removed_auth_files": removedAuthFiles,
		"removed_log_files":  removedLogFiles,
	})
}
