package api

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"ffmpeg-kid/pkg/stream"
)

type Server struct {
	manager *stream.StreamManager
}

func NewServer() (*Server, error) {
	return &Server{}, nil
}

func (s *Server) Start() error {
	// 确保视频目录存在
	if err := ensureVideoDirectory(); err != nil {
		return err
	}

	// 确保HLS目录存在
	if err := os.MkdirAll("hls/play", 0755); err != nil {
		return err
	}
	if err := os.MkdirAll("hls/push", 0755); err != nil {
		return err
	}

	// CORS 中间件
	corsMiddleware := func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

			if r.Method == "OPTIONS" {
				w.WriteHeader(http.StatusOK)
				return
			}

			next(w, r)
		}
	}

	// 获取视频列表
	http.HandleFunc("/api/videos", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		videos, err := GetVideoList()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(videos)
	}))

	// 上传视频
	http.HandleFunc("/api/upload", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		file, header, err := r.FormFile("video")
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		defer file.Close()

		// 创建目标文件
		dst, err := os.Create(filepath.Join(VideoStoragePath, header.Filename))
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		defer dst.Close()

		// 复制文件内容
		if _, err := io.Copy(dst, file); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{
			"message":  "Upload successful",
			"filename": header.Filename,
		})
	})

	// 选择视频开始流媒体
	http.HandleFunc("/api/stream/start", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req struct {
			VideoPath  string `json:"videoPath"`
			StreamType string `json:"streamType"` // "play" 或 "push"
		}

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		// 如果没有流管理器，创建新的
		if s.manager == nil {
			manager, err := stream.NewStreamManager(req.VideoPath)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			s.manager = manager
		}

		// 启动指定的流
		if err := s.manager.StartStream(req.StreamType, req.VideoPath); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{
			"message": "Streaming started",
			"type":    req.StreamType,
			"playUrl": fmt.Sprintf("/hls/%s/playlist.m3u8", req.StreamType),
		})
	}))

	// 停止流媒体
	http.HandleFunc("/api/stream/stop", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req struct {
			StreamType string `json:"streamType"` // "play" 或 "push"
		}

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		if s.manager != nil {
			if err := s.manager.StopStream(req.StreamType); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
		}

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{
			"message": "Streaming stopped",
			"type":    req.StreamType,
		})
	}))

	// 提供HLS流访问
	fs := http.FileServer(http.Dir("./hls"))
	http.HandleFunc("/hls/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		if strings.HasSuffix(r.URL.Path, ".m3u8") {
			w.Header().Set("Content-Type", "application/vnd.apple.mpegurl")
		} else if strings.HasSuffix(r.URL.Path, ".ts") {
			w.Header().Set("Content-Type", "video/MP2T")
		}
		http.StripPrefix("/hls/", fs).ServeHTTP(w, r)
	})

	// 提供视频文件的静态访问
	http.Handle("/videos/", http.StripPrefix("/videos/", http.FileServer(http.Dir(VideoStoragePath))))

	// 启动HTTP服务器
	fmt.Println("Starting HTTP server on :8080")
	return http.ListenAndServe(":8080", nil)
}

func (s *Server) Close() error {
	if s.manager != nil {
		return s.manager.Close()
	}
	return nil
}
