'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/** 公告封面固定比例：宽 : 高 = 16 : 9 */
export const BANNER_RATIO = 16 / 9

interface ImageCropperProps {
  /** 原始图片文件 */
  file: File
  /** 输出宽度（高度按比例推算） */
  outputWidth?: number
  /** 确认时回调，参数为裁切后的 PNG Blob */
  onConfirm: (blob: Blob) => void | Promise<void>
  onCancel: () => void
}

/**
 * 固定比例图片裁切器。
 * 用 canvas 实现：用户拖动调整取景位置、滚轮/滑块缩放，
 * 确认后导出裁切结果。
 */
export default function ImageCropper({
  file,
  outputWidth = 1600,
  onConfirm,
  onCancel,
}: ImageCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [imgUrl, setImgUrl] = useState('')
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [drag, setDrag] = useState<{ x: number; y: number; ox: number; oy: number } | null>(null)
  const [minScale, setMinScale] = useState(1)
  const [busy, setBusy] = useState(false)

  const BOX_W = 720
  const BOX_H = Math.round(BOX_W / BANNER_RATIO) // 405

  // 读取文件并初始化
  useEffect(() => {
    const url = URL.createObjectURL(file)
    setImgUrl(url)
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      // 初始缩放：让图片刚好覆盖取景框
      const s = Math.max(BOX_W / img.width, BOX_H / img.height)
      setMinScale(s)
      setScale(s)
      setOffset({ x: 0, y: 0 })
    }
    img.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])

  // 绘制预览
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, BOX_W, BOX_H)
    ctx.fillStyle = '#0b0b0d'
    ctx.fillRect(0, 0, BOX_W, BOX_H)

    const w = img.width * scale
    const h = img.height * scale
    const x = (BOX_W - w) / 2 + offset.x
    const y = (BOX_H - h) / 2 + offset.y

    ctx.drawImage(img, x, y, w, h)

    // 三分线参考
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'
    ctx.lineWidth = 1
    for (let i = 1; i < 3; i++) {
      ctx.beginPath()
      ctx.moveTo((BOX_W / 3) * i, 0)
      ctx.lineTo((BOX_W / 3) * i, BOX_H)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, (BOX_H / 3) * i)
      ctx.lineTo(BOX_W, (BOX_H / 3) * i)
      ctx.stroke()
    }
  }, [scale, offset])

  useEffect(() => {
    draw()
  }, [draw, imgUrl])

  // 限制偏移，保证图片始终覆盖取景框
  const clamp = useCallback(
    (ox: number, oy: number, s: number) => {
      const img = imgRef.current
      if (!img) return { x: ox, y: oy }
      const w = img.width * s
      const h = img.height * s
      const maxX = Math.max(0, (w - BOX_W) / 2)
      const maxY = Math.max(0, (h - BOX_H) / 2)
      return {
        x: Math.min(maxX, Math.max(-maxX, ox)),
        y: Math.min(maxY, Math.max(-maxY, oy)),
      }
    },
    []
  )

  const onPointerDown = (e: React.PointerEvent) => {
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    setDrag({ x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y })
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return
    const next = clamp(drag.ox + (e.clientX - drag.x), drag.oy + (e.clientY - drag.y), scale)
    setOffset(next)
  }

  const onPointerUp = () => setDrag(null)

  const onWheel = (e: React.WheelEvent) => {
    const img = imgRef.current
    if (!img) return
    const delta = -e.deltaY * 0.0015
    const next = Math.min(minScale * 4, Math.max(minScale, scale * (1 + delta)))
    setScale(next)
    setOffset((o) => clamp(o.x, o.y, next))
  }

  // 导出裁切结果
  const handleConfirm = async () => {
    const img = imgRef.current
    if (!img) return
    setBusy(true)
    try {
      const outH = Math.round(outputWidth / BANNER_RATIO)
      const out = document.createElement('canvas')
      out.width = outputWidth
      out.height = outH
      const ctx = out.getContext('2d')
      if (!ctx) return
      ctx.imageSmoothingQuality = 'high'

      // 取景框在原图坐标系中的位置
      const w = img.width * scale
      const h = img.height * scale
      const x = (BOX_W - w) / 2 + offset.x
      const y = (BOX_H - h) / 2 + offset.y
      const sx = (x * outputWidth) / BOX_W
      const sy = (y * outputWidth) / BOX_W
      const sw = (BOX_W * outputWidth) / BOX_W
      const sh = (BOX_H * outputWidth) / BOX_W

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outputWidth, outH)

      const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, 'image/png'))
      if (blob) await onConfirm(blob)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-2xl rounded-xl border border-[#c8a24a]/20 bg-[#16161c] p-5">
        <h3 className="text-base font-bold text-gold-gradient mb-3">裁切封面图（固定 16:9）</h3>

        <div
          className="relative mx-auto rounded-lg overflow-hidden border border-[#c8a24a]/25 select-none"
          style={{ width: BOX_W, height: BOX_H, maxWidth: '100%', cursor: drag ? 'grabbing' : 'grab' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
        >
          <canvas ref={canvasRef} width={BOX_W} height={BOX_H} className="w-full h-full block" />
          {!imgUrl && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-[#9a948a]">
              图片加载中...
            </div>
          )}
        </div>

        <p className="mt-2 text-xs text-[#9a948a]/70 text-center">
          拖动图片调整位置，滚轮或下方滑块缩放 · 输出比例固定 16:9
        </p>

        <div className="mt-3 flex items-center gap-3">
          <span className="text-xs text-[#9a948a] shrink-0">缩放</span>
          <input
            type="range"
            min={minScale}
            max={minScale * 4}
            step={0.01}
            value={scale}
            onChange={(e) => {
              const s = Number(e.target.value)
              setScale(s)
              setOffset((o) => clamp(o.x, o.y, s))
            }}
            className="flex-1 accent-[#c8a24a]"
          />
          <button
            type="button"
            onClick={() => {
              setScale(minScale)
              setOffset({ x: 0, y: 0 })
            }}
            className="shrink-0 text-xs px-2.5 py-1 rounded-full bg-[#1d1d24] text-[#9a948a] border border-[#c8a24a]/20"
          >
            重置
          </button>
        </div>

        <div className="mt-4 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2 rounded-lg border border-[#c8a24a]/20 text-[#9a948a] text-sm"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy || !imgUrl}
            className="px-5 py-2 rounded-lg btn-gold font-medium text-sm disabled:opacity-60"
          >
            {busy ? '处理中...' : '确认裁切'}
          </button>
        </div>
      </div>
    </div>
  )
}
