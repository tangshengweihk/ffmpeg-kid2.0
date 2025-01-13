package backend

import (
	"fmt"
	"time"
)

// HLSSegmenter 处理HLS流的分段
type HLSSegmenter struct {
	segmentDuration time.Duration
	segments        []Segment
	currentIndex    int
}

// Segment 表示一个HLS分段
type Segment struct {
	Index     int
	StartTime time.Duration
	Duration  time.Duration
	Data      []byte
}

// NewHLSSegmenter 创建新的分段器
func NewHLSSegmenter() *HLSSegmenter {
	return &HLSSegmenter{
		segmentDuration: 2 * time.Second, // LLHLS通常使用2秒分段
		segments:        make([]Segment, 0),
		currentIndex:    0,
	}
}

// CreateSegment 创建新的分段
func (h *HLSSegmenter) CreateSegment(data []byte, startTime time.Duration) *Segment {
	segment := Segment{
		Index:     h.currentIndex,
		StartTime: startTime,
		Duration:  h.segmentDuration,
		Data:      data,
	}

	h.segments = append(h.segments, segment)
	h.currentIndex++

	// 只保留最近的6个分段
	if len(h.segments) > 6 {
		h.segments = h.segments[1:]
	}

	return &segment
}

// GetSegment 获取指定索引的分段
func (h *HLSSegmenter) GetSegment(index int) *Segment {
	for _, seg := range h.segments {
		if seg.Index == index {
			return &seg
		}
	}
	return nil
}

// GetPlaylist 生成M3U8播放列表
func (h *HLSSegmenter) GetPlaylist() string {
	playlist := "#EXTM3U\n"
	playlist += "#EXT-X-VERSION:3\n"
	playlist += "#EXT-X-TARGETDURATION:2\n"
	playlist += fmt.Sprintf("#EXT-X-MEDIA-SEQUENCE:%d\n", h.currentIndex-len(h.segments))

	for _, seg := range h.segments {
		playlist += fmt.Sprintf("#EXTINF:%.3f,\n", seg.Duration.Seconds())
		playlist += fmt.Sprintf("segment_%d.ts\n", seg.Index)
	}

	return playlist
}
