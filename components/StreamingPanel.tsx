'use client'

import { useState, useRef, useLayoutEffect, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Hls from 'hls.js'

const inputSignals = [
  { id: 'local_video', name: '本地视频' },
  { id: 'capture_card', name: '采集卡' },
]

const resolutions = [
  { value: '3840x2160', label: '4K (3840x2160)' },
  { value: '2560x1440', label: '1440p (2560x1440)' },
  { value: '1920x1080', label: '1080p (1920x1080)' },
  { value: '1280x720', label: '720p (1280x720)' },
  { value: '854x480', label: '480p (854x480)' },
  { value: '640x360', label: '360p (640x360)' },
  { value: '426x240', label: '240p (426x240)' },
]

const frameRates = [
  { value: '120', label: '120 fps' },
  { value: '60', label: '60 fps' },
  { value: '59.94', label: '59.94 fps' },
  { value: '50', label: '50 fps' },
  { value: '30', label: '30 fps' },
  { value: '29.97', label: '29.97 fps' },
  { value: '25', label: '25 fps' },
  { value: '24', label: '24 fps' },
  { value: '23.976', label: '23.976 fps' },
  { value: '15', label: '15 fps' },
]

const cpuPresets = [
  { value: 'ultrafast', label: '超快' },
  { value: 'superfast', label: '极快' },
  { value: 'veryfast', label: '很快' },
  { value: 'faster', label: '快' },
  { value: 'fast', label: '快速' },
  { value: 'medium', label: '中等' },
  { value: 'slow', label: '慢' },
  { value: 'slower', label: '较慢' },
  { value: 'veryslow', label: '很慢' },
]

const rateControls = [
  { value: 'cbr', label: 'CBR (恒定比特率)' },
  { value: 'vbr', label: 'VBR (可变比特率)' },
]

const watermarkOptions = [
  { value: 'none', label: '无水印' },
  { value: '/watermarks/logo1.png', label: 'Logo 1' },
  { value: '/watermarks/logo2.png', label: 'Logo 2' },
  { value: '/watermarks/logo3.png', label: 'Logo 3' },
]

interface StreamingPanelProps {
  id: string;
}

export default function StreamingPanel({ id }: StreamingPanelProps) {
  const [selectedInterface, setSelectedInterface] = useState('')
  const [serverUrl, setServerUrl] = useState('')
  const [streamCode, setStreamCode] = useState('')
  const [videoBitrate, setVideoBitrate] = useState(2000)
  const [audioBitrate, setAudioBitrate] = useState(128)
  const [resolution, setResolution] = useState('1920x1080')
  const [frameRate, setFrameRate] = useState('59.94')
  const [cpuPreset, setCpuPreset] = useState('veryfast')
  const [keyframeInterval, setKeyframeInterval] = useState('2')
  const [rateControl, setRateControl] = useState('cbr')
  const [watermark, setWatermark] = useState('none')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [videoList, setVideoList] = useState<Array<{name: string, path: string}>>([])
  const [selectedVideo, setSelectedVideo] = useState('')
  const [captureDeviceInfo, setCaptureDeviceInfo] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)

  // 初始化 HLS
  const initHls = (url: string) => {
    if (videoRef.current) {
      // 先检查浏览器是否支持 HLS
      console.log('Checking HLS support...')
      console.log('HLS.js supported:', Hls.isSupported())
      console.log('Native HLS support:', videoRef.current.canPlayType('application/vnd.apple.mpegurl'))

      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }

      if (Hls.isSupported()) {
        console.log('Using HLS.js for playback')
        const hls = new Hls({
          debug: true,  // 启用调试模式
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90,
          manifestLoadingMaxRetry: 6,
          manifestLoadingRetryDelay: 1000,
          manifestLoadingMaxRetryTimeout: 30000,
          levelLoadingMaxRetry: 6,
          levelLoadingRetryDelay: 1000,
          fragLoadingMaxRetry: 6,
          fragLoadingRetryDelay: 1000
        })

        hlsRef.current = hls

        // 添加更多事件监听
        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          console.log('HLS Media attached')
        })

        hls.on(Hls.Events.MANIFEST_LOADING, () => {
          console.log('HLS Manifest loading')
        })

        hls.on(Hls.Events.MANIFEST_LOADED, (event, data) => {
          console.log('HLS Manifest loaded:', data)
        })

        hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
          console.log('HLS Manifest parsed, found ' + data.levels.length + ' quality level')
          videoRef.current?.play()
            .then(() => {
              setIsPlaying(true)
              console.log('Playback started')
            })
            .catch(error => {
              console.error('Playback failed:', error)
              setIsPlaying(false)
            })
        })

        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('HLS error:', data)
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.log('Network error, trying to recover...')
                hls.startLoad()
                break
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.log('Media error, trying to recover...')
                hls.recoverMediaError()
                break
              default:
                console.log('Fatal error, destroying HLS instance')
                hls.destroy()
                hlsRef.current = null
                setIsPlaying(false)
                break
            }
          }
        })

        hls.attachMedia(videoRef.current)
        hls.loadSource(url)
        console.log('HLS source loaded:', url)
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        console.log('Using native HLS playback')
        videoRef.current.src = url
        videoRef.current.addEventListener('loadedmetadata', () => {
          videoRef.current?.play()
            .then(() => {
              setIsPlaying(true)
              console.log('Native HLS playback started')
            })
            .catch(error => {
              console.error('Native HLS playback failed:', error)
              setIsPlaying(false)
            })
        })
      } else {
        console.error('HLS playback not supported')
        alert('您的浏览器不支持 HLS 播放')
      }
    }
  }

  // 获取视频列表
  useLayoutEffect(() => {
    if (selectedInterface === 'local_video') {
      fetch('http://localhost:8080/api/videos')
        .then(response => response.json())
        .then(data => {
          setVideoList(data)
        })
        .catch(error => {
          console.error('获取视频列表失败:', error)
        })
    } else if (selectedInterface === 'capture_card') {
      // 获取采集卡设备信息
      fetch('http://localhost:8080/api/capture/devices')
        .then(response => response.json())
        .then(data => {
          setCaptureDeviceInfo(JSON.stringify(data, null, 2))
        })
        .catch(error => {
          console.error('获取采集卡设备信息失败:', error)
          setCaptureDeviceInfo('获取设备信息失败')
        })
    }
  }, [selectedInterface])

  // 处理视频选择
  const handleVideoSelect = (value: string) => {
    setSelectedVideo(value)
    console.log('Selected video:', value)
    
    // 发送请求开始播放流
    fetch('http://localhost:8080/api/stream/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        videoPath: value,
        streamType: 'play'  // 只启动播放流
      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return response.json()
    })
    .then(data => {
      console.log('Stream started:', data)
      // 增加等待时间，并添加重试机制
      let retryCount = 0
      const maxRetries = 5
      const retryInterval = 2000 // 2秒

      const tryInitHls = () => {
        // 先检查 playlist.m3u8 是否可用
        fetch('http://localhost:8080/hls/play/playlist.m3u8')
          .then(response => {
            if (response.ok) {
              initHls('http://localhost:8080/hls/play/playlist.m3u8')
            } else if (retryCount < maxRetries) {
              console.log(`Playlist not ready, retrying in ${retryInterval/1000}s... (${retryCount + 1}/${maxRetries})`)
              retryCount++
              setTimeout(tryInitHls, retryInterval)
            } else {
              throw new Error('Max retries reached, playlist not available')
            }
          })
          .catch(error => {
            if (retryCount < maxRetries) {
              console.log(`Error checking playlist, retrying in ${retryInterval/1000}s... (${retryCount + 1}/${maxRetries})`)
              retryCount++
              setTimeout(tryInitHls, retryInterval)
            } else {
              console.error('Failed to start playback:', error)
              alert('无法开始播放，请重试')
            }
          })
      }

      // 先等待5秒让后端生成初始片段
      setTimeout(tryInitHls, 5000)
    })
    .catch(error => {
      console.error('Error starting stream:', error)
      alert(`启动流失败: ${error.message}`)
    })
  }

  // 处理开始/停止推流
  const handleStartStop = () => {
    if (!selectedVideo) {
      alert('请选择视频文件')
      return
    }

    if (isStreaming) {
      // 停止推流
      fetch('http://localhost:8080/api/stream/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          streamType: 'push'
        })
      }).then(() => {
        console.log('Stream stopped')
        setIsStreaming(false)
      })
    } else {
      // 开始推流，传递所有推流参数
      fetch('http://localhost:8080/api/stream/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          videoPath: selectedVideo,
          streamType: 'push',
          rtmpUrl: serverUrl,           // RTMP服务器地址
          streamKey: streamCode,        // 推流码
          resolution: resolution,       // 分辨率
          frameRate: frameRate,        // 帧率
          videoBitrate: videoBitrate,  // 视频码率
          audioBitrate: audioBitrate,  // 音频码率
          cpuPreset: cpuPreset,        // CPU预设
          keyframeInterval: parseInt(keyframeInterval), // 关键帧间隔
          rateControl: rateControl,     // 码率控制
          watermark: watermark         // 水印设置
        })
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        return response.json()
      })
      .then(data => {
        console.log('Push stream started:', data)
        setIsStreaming(true)
      })
      .catch(error => {
        console.error('Error starting push stream:', error)
        alert(`启动推流失败: ${error.message}`)
      })
    }
  }

  // 组件卸载时清理 HLS 实例和状态
  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
        setIsPlaying(false)
      }
    }
  }, [])

  useLayoutEffect(() => {
    if (videoRef.current) {
      videoRef.current.src = '/placeholder.mp4'
    }
  }, [selectedInterface])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6 h-[calc(100vh-2rem)]"
    >
      <motion.div
        layoutId={`streaming-panel-${id}`}
        transition={{ duration: 0.3 }}
      >
        <Card 
          className="bg-[#18181B] border-0 rounded-lg overflow-hidden h-full"
        >
          <CardHeader className="bg-[#27272A] p-4">
            <CardTitle className="text-xl font-semibold text-white text-center">推流控制面板 {id}</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <motion.div
                  className="aspect-video bg-black rounded-lg overflow-hidden"
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300, damping: 10 }}
                >
                  <video 
                    ref={videoRef}
                    className="w-full h-full object-contain"
                    autoPlay
                    muted
                    playsInline
                  />
                </motion.div>

                <AnimatePresence>
                  {isPlaying && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="bg-green-500 text-white p-2 rounded-md text-center h-10 flex items-center justify-center"
                    >
                      正在播放
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-5">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="space-y-2">
                    <Label htmlFor={`input-interface-${id}`} className="text-[#9CA3AF] block">输入信号</Label>
                    <Select value={selectedInterface} onValueChange={setSelectedInterface}>
                      <SelectTrigger 
                        id={`input-interface-${id}`}
                        className="bg-[#27272A] border-0 h-11 text-white"
                      >
                        <SelectValue placeholder="请选择输入信号" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#27272A] border-0">
                        {inputSignals.map((signal) => (
                          <SelectItem 
                            key={signal.id} 
                            value={signal.id}
                            className="text-white hover:bg-[#3F3F46] focus:bg-[#3F3F46]"
                          >
                            {signal.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </motion.div>

                  {selectedInterface === 'local_video' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2"
                    >
                      <Label htmlFor={`video-select-${id}`} className="text-[#9CA3AF] block">选择视频文件</Label>
                      <Select value={selectedVideo} onValueChange={handleVideoSelect}>
                        <SelectTrigger 
                          id={`video-select-${id}`}
                          className="bg-[#27272A] border-0 h-11 text-white"
                        >
                          <SelectValue placeholder="请选择视频文件" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#27272A] border-0">
                          {videoList.map((video) => (
                            <SelectItem 
                              key={video.path} 
                              value={video.path}
                              className="text-white hover:bg-[#3F3F46] focus:bg-[#3F3F46]"
                            >
                              {video.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </motion.div>
                  )}

                  {selectedInterface === 'capture_card' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2"
                    >
                      <Label className="text-[#9CA3AF] block">采集卡设备信息</Label>
                      <pre className="bg-[#27272A] p-4 rounded-md text-sm text-white overflow-auto">
                        {captureDeviceInfo || '加载设备信息中...'}
                      </pre>
                    </motion.div>
                  )}

                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="space-y-2">
                    <Label htmlFor={`server-url-${id}`} className="text-[#9CA3AF] block">服务器地址</Label>
                    <Input
                      id={`server-url-${id}`}
                      value={serverUrl}
                      onChange={(e) => setServerUrl(e.target.value)}
                      placeholder="rtmp://example.com/live"
                      className="bg-[#27272A] border-0 h-11 text-white"
                    />
                  </motion.div>

                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="space-y-2">
                    <Label htmlFor={`stream-code-${id}`} className="text-[#9CA3AF] block">推流码 (可选)</Label>
                    <Input
                      id={`stream-code-${id}`}
                      value={streamCode}
                      onChange={(e) => setStreamCode(e.target.value)}
                      placeholder="your-stream-code (可选)"
                      className="bg-[#27272A] border-0 h-11 text-white"
                    />
                  </motion.div>

                </div>
              </div>

              <div className="space-y-6">
                <Tabs defaultValue="video" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-[#27272A]">
                    <TabsTrigger value="video" className="data-[state=active]:bg-[#3F3F46]">视频设置</TabsTrigger>
                    <TabsTrigger value="audio" className="data-[state=active]:bg-[#3F3F46]">音频设置</TabsTrigger>
                  </TabsList>
                  <TabsContent value="video" className="mt-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-[#9CA3AF] mb-2 block">分辨率</Label>
                        <Select value={resolution} onValueChange={setResolution}>
                          <SelectTrigger className="bg-[#27272A] border-0 h-11 text-[#9CA3AF]">
                            <SelectValue placeholder="选择分辨率" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#27272A] border-[#3A3A3F]">
                            {resolutions.map((res) => (
                              <SelectItem key={res.value} value={res.value}>
                                {res.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-[#9CA3AF] mb-2 block">帧率</Label>
                        <Select value={frameRate} onValueChange={setFrameRate}>
                          <SelectTrigger className="bg-[#27272A] border-0 h-11 text-[#9CA3AF]">
                            <SelectValue placeholder="选择帧率" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#27272A] border-[#3A3A3F]">
                            {frameRates.map((rate) => (
                              <SelectItem key={rate.value} value={rate.value}>
                                {rate.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-[#9CA3AF] mb-2 block">视频编码器</Label>
                      <Input 
                        value="x264" 
                        disabled 
                        className="bg-[#27272A] border-0 h-11 text-white"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <Label className="text-[#9CA3AF]">视频码率 (kbps)</Label>
                        <motion.span 
                          className="text-[#A855F7]"
                          key={videoBitrate}
                          initial={{ scale: 1.2, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 300, damping: 10 }}
                        >
                          {videoBitrate}
                        </motion.span>
                      </div>
                      <Slider
                        min={500}
                        max={20000}
                        step={500}
                        value={[videoBitrate]}
                        onValueChange={(value) => setVideoBitrate(value[0])}
                        className="py-2 [&_[role=slider]]:bg-white [&_[role=slider]]:border-0 [&_[role=track]]:bg-[#27272A] [&_[role=track]_.bg-primary]:bg-white"
                      />
                    </div>
                  </TabsContent>
                  <TabsContent value="audio" className="mt-4 space-y-4">
                    <div>
                      <Label className="text-[#9CA3AF] mb-2 block">音频编码器</Label>
                      <Input 
                        value="AAC" 
                        disabled 
                        className="bg-[#27272A] border-0 h-11 text-white"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <Label className="text-[#9CA3AF]">音频码率 (kbps)</Label>
                        <motion.span 
                          className="text-[#A855F7]"
                          key={audioBitrate}
                          initial={{ scale: 1.2, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 300, damping: 10 }}
                        >
                          {audioBitrate}
                        </motion.span>
                      </div>
                      <Slider
                        min={32}
                        max={320}
                        step={32}
                        value={[audioBitrate]}
                        onValueChange={(value) => setAudioBitrate(value[0])}
                        className="py-2 [&_[role=slider]]:bg-white [&_[role=slider]]:border-0 [&_[role=track]]:bg-[#27272A] [&_[role=track]_.bg-primary]:bg-white"
                      />
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="space-y-5">
                  <div>
                    <Label className="text-[#9CA3AF] block mb-2">CPU 预设</Label>
                    <Select value={cpuPreset} onValueChange={setCpuPreset}>
                      <SelectTrigger className="bg-[#27272A] border-0 h-11 text-[#9CA3AF]">
                        <SelectValue placeholder="选择 CPU 预设" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#27272A] border-[#3A3A3F]">
                        {cpuPresets.map((preset) => (
                          <SelectItem key={preset.value} value={preset.value}>
                            {preset.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor={`keyframe-interval-${id}`} className="text-[#9CA3AF] block mb-2">关键帧间隔 (秒)</Label>
                    <Input
                      id={`keyframe-interval-${id}`}
                      type="number"
                      value={keyframeInterval}
                      onChange={(e) => setKeyframeInterval(e.target.value)}
                      min="1"
                      max="10"
                      className="bg-[#27272A] border-0 h-11 text-white"
                    />
                  </div>

                  <div>
                    <Label className="text-[#9CA3AF] block mb-2">码率控制</Label>
                    <Select value={rateControl} onValueChange={setRateControl}>
                      <SelectTrigger className="bg-[#27272A] border-0 h-11 text-[#9CA3AF]">
                        <SelectValue placeholder="选择码率控制" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#27272A] border-[#3A3A3F]">
                        {rateControls.map((control) => (
                          <SelectItem key={control.value} value={control.value}>
                            {control.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-[#9CA3AF] block mb-2">水印</Label>
                    <Select value={watermark} onValueChange={setWatermark}>
                      <SelectTrigger className="bg-[#27272A] border-0 h-11 text-[#9CA3AF]">
                        <SelectValue placeholder="选择水印" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#27272A] border-[#3A3A3F]">
                        {watermarkOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center w-full my-6">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-64"
              >
                <Button 
                  onClick={handleStartStop}
                  className={`w-full ${isStreaming ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
                >
                  {isStreaming ? '停止推流' : '开始推流'}
                </Button>
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}

