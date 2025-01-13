package backend

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
)

type Server struct {
	manager *StreamManager
}

func NewServer() (*Server, error) {
	return &Server{}, nil
}

func (s *Server) Start() error {
	// 确保视频目录存在
	if err := ensureVideoDirectory(); err != nil {
		return err
	}

	// 获取视频列表
	http.HandleFunc("/api/videos", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Access-Control-Allow-Origin", "*")

		videos, err := GetVideoList()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		json.NewEncoder(w).Encode(videos)
	})

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
	http.HandleFunc("/api/stream/start", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req struct {
			VideoPath string `json:"videoPath"`
		}

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		// 创建新的流管理器
		manager, err := NewStreamManager(req.VideoPath)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		s.manager = manager

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{
			"message": "Streaming started",
			"playUrl": "/play/playlist.m3u8",
			"pushUrl": "/push/playlist.m3u8",
		})
	})

	// 停止流媒体
	http.HandleFunc("/api/stream/stop", func(w http.ResponseWriter, r *http.Request) {
		if s.manager != nil {
			s.manager.Close()
			s.manager = nil
		}

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{
			"message": "Streaming stopped",
		})
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
