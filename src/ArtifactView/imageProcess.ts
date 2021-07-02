import 'context-filter-polyfill'
import { ocr as ipcOcr } from './ipc'
import imageConfig from './imageConfig'
import { IocrResult } from '@/typings/ocr'

export interface ISplitConfig {
    w: number
    h: number
    x: number
    y: number
}
export interface ISplitResult {
    canvas: HTMLCanvasElement
    config: ISplitConfig
    imageConfig: any
}
export type SplitResults = Record<string, ISplitResult>
export function split(canvas: HTMLCanvasElement, posList: Record<string, ISplitConfig>, pixelRatio: number) {
    const ret: SplitResults = {}
    console.log(posList)
    for (const i in posList) {
        if ({}.hasOwnProperty.call(posList, i)) {
            ret[i] = ret[i] || {}
            const config = posList[i]
            ret[i].config = config
            const canvas1 = document.createElement('canvas')
            canvas1.width = config.w * pixelRatio
            canvas1.height = config.h * pixelRatio
            const ctx = canvas1.getContext('2d')
            if (!ctx) throw new Error('Canvas not supported')

            const currentImgConfig = imageConfig[i]
            if (typeof currentImgConfig.handler === 'string') {
                ctx.filter = currentImgConfig.handler
            } else {
                ctx.filter = ''
            }

            ctx.drawImage(
                canvas,
                config.x * pixelRatio,
                config.y * pixelRatio,
                config.w * pixelRatio,
                config.h * pixelRatio,
                0,
                0,
                config.w * pixelRatio,
                config.h * pixelRatio,
            )

            if (typeof currentImgConfig.handler === 'function') {
                currentImgConfig.handler(ctx, config.w * pixelRatio, config.h * pixelRatio)
            }
            ret[i].canvas = canvas1
            ret[i].imageConfig = currentImgConfig
        }
    }
    return ret
}
export async function imageDump(canvas: HTMLCanvasElement, list: SplitResults) {
    /* dynamic require node modules */
    const path = require('path')
    const fsex = require('fs-extra')
    const exportPath = path.join(require('os').tmpdir(), 'cocogoat', 'artifacts', Date.now().toString())
    await fsex.ensureDir(exportPath)
    const pms = []
    {
        const filename = path.join(exportPath, `window.webp`)
        console.log(filename)
        const b64img = canvas.toDataURL('image/webp').replace(/^data:image\/webp;base64,/, '')
        pms.push(fsex.writeFile(filename, Buffer.from(b64img, 'base64')))
    }
    for (const i in list) {
        if ({}.hasOwnProperty.call(list, i)) {
            const filename = path.join(exportPath, `${i}.webp`)
            if (list[i]) {
                const b64img = list[i].canvas.toDataURL('image/webp').replace(/^data:image\/webp;base64,/, '')
                pms.push(fsex.writeFile(filename, Buffer.from(b64img, 'base64')))
            }
        }
    }
    await Promise.all(pms)
}
export async function ocr(ret: SplitResults) {
    const ocrpms = []
    const ocrpmk: Record<number, string> = {}
    for (const i in ret) {
        if ({}.hasOwnProperty.call(ret, i)) {
            if (i === 'color') continue
            const ctx = ret[i].canvas.getContext('2d')
            const imgData = ctx?.getImageData(0, 0, ret[i].canvas.width, ret[i].canvas.height)
            const ocrData = {
                width: ret[i].canvas.width,
                height: ret[i].canvas.height,
                data: Buffer.from(imgData?.data.buffer as ArrayBuffer),
                det: ret[i].imageConfig.singleLine === true ? false : true,
            }
            const len = ocrpms.push(ipcOcr(ocrData))
            ocrpmk[len - 1] = i
        }
    }
    const ocrresArr = await Promise.all(ocrpms)
    const ocrres: Record<string, any> = {}
    for (const i in ocrresArr) {
        if ({}.hasOwnProperty.call(ocrresArr, i) && ocrresArr[i]) {
            const res: { words: IocrResult[]; text: string } = { words: [], text: '' }
            const text: string[] = []
            res.words = ocrresArr[i]
            for (const i of res.words) {
                text.push(i.text)
            }
            res.text = text.join('\n')
            ocrres[ocrpmk[i]] = res
        }
    }
    return ocrres
}
/** Sharpening/matrix/convolution processing */
export function convolute(imageData: ImageData, weights: number[]) {
    const side = Math.round(Math.sqrt(weights.length))
    const halfSide = Math.floor(side / 2)
    const src = imageData.data
    const sw = imageData.width
    const sh = imageData.height
    const newImageData = new ImageData(sw, sh)
    const dst = newImageData.data
    // pad output by the convolution matrix
    const w = sw
    const h = sh
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const sy = y
            const sx = x
            const dstOff = (y * w + x) * 4
            const alphaFac = 1
            // calculate the weighed sum of the source image pixels that
            // fall under the convolution matrix
            let r = 0
            let g = 0
            let b = 0
            let a = 0
            for (let cy = 0; cy < side; cy++) {
                for (let cx = 0; cx < side; cx++) {
                    const scy = sy + cy - halfSide
                    const scx = sx + cx - halfSide
                    if (scy >= 0 && scy < sh && scx >= 0 && scx < sw) {
                        const srcOff = (scy * sw + scx) * 4
                        const wt = weights[cy * side + cx]
                        r += src[srcOff] * wt
                        g += src[srcOff + 1] * wt
                        b += src[srcOff + 2] * wt
                        a += src[srcOff + 3] * wt
                    }
                }
            }
            dst[dstOff] = r
            dst[dstOff + 1] = g
            dst[dstOff + 2] = b
            dst[dstOff + 3] = a + alphaFac * (255 - a)
        }
    }
    return newImageData
}
/**
 *  Color difference filter
 */
export function createColorFilter(r: number, g: number, b: number, diff = 40, invert = false) {
    return (ctx: CanvasRenderingContext2D, w: number, h: number) => {
        const imageData = ctx.getImageData(0, 0, w, h)
        const target = invert ? 0 : 255
        for (let i = 0; i < imageData.data.length; i += 4) {
            const rr = imageData.data[i]
            const gg = imageData.data[i + 1]
            const bb = imageData.data[i + 2]
            if (Math.abs(rr - r) < diff && Math.abs(gg - g) < diff && Math.abs(bb - b) < diff) {
                imageData.data[i] = target
                imageData.data[i + 1] = target
                imageData.data[i + 2] = target
            }

            if (invert) {
                imageData.data[i] = 255 - imageData.data[i]
                imageData.data[i + 1] = 255 - imageData.data[i + 1]
                imageData.data[i + 2] = 255 - imageData.data[i + 2]
            }
        }
        ctx.putImageData(imageData, 0, 0)
    }
}
/* HSL brightness preprocessing-not used yet */
export function createBrightnessFilter(lmin: number, lmax: number, invert = false, threshold = 0) {
    return (ctx: CanvasRenderingContext2D, w: number, h: number) => {
        const imageData = ctx.getImageData(0, 0, w, h)
        const target = invert ? 0 : 255
        for (let i = 0; i < imageData.data.length; i += 4) {
            const rr = imageData.data[i]
            const gg = imageData.data[i + 1]
            const bb = imageData.data[i + 2]
            const [, , l] = rgbToHsl(rr, gg, bb)
            if (l > lmax || l < lmin) {
                imageData.data[i] = target
                imageData.data[i + 1] = target
                imageData.data[i + 2] = target
            } else if (threshold > 0 && l > threshold) {
                imageData.data[i] = 255 - target
                imageData.data[i + 1] = 255 - target
                imageData.data[i + 2] = 255 - target
            } else if (threshold > 0) {
                imageData.data[i] = target
                imageData.data[i + 1] = target
                imageData.data[i + 2] = target
            }

            if (invert) {
                imageData.data[i] = 255 - imageData.data[i]
                imageData.data[i + 1] = 255 - imageData.data[i + 1]
                imageData.data[i + 2] = 255 - imageData.data[i + 2]
            }
        }
        ctx.putImageData(imageData, 0, 0)
    }
}
function rgbToHsl(rr: number, gg: number, bb: number) {
    const r = rr / 255
    const g = gg / 255
    const b = bb / 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0
    let s = 0
    const l = (max + min) / 2

    if (max === min) {
        h = s = 0 // achromatic
    } else {
        const d = max - min
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
        switch (max) {
            case r:
                h = (g - b) / d + (g < b ? 6 : 0)
                break
            case g:
                h = (b - r) / d + 2
                break
            case b:
                h = (r - g) / d + 4
                break
        }
        h /= 6
    }

    return [h, s, l]
}
/* Filter preprocessing-not used yet */
export function createBandpassFilter([r1, g1, b1]: number[], [r2, g2, b2]: number[], invert = false) {
    return (ctx: CanvasRenderingContext2D, w: number, h: number) => {
        const imageData = ctx.getImageData(0, 0, w, h)
        const bw = !invert
        for (let i = 0; i < imageData.data.length; i += 4) {
            const r = imageData.data[i]
            const g = imageData.data[i + 1]
            const b = imageData.data[i + 2]
            if (r >= r1 && r <= r2 && g >= g1 && g <= g2 && b >= b1 && b <= b2) {
                if (bw) {
                    imageData.data[i] = imageData.data[i + 1] = imageData.data[i + 2] = 0
                } else if (invert) {
                    imageData.data[i] = 255 - r
                    imageData.data[i + 1] = 255 - g
                    imageData.data[i + 2] = 255 - b
                }
            } else {
                imageData.data[i] = imageData.data[i + 1] = imageData.data[i + 2] = 255
            }
        }
        ctx.putImageData(imageData, 0, 0)
    }
}
