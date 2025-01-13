package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"
)

func main() {
	server, err := NewServer()
	if err != nil {
		log.Fatalf("Failed to create server: %v", err)
	}
	defer server.Close()

	// 处理优雅退出
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		if err := server.Start(); err != nil {
			log.Printf("Server error: %v", err)
			sigChan <- syscall.SIGTERM
		}
	}()

	log.Printf("Server started. Videos directory: %s", VideoStoragePath)
	log.Printf("Upload videos to: http://localhost:8080/api/upload")
	log.Printf("View video list at: http://localhost:8080/api/videos")

	// 等待信号
	<-sigChan
	log.Println("Shutting down server...")
}
