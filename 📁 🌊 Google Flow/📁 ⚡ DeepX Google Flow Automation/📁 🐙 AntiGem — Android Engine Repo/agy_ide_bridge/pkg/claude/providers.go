package claude

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"
)

// Custom providers: Anthropic-compatible APIs (OpenRouter, Kimi, …) a chat can run on instead of the user's Claude
// login. A chat's model is then "@<provider id>/<model id>"; the bridge starts that chat's process with the provider's
// endpoint and key in a --settings file, so ~/.claude/settings.json and the other chats are never touched.

// ProviderModel is one model of a provider.
type ProviderModel struct {
	ID   string `json:"id"`
	Name string `json:"name,omitempty"`
}

// Provider is an Anthropic-compatible endpoint.
type Provider struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	BaseURL string `json:"base_url"`
	APIKey  string `json:"api_key,omitempty"`
	// ModelsURL lists the provider's models (OpenRouter's is known, others are set by the user).
	ModelsURL string `json:"models_url,omitempty"`
	// SmallModel serves Claude Code's background calls (titles, summaries); empty = the chat's own model.
	SmallModel string          `json:"small_model,omitempty"`
	Models     []ProviderModel `json:"models"`
}

type providersFile struct {
	Providers []Provider `json:"providers"`
	// Sessions maps a chat id to the custom model it runs ("@provider/model"); official chats are not listed.
	Sessions map[string]string `json:"sessions,omitempty"`
}

const openRouterModelsURL = "https://openrouter.ai/api/v1/models"

var providerIDRe = regexp.MustCompile(`^[a-z0-9][a-z0-9-]{0,39}$`)

func (m *Manager) providersPath() string {
	return filepath.Join(m.HomeDir, ".claude", "agy_providers.json")
}

func (m *Manager) loadProvidersLocked() providersFile {
	var f providersFile
	if raw, err := os.ReadFile(m.providersPath()); err == nil {
		_ = json.Unmarshal(raw, &f)
	}
	if f.Sessions == nil {
		f.Sessions = map[string]string{}
	}
	return f
}

func (m *Manager) saveProvidersLocked(f providersFile) error {
	return writeJSONFile(m.providersPath(), f)
}

// ParseModelRef splits "@provider/model" into its parts; ok is false for an official Claude model.
func ParseModelRef(ref string) (providerID, model string, ok bool) {
	if !strings.HasPrefix(ref, "@") {
		return "", "", false
	}
	providerID, model, ok = strings.Cut(ref[1:], "/")
	return providerID, model, ok && providerID != "" && model != ""
}

func isOpenRouter(baseURL string) bool {
	u, err := url.Parse(baseURL)
	return err == nil && (u.Host == "openrouter.ai" || strings.HasSuffix(u.Host, ".openrouter.ai"))
}

func (m *Manager) provider(id string) (Provider, bool) {
	m.provMu.Lock()
	defer m.provMu.Unlock()
	for _, p := range m.loadProvidersLocked().Providers {
		if p.ID == id {
			return p, true
		}
	}
	return Provider{}, false
}

// providerSettingsFile writes the --settings file of provider p (endpoint, key, background model) and returns its path.
func (m *Manager) providerSettingsFile(p Provider, model string) (string, error) {
	small := p.SmallModel
	if small == "" {
		small = model
	}
	env := map[string]string{
		"ANTHROPIC_BASE_URL":   p.BaseURL,
		"ANTHROPIC_AUTH_TOKEN": p.APIKey,
		// an API key from the environment would win over the token
		"ANTHROPIC_API_KEY":             "",
		"ANTHROPIC_DEFAULT_HAIKU_MODEL": small,
		"ANTHROPIC_SMALL_FAST_MODEL":    small,
	}
	path := filepath.Join(m.HomeDir, ".claude", "agy_providers", p.ID+".settings.json")
	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		return "", err
	}
	data, _ := json.Marshal(map[string]interface{}{"env": env})
	if err := os.WriteFile(path, data, 0o600); err != nil {
		return "", err
	}
	return path, nil
}

// SessionModelRef is the custom model chat id last ran ("" = an official model).
func (m *Manager) SessionModelRef(id string) string {
	m.provMu.Lock()
	defer m.provMu.Unlock()
	return m.loadProvidersLocked().Sessions[id]
}

// rememberSessionModel records the model a chat runs, so a reopened chat starts on the same provider.
func (m *Manager) rememberSessionModel(id, model string) {
	m.provMu.Lock()
	defer m.provMu.Unlock()
	f := m.loadProvidersLocked()
	_, _, custom := ParseModelRef(model)
	switch cur := f.Sessions[id]; {
	case custom && cur != model:
		f.Sessions[id] = model
	case !custom && cur != "":
		delete(f.Sessions, id)
	default:
		return
	}
	_ = m.saveProvidersLocked(f)
}

// copySessionModel gives a forked chat the provider of its source.
func (m *Manager) copySessionModel(from, to string) {
	if ref := m.SessionModelRef(from); ref != "" {
		m.rememberSessionModel(to, ref)
	}
}

// providerView is a provider as the app sees it: the key is never sent back.
type providerView struct {
	Provider
	APIKeyHint string `json:"api_key_hint,omitempty"`
	OpenRouter bool   `json:"openrouter"`
}

func viewOf(p Provider) providerView {
	v := providerView{Provider: p, OpenRouter: isOpenRouter(p.BaseURL)}
	if k := p.APIKey; k != "" {
		v.APIKeyHint = "…" + k[max(0, len(k)-4):]
	}
	v.APIKey = ""
	if v.Models == nil {
		v.Models = []ProviderModel{}
	}
	return v
}

// settingsEndpoint is a custom endpoint configured in ~/.claude/settings.json (it would apply to every chat).
func (m *Manager) settingsEndpoint() (map[string]interface{}, map[string]interface{}) {
	settings := map[string]interface{}{}
	raw, err := os.ReadFile(m.settingsPath())
	if err != nil || json.Unmarshal(raw, &settings) != nil {
		return nil, nil
	}
	env, _ := settings["env"].(map[string]interface{})
	if s, _ := env["ANTHROPIC_BASE_URL"].(string); strings.TrimSpace(s) == "" {
		return nil, nil
	}
	return settings, env
}

// handleProviders routes /api/claude/providers[/...].
//
//	GET    /providers                        providers (keys masked) + "settings_endpoint" if settings.json has one
//	POST   /providers                        add {name, base_url, api_key, models_url, small_model, models}
//	PUT    /providers/{id}                   update (an empty api_key keeps the saved one)
//	DELETE /providers/{id}
//	POST   /providers/{id}/fetch-models      {"free_only": bool} the provider's model list
//	POST   /providers/import-settings        move the endpoint of settings.json into a provider
func (m *Manager) handleProviders(w http.ResponseWriter, r *http.Request, rest string) {
	id, action, _ := strings.Cut(rest, "/")
	switch {
	case id == "" && r.Method == http.MethodGet:
		m.provMu.Lock()
		f := m.loadProvidersLocked()
		m.provMu.Unlock()
		views := make([]providerView, 0, len(f.Providers))
		for _, p := range f.Providers {
			views = append(views, viewOf(p))
		}
		resp := map[string]interface{}{"success": true, "providers": views}
		if _, env := m.settingsEndpoint(); env != nil {
			resp["settings_endpoint"] = env["ANTHROPIC_BASE_URL"]
		}
		writeJSON(w, http.StatusOK, resp)
	case id == "" && r.Method == http.MethodPost:
		var p Provider
		if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]interface{}{"success": false, "error": "provider object required"})
			return
		}
		m.saveProvider(w, "", p)
	case id == "import-settings" && r.Method == http.MethodPost:
		m.importSettingsEndpoint(w)
	case action == "" && r.Method == http.MethodPut:
		var p Provider
		if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]interface{}{"success": false, "error": "provider object required"})
			return
		}
		m.saveProvider(w, id, p)
	case action == "" && r.Method == http.MethodDelete:
		m.provMu.Lock()
		f := m.loadProvidersLocked()
		kept := f.Providers[:0]
		for _, p := range f.Providers {
			if p.ID != id {
				kept = append(kept, p)
			}
		}
		f.Providers = kept
		err := m.saveProvidersLocked(f)
		m.provMu.Unlock()
		_ = os.Remove(filepath.Join(m.HomeDir, ".claude", "agy_providers", id+".settings.json"))
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]interface{}{"success": false, "error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{"success": true})
	case action == "fetch-models" && r.Method == http.MethodPost:
		var body struct {
			FreeOnly bool `json:"free_only"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		p, ok := m.provider(id)
		if !ok {
			writeJSON(w, http.StatusNotFound, map[string]interface{}{"success": false, "error": "unknown provider"})
			return
		}
		models, err := fetchProviderModels(r.Context(), p, body.FreeOnly)
		if err != nil {
			writeJSON(w, http.StatusOK, map[string]interface{}{"success": false, "error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{"success": true, "models": models})
	default:
		writeJSON(w, http.StatusMethodNotAllowed, map[string]interface{}{"success": false, "error": "unknown providers endpoint"})
	}
}

// saveProvider adds (id == "") or updates provider p and replies with it.
func (m *Manager) saveProvider(w http.ResponseWriter, id string, p Provider) {
	p.Name = strings.TrimSpace(p.Name)
	p.BaseURL = strings.TrimRight(strings.TrimSpace(p.BaseURL), "/")
	p.ModelsURL = strings.TrimSpace(p.ModelsURL)
	p.SmallModel = strings.TrimSpace(p.SmallModel)
	p.APIKey = strings.TrimSpace(p.APIKey)
	if u, err := url.Parse(p.BaseURL); p.Name == "" || err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{"success": false, "error": "a name and an http(s) base URL are required"})
		return
	}
	models := make([]ProviderModel, 0, len(p.Models))
	seen := map[string]bool{}
	for _, md := range p.Models {
		md.ID = strings.TrimSpace(md.ID)
		if md.ID != "" && !seen[md.ID] {
			seen[md.ID] = true
			models = append(models, md)
		}
	}
	p.Models = models

	m.provMu.Lock()
	defer m.provMu.Unlock()
	f := m.loadProvidersLocked()
	idx := -1
	for i, old := range f.Providers {
		if old.ID == id {
			idx = i
		}
	}
	if id != "" && idx < 0 {
		writeJSON(w, http.StatusNotFound, map[string]interface{}{"success": false, "error": "unknown provider"})
		return
	}
	if idx >= 0 {
		p.ID = id
		if p.APIKey == "" {
			p.APIKey = f.Providers[idx].APIKey
		}
		f.Providers[idx] = p
	} else {
		if p.APIKey == "" {
			writeJSON(w, http.StatusBadRequest, map[string]interface{}{"success": false, "error": "an API key is required"})
			return
		}
		p.ID = uniqueProviderID(f.Providers, p.Name)
		f.Providers = append(f.Providers, p)
	}
	if err := m.saveProvidersLocked(f); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]interface{}{"success": false, "error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"success": true, "provider": viewOf(p)})
}

var nonSlugRe = regexp.MustCompile(`[^a-z0-9]+`)

func uniqueProviderID(existing []Provider, name string) string {
	base := strings.Trim(nonSlugRe.ReplaceAllString(strings.ToLower(name), "-"), "-")
	if len(base) > 30 {
		base = strings.Trim(base[:30], "-")
	}
	if base == "" {
		base = "provider"
	}
	taken := map[string]bool{}
	for _, p := range existing {
		taken[p.ID] = true
	}
	id := base
	for n := 2; taken[id] || !providerIDRe.MatchString(id); n++ {
		id = fmt.Sprintf("%s-%d", base, n)
	}
	return id
}

// importSettingsEndpoint turns the endpoint in settings.json into a provider and removes it from settings.json, so the
// CLI in a terminal (and official chats) use the Claude login again.
func (m *Manager) importSettingsEndpoint(w http.ResponseWriter) {
	settings, env := m.settingsEndpoint()
	if env == nil {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{"success": false, "error": "settings.json has no custom endpoint"})
		return
	}
	str := func(k string) string { s, _ := env[k].(string); return strings.TrimSpace(s) }
	p := Provider{BaseURL: strings.TrimRight(str("ANTHROPIC_BASE_URL"), "/"), APIKey: str("ANTHROPIC_AUTH_TOKEN")}
	if p.APIKey == "" {
		p.APIKey = str("ANTHROPIC_API_KEY")
	}
	if u, err := url.Parse(p.BaseURL); err == nil && u.Host != "" {
		p.Name = u.Host
		if isOpenRouter(p.BaseURL) {
			p.Name = "OpenRouter"
		}
	} else {
		p.Name = "Imported"
	}
	model := str("ANTHROPIC_MODEL")
	if model == "" {
		if s, _ := settings["model"].(string); s != "" && !isClaudeAlias(s) {
			model = s
		}
	}
	if model != "" {
		p.Models = []ProviderModel{{ID: model}}
	}
	if small := str("ANTHROPIC_SMALL_FAST_MODEL"); small != "" && small != model {
		p.SmallModel = small
	}

	m.provMu.Lock()
	f := m.loadProvidersLocked()
	p.ID = uniqueProviderID(f.Providers, p.Name)
	f.Providers = append(f.Providers, p)
	err := m.saveProvidersLocked(f)
	m.provMu.Unlock()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]interface{}{"success": false, "error": err.Error()})
		return
	}
	for _, k := range []string{"ANTHROPIC_BASE_URL", "ANTHROPIC_AUTH_TOKEN", "ANTHROPIC_API_KEY", "ANTHROPIC_MODEL",
		"ANTHROPIC_SMALL_FAST_MODEL", "ANTHROPIC_DEFAULT_HAIKU_MODEL", "ANTHROPIC_DEFAULT_SONNET_MODEL", "ANTHROPIC_DEFAULT_OPUS_MODEL"} {
		delete(env, k)
	}
	if len(env) == 0 {
		delete(settings, "env")
	}
	if s, _ := settings["model"].(string); model != "" && s == model {
		delete(settings, "model")
	}
	if err := writeJSONFile(m.settingsPath(), settings); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]interface{}{"success": false, "error": err.Error()})
		return
	}
	m.invalidateCaches()
	writeJSON(w, http.StatusOK, map[string]interface{}{"success": true, "provider": viewOf(p)})
}

func isClaudeAlias(model string) bool {
	switch model {
	case "default", "opus", "sonnet", "haiku", "opusplan", "best":
		return true
	}
	return strings.HasPrefix(model, "claude-")
}

// fetchProviderModels reads the provider's model list (OpenAI / Anthropic style: {"data":[{"id",...}]}). freeOnly
// (OpenRouter) keeps the free models that can call tools, which Claude Code needs.
func fetchProviderModels(ctx context.Context, p Provider, freeOnly bool) ([]ProviderModel, error) {
	listURL := p.ModelsURL
	if listURL == "" && isOpenRouter(p.BaseURL) {
		listURL = openRouterModelsURL
	}
	if listURL == "" {
		return nil, errors.New("set the provider's models URL first")
	}
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, listURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+p.APIKey)
	if !isOpenRouter(listURL) {
		// Anthropic-style lists want these; OpenRouter answers them with a short Anthropic-only list instead
		req.Header.Set("x-api-key", p.APIKey)
		req.Header.Set("anthropic-version", "2023-06-01")
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, 32<<20))
	if err != nil {
		return nil, err
	}
	if resp.StatusCode/100 != 2 {
		return nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, strings.TrimSpace(string(body[:min(len(body), 200)])))
	}
	type entry struct {
		ID          string `json:"id"`
		Name        string `json:"name"`
		DisplayName string `json:"display_name"`
		Pricing     *struct {
			Prompt     string `json:"prompt"`
			Completion string `json:"completion"`
		} `json:"pricing"`
		SupportedParameters []string `json:"supported_parameters"`
	}
	var list struct {
		Data   []entry `json:"data"`
		Models []entry `json:"models"`
	}
	if err := json.Unmarshal(body, &list); err != nil {
		return nil, fmt.Errorf("not a model list: %w", err)
	}
	entries := append(list.Data, list.Models...)
	out := []ProviderModel{}
	for _, e := range entries {
		if e.ID == "" {
			continue
		}
		if freeOnly {
			free := strings.HasSuffix(e.ID, ":free") || (e.Pricing != nil && e.Pricing.Prompt == "0" && e.Pricing.Completion == "0")
			tools := e.SupportedParameters == nil
			for _, sp := range e.SupportedParameters {
				tools = tools || sp == "tools"
			}
			if !free || !tools {
				continue
			}
		}
		name := e.Name
		if name == "" {
			name = e.DisplayName
		}
		out = append(out, ProviderModel{ID: e.ID, Name: name})
	}
	sort.Slice(out, func(i, j int) bool { return strings.ToLower(out[i].ID) < strings.ToLower(out[j].ID) })
	return out, nil
}
