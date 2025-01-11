'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import StreamingPanel from '@/components/StreamingPanel'

export default function StreamingControl() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">
          FFMPEG 多路推流控制系统
        </h1>
        
        <Tabs defaultValue="stream1" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-[#1A1A1F] p-0.5 mb-4">
            {[1, 2, 3, 4].map((num) => (
              <TabsTrigger 
                key={num}
                value={`stream${num}`}
                className="py-3 data-[state=active]:bg-purple-600 data-[state=active]:text-white transition-all rounded-none"
              >
                推流 {num}
              </TabsTrigger>
            ))}
          </TabsList>
          {[1, 2, 3, 4].map((num) => (
            <TabsContent key={num} value={`stream${num}`}>
              <StreamingPanel id={num.toString()} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  )
}

