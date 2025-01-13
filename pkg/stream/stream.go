package stream

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
)

// VideoBuffer 表示内存映射的视频数据
type VideoBuffer struct {
	data []byte
	size int64
	mu   sync.RWMutex
}

// StreamManager 管理LLHLS流
type StreamManager struct {
	buffer     *VideoBuffer
	playStream *HLSStream
	pushStream *HLSStream
	stopChan   chan struct{}
	wg         sync.WaitGroup
}

// HLSStream 表示一个LLHLS流
type HLSStream struct {
	buffer    *VideoBuffer
	segmenter *HLSSegmenter
	state     StreamState
	isActive  bool
	mu        sync.Mutex
	cmd       *exec.Cmd // FFmpeg 命令
}

type StreamState struct {
	currentSegment int
	segmentSize    int
	timestamp      int64
}

// NewStreamManager 创建新的流管理器
func NewStreamManager(filepath string) (*StreamManager, error) {
	// 创建视频缓冲区
	buffer := &VideoBuffer{
		size: 0,
	}

	// 创建两个LLHLS流
	playStream := &HLSStream{
		buffer:    buffer,
		segmenter: NewHLSSegmenter(),
		state:     StreamState{},
		isActive:  false,
	}

	pushStream := &HLSStream{
		buffer:    buffer,
		segmenter: NewHLSSegmenter(),
		state:     StreamState{},
		isActive:  false,
	}

	sm := &StreamManager{
		buffer:     buffer,
		playStream: playStream,
		pushStream: pushStream,
		stopChan:   make(chan struct{}),
	}

	return sm, nil
}

// StartStream 启动指定的流
func (sm *StreamManager) StartStream(name string, videoPath string) error {
	fmt.Printf("Starting stream with name: %s, path: %s\n", name, videoPath)

	// 将相对路径转换为绝对路径
	absPath, err := filepath.Abs(videoPath)
	if err != nil {
		fmt.Printf("Error getting absolute path: %v\n", err)
		return fmt.Errorf("failed to get absolute path: %v", err)
	}
	fmt.Printf("Absolute path: %s\n", absPath)

	// 检查文件是否存在
	fileInfo, err := os.Stat(absPath)
	if os.IsNotExist(err) {
		fmt.Printf("File not found: %s\n", absPath)
		return fmt.Errorf("video file not found: %s", absPath)
	}
	if err != nil {
		fmt.Printf("Error checking file: %v\n", err)
		return fmt.Errorf("error checking file: %v", err)
	}

	// 打印实际文件信息用于调试
	fmt.Printf("File exists: %s\nSize: %d bytes\nModTime: %v\n",
		absPath, fileInfo.Size(), fileInfo.ModTime())

	// 获取当前工作目录
	workDir, err := os.Getwd()
	if err != nil {
		fmt.Printf("Error getting working directory: %v\n", err)
		return fmt.Errorf("failed to get working directory: %v", err)
	}
	fmt.Printf("Working directory: %s\n", workDir)

	var stream *HLSStream
	var outputPath string
	var ffmpegArgs []string

	if name == "play" {
		stream = sm.playStream
		outputPath = filepath.Join(workDir, "hls", "play")
	} else if name == "push" {
		stream = sm.pushStream
		outputPath = filepath.Join(workDir, "hls", "push")
	} else {
		fmt.Printf("Unknown stream type: %s\n", name)
		return fmt.Errorf("unknown stream type: %s", name)
	}
	fmt.Printf("Output path: %s\n", outputPath)

	// 确保输出目录存在
	if err := os.MkdirAll(outputPath, 0755); err != nil {
		fmt.Printf("Error creating output directory: %v\n", err)
		return fmt.Errorf("failed to create output directory: %v", err)
	}

	// 清理旧的分段文件
	if err := cleanDirectory(outputPath); err != nil {
		fmt.Printf("Error cleaning output directory: %v\n", err)
		return fmt.Errorf("failed to clean output directory: %v", err)
	}

	if name == "play" {
		ffmpegArgs = []string{
			"-re",         // 实时模式
			"-i", absPath, // 使用绝对路径
			"-c:v", "libx264", // 视频编码器
			"-preset", "ultrafast", // 最快的编码速度
			"-tune", "zerolatency", // 零延迟调优
			"-c:a", "aac", // 音频编码器
			"-b:v", "2000k", // 视频码率
			"-b:a", "128k", // 音频码率
			"-f", "hls", // HLS格式
			"-hls_time", "2", // 分段时长
			"-hls_list_size", "6", // 播放列表长度
			"-hls_flags", "delete_segments+omit_endlist", // 低延迟选项
			"-hls_segment_type", "mpegts", // 分段格式
			"-hls_segment_filename", filepath.Join(outputPath, "segment_%d.ts"),
			filepath.Join(outputPath, "playlist.m3u8"),
		}
	} else if name == "push" {
		ffmpegArgs = []string{
			"-re",         // 实时模式
			"-i", absPath, // 使用绝对路径
			"-c:v", "libx264", // 视频编码器
			"-preset", "ultrafast", // 最快的编码速度
			"-tune", "zerolatency", // 零延迟调优
			"-c:a", "aac", // 音频编码器
			"-b:v", "2000k", // 视频码率
			"-b:a", "128k", // 音频码率
			"-f", "hls", // HLS格式
			"-hls_time", "2", // 分段时长
			"-hls_list_size", "6", // 播放列表长度
			"-hls_flags", "delete_segments+omit_endlist", // 低延迟选项
			"-hls_segment_type", "mpegts", // 分段格式
			"-hls_segment_filename", filepath.Join(outputPath, "segment_%d.ts"),
			filepath.Join(outputPath, "playlist.m3u8"),
		}
	}

	stream.mu.Lock()
	defer stream.mu.Unlock()

	if stream.isActive {
		return fmt.Errorf("stream %s is already active", name)
	}

	// 启动FFmpeg进程
	fmt.Printf("Starting FFmpeg with command: ffmpeg %s\n", strings.Join(ffmpegArgs, " "))
	stream.cmd = exec.Command("ffmpeg", ffmpegArgs...)

	// 设置工作目录
	stream.cmd.Dir = workDir

	// 重定向输出以便于调试
	stream.cmd.Stdout = os.Stdout
	stream.cmd.Stderr = os.Stderr

	if err := stream.cmd.Start(); err != nil {
		return fmt.Errorf("failed to start ffmpeg: %v", err)
	}

	// 启动一个goroutine来监控进程
	go func() {
		if err := stream.cmd.Wait(); err != nil {
			if stream.isActive {
				fmt.Printf("FFmpeg process exited with error: %v\n", err)
			}
		}
	}()

	stream.isActive = true
	return nil
}

// 清理目录中的旧文件
func cleanDirectory(dir string) error {
	d, err := os.Open(dir)
	if err != nil {
		return err
	}
	defer d.Close()

	names, err := d.Readdirnames(-1)
	if err != nil {
		return err
	}

	for _, name := range names {
		err = os.RemoveAll(filepath.Join(dir, name))
		if err != nil {
			return err
		}
	}

	return nil
}

// StopStream 停止指定的流
func (sm *StreamManager) StopStream(name string) error {
	var stream *HLSStream

	if name == "play" {
		stream = sm.playStream
	} else if name == "push" {
		stream = sm.pushStream
	} else {
		return fmt.Errorf("unknown stream type: %s", name)
	}

	stream.mu.Lock()
	defer stream.mu.Unlock()

	if !stream.isActive {
		return nil
	}

	// 停止FFmpeg进程
	if stream.cmd != nil && stream.cmd.Process != nil {
		if err := stream.cmd.Process.Kill(); err != nil {
			return fmt.Errorf("failed to kill ffmpeg: %v", err)
		}
		stream.cmd.Wait()
		stream.cmd = nil
	}

	stream.isActive = false
	return nil
}

// 清理资源
func (sm *StreamManager) Close() error {
	// 停止所有流
	if err := sm.StopStream("play"); err != nil {
		return err
	}
	if err := sm.StopStream("push"); err != nil {
		return err
	}

	close(sm.stopChan)
	sm.wg.Wait()
	return nil
}

// ReadSegment 从内存中读取指定位置的数据（零拷贝）
func (vb *VideoBuffer) ReadSegment(offset int64, size int) []byte {
	vb.mu.RLock()
	defer vb.mu.RUnlock()

	// 返回内存切片，不进行复制
	return vb.data[offset : offset+int64(size)]
}
