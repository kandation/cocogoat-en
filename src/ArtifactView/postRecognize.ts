// @ts-ignore
import {closest} from 'color-diff'

const color_palette = [
    {R: 189, G: 105, B: 50}, // Five stars
    {R: 162, G: 86, B: 225}, // Four stars
    {R: 80, G: 128, B: 204}, // Three Stars
    {R: 41, G: 144, B: 114}, // Two stars
    {R: 115, G: 118, B: 141}, // One Star
]
const color_rmap = {
    189: 5,
    162: 4,
    80: 3,
    41: 2,
    115: 1,
}

export function detectStars(colorCanvas: HTMLCanvasElement) {
    const ctx = colorCanvas.getContext('2d')
    if (!ctx) throw new Error('Canvas not supported!')
    const imgData = ctx.getImageData(0, 0, colorCanvas.width, colorCanvas.height)
    const mapColor = {
        R: imgData.data[0],
        G: imgData.data[1],
        B: imgData.data[2],
    }
    const closestColor = closest(mapColor, color_palette)
    // @ts-ignore
    return color_rmap[closestColor.R] || 0
}

export function textBestmatch(text: string, list: string[]) {
    const listUpper = list.map(function (x) {
        return x.toUpperCase()
    })
    const textUpper = text.toUpperCase()
    if (listUpper.includes(textUpper)) return text
    const matches = findBestMatch(textUpper, listUpper, list)
    if (matches.bestMatch.rating > 3) return ''
    return matches.bestMatch.target
}

export function textChinese(t: string) {
    const str = t.match(/[\u4e00-\u9fa5]/g)?.join('') || ''
    if (!str) throw new Error(`${t} doesn't contains chinese`)
    return str
}

export function textCNEN(t: string) {
    return t.match(/[a-zA-Z\'\u4e00-\u9fa5]/g)?.join('') || ''
}

export function textNumber(t: string) {
    const str = t.replace(/[^\d.]/g, '')
    if (!str) throw new Error(`${t} doesn't contains number`)
    return str
}

export function levenshteinEditDistance(value: string, other: string): number {
    let distance: number
    let distanceOther: number
    const codes: number[] = []
    const cache: number[] = []

    if (value === other) {
        return 0
    }

    if (value.length === 0) {
        return other.length
    }

    if (other.length === 0) {
        return value.length
    }

    let index = 0

    while (index < value.length) {
        codes[index] = value.charCodeAt(index)
        cache[index] = ++index
    }

    let indexOther = 0
    let result
    while (indexOther < other.length) {
        const code = other.charCodeAt(indexOther)
        result = distance = indexOther++
        index = -1

        while (++index < value.length) {
            distanceOther = code === codes[index] ? distance : distance + 1
            distance = cache[index]
            cache[index] = result =
                distance > result
                    ? distanceOther > result
                    ? result + 1
                    : distanceOther
                    : distanceOther > distance
                    ? distance + 1
                    : distanceOther
        }
    }

    return result || Infinity
}

export function findBestMatch(mainString: string, targetStringsUpper: string[], targetStrings: string[]) {
    const ratings = []
    let bestMatchIndex = 0

    for (let i = 0; i < targetStringsUpper.length; i++) {
        const currentTargetStringUpper = targetStringsUpper[i]
        const currentTargetString = targetStrings[i]
        const currentRating = levenshteinEditDistance(mainString, currentTargetStringUpper)
        ratings.push({target: currentTargetString, rating: currentRating})
        if (currentRating < ratings[bestMatchIndex].rating) {
            bestMatchIndex = i
        }
    }

    const bestMatch = ratings[bestMatchIndex]

    return {ratings: ratings, bestMatch: bestMatch, bestMatchIndex: bestMatchIndex}
}

/**
 * OCR low confidence detection
 * @param page - OCR result page
 * @param lowerThen - Lowest confidence
 * @param numberOnly - Whether to deal with numbers only
 * @returns An array of all possible errors
 */
export function findLowConfidence(page: any, lowerThan: number, numberOnly = true) {
    const potentialErrors: string[] = []
    for (const i of page.words) {
        if (i.confidence > 0 && i.confidence < lowerThan / 100) {
            // Confidence is lower than expected
            // If you only judge the numbers
            if (numberOnly) {
                try {
                    potentialErrors.push(`${textNumber(i.text)}${i.text.includes('%') ? '%' : ''}`)
                } catch (e) {
                    // not a number
                }
            } else {
                potentialErrors.push(i.text)
            }
        }
    }
    return potentialErrors
}
