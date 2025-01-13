package main

import (
	"os"
	"path/filepath"
)

const (
	VideoStoragePath = "./videos" // 视频文件存储目录
)

// 确保视频存储目录存在
func ensureVideoDirectory() error {
	return os.MkdirAll(VideoStoragePath, 0755)
}

// 获取所有视频文件信息
type VideoInfo struct {
	Name string `json:"name"`
	Path string `json:"path"`
	Size int64  `json:"size"`
}

func GetVideoList() ([]VideoInfo, error) {
	files, err := os.ReadDir(VideoStoragePath)
	if err != nil {
		return nil, err
	}

	var videos []VideoInfo
	for _, file := range files {
		if file.IsDir() {
			continue
		}

		// 只列出视频文件
		ext := filepath.Ext(file.Name())
		if ext != ".mp4" && ext != ".mkv" && ext != ".avi" && ext != ".mov" {
			continue
		}

		info, err := file.Info()
		if err != nil {
			continue
		}

		videos = append(videos, VideoInfo{
			Name: file.Name(),
			Path: filepath.Join(VideoStoragePath, file.Name()),
			Size: info.Size(),
		})
	}

	return videos, nil
}
