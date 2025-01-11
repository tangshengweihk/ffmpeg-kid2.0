'use client'

import { useState, useRef, useLayoutEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const inputSignals = [
  { id: 'hdmi1', name: 'HDMI 1' },
  { id: 'hdmi2', name: 'HDMI 2' },
  { id: 'sdi1', name: 'SDI 1' },
  { id: 'composite1', name: 'Composite 1' },
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
  const videoRef = useRef<HTMLVideoElement>(null)

  const handleStartStop = () => {
    if (!selectedInterface || !serverUrl) {
      alert('请选择输入信号并填写服务器地址')
      return
    }
    setIsStreaming(!isStreaming)
    const fullRtmpUrl = streamCode ? `${serverUrl}/${streamCode}` : serverUrl
    console.log(`推流 ${id} - ${isStreaming ? '停止' : '开始'}推流: 从 ${selectedInterface} 到 ${fullRtmpUrl}, 分辨率: ${resolution}, 帧率: ${frameRate}fps, CPU预设: ${cpuPreset}, 关键帧间隔: ${keyframeInterval}s, 码率控制: ${rateControl}, 视频编码器: x264, 视频码率: ${videoBitrate}kbps, 音频编码器: AAC, 音频码率: ${audioBitrate}kbps, 水印: ${watermark}`)
  }

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
                  {isStreaming && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="bg-green-500 text-white p-2 rounded-md text-center h-10 flex items-center justify-center"
                    >
                      正在推流
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
                  className="w-full h-11 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0"
                  disabled={!selectedInterface || !serverUrl}
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

