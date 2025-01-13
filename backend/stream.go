package backend

import (
	"os"
	"sync"

	"golang.org/x/sys/unix"
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
}

// HLSStream 表示一个LLHLS流
type HLSStream struct {
	buffer    *VideoBuffer
	segmenter *HLSSegmenter
	state     StreamState
}

type StreamState struct {
	currentSegment int
	segmentSize    int
	timestamp      int64
}

// NewStreamManager 创建新的流管理器
func NewStreamManager(filepath string) (*StreamManager, error) {
	// 打开文件
	file, err := os.OpenFile(filepath, os.O_RDONLY, 0)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	// 获取文件信息
	fileInfo, err := file.Stat()
	if err != nil {
		return nil, err
	}

	// 使用mmap将文件映射到内存
	data, err := unix.Mmap(
		int(file.Fd()),
		0,
		int(fileInfo.Size()),
		unix.PROT_READ,
		unix.MAP_SHARED,
	)
	if err != nil {
		return nil, err
	}

	// 创建视频缓冲区
	buffer := &VideoBuffer{
		data: data,
		size: fileInfo.Size(),
	}

	// 创建两个LLHLS流
	playStream := &HLSStream{
		buffer:    buffer,
		segmenter: NewHLSSegmenter(),
		state:     StreamState{},
	}

	pushStream := &HLSStream{
		buffer:    buffer,
		segmenter: NewHLSSegmenter(),
		state:     StreamState{},
	}

	return &StreamManager{
		buffer:     buffer,
		playStream: playStream,
		pushStream: pushStream,
	}, nil
}

// 清理资源
func (sm *StreamManager) Close() error {
	return unix.Munmap(sm.buffer.data)
}

// ReadSegment 从内存中读取指定位置的数据（零拷贝）
func (vb *VideoBuffer) ReadSegment(offset int64, size int) []byte {
	vb.mu.RLock()
	defer vb.mu.RUnlock()

	// 返回内存切片，不进行复制
	return vb.data[offset : offset+int64(size)]
}
