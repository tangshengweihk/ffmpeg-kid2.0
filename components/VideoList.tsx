import React, { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { motion } from "framer-motion"

interface VideoInfo {
  name: string
  path: string
  size: number
}

export default function VideoList() {
  const [videos, setVideos] = useState<VideoInfo[]>([])
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)

  // 加载视频列表
  useEffect(() => {
    fetchVideos()
  }, [])

  const fetchVideos = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/videos')
      const data = await response.json()
      setVideos(data)
    } catch (error) {
      console.error('Failed to fetch videos:', error)
    }
  }

  // 上传视频
  const handleUpload = async () => {
    if (!uploadFile) return

    const formData = new FormData()
    formData.append('video', uploadFile)

    try {
      const response = await fetch('http://localhost:8080/api/upload', {
        method: 'POST',
        body: formData,
      })
      
      if (response.ok) {
        fetchVideos() // 刷新列表
        setUploadFile(null)
      }
    } catch (error) {
      console.error('Upload failed:', error)
    }
  }

  // 开始流媒体
  const startStreaming = async (videoPath: string) => {
    try {
      const response = await fetch('http://localhost:8080/api/stream/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ videoPath }),
      })

      if (response.ok) {
        setSelectedVideo(videoPath)
        setIsStreaming(true)
      }
    } catch (error) {
      console.error('Failed to start streaming:', error)
    }
  }

  // 停止流媒体
  const stopStreaming = async () => {
    try {
      await fetch('http://localhost:8080/api/stream/stop', {
        method: 'POST',
      })
      setSelectedVideo(null)
      setIsStreaming(false)
    } catch (error) {
      console.error('Failed to stop streaming:', error)
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>视频列表</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* 上传区域 */}
          <div className="flex gap-4">
            <Input
              type="file"
              accept="video/*"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              className="flex-1"
            />
            <Button onClick={handleUpload} disabled={!uploadFile}>
              上传视频
            </Button>
          </div>

          {/* 视频列表 */}
          <div className="grid gap-4">
            {videos.map((video) => (
              <motion.div
                key={video.path}
                className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{video.name}</h3>
                    <p className="text-sm text-gray-500">
                      大小: {Math.round(video.size / 1024 / 1024)}MB
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      if (selectedVideo === video.path && isStreaming) {
                        stopStreaming()
                      } else {
                        startStreaming(video.path)
                      }
                    }}
                    variant={selectedVideo === video.path && isStreaming ? "destructive" : "default"}
                  >
                    {selectedVideo === video.path && isStreaming ? '停止' : '开始'}
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 