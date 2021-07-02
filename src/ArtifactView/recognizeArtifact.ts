import {ocr, SplitResults} from './imageProcess'
import {Artifact, ArtifactParam} from '@/typings/Artifact'
import {ArtifactNames, ArtifactParamTypes, ArtifactSubParamTypes} from '@/typings/ArtifactMap'
import {detectStars, textCNEN, textNumber, textBestmatch, findLowConfidence} from './postRecognize'

const ocrCorrectionMap = [
    ['莉力', '攻击力'],
    ['医力', '攻击力'],
    ['鬼已装备', '魈已装备'],
    ['魁已装备', '魈已装备'],
    ['宗室之邻', '宗室之翎'],
    ['宗室之领', '宗室之翎'],
    ['生花', '生之花'],
    ['角斗士的耐醉', '角斗士的酣醉'],
    ['角斗士的希翼', '角斗士的希冀'],
    ['星罗圭壁之暑', '星罗圭璧之晷'],
    ['宗室银瓷', '宗室银瓮'],
    ['雷鸟的冷阀', '雷鸟的怜悯'],
    ['雷灾的子遗', '雷灾的孑遗'],
]

export async function recognizeArtifact(ret: SplitResults): Promise<[Artifact, string[], any]> {
    const potentialErrors: string[] = []
    /* OCR */
    const ocrres = await ocr(ret)
    console.log(ocrres)

    /* Number of stars */
    const stars = detectStars(ret.color.canvas)

    /* Title */
    if (!ocrres.title || !ocrres.title.text) {
        throw new Error("Title cant't be empty")
    }
    let name = textCNEN(ocrres.title.text)

    for (const i of ocrCorrectionMap) {
        name = name.replace(i[0], i[1])
    }

    if (!ArtifactNames.includes(name)) {
        name = textBestmatch(name, ArtifactNames)
    }

    /* Level */
    if (!ocrres.level || !ocrres.level.text) {
        console.log(`Error Art Level [${ocrres.level.text}]`)
        throw new Error("Level cant't be empty")
    }
    let level = Number(
        textNumber(
            ocrres.level.text
                .toLowerCase()
                .replace(/o/g, '0')
                .replace(/古/g, '0')
                .replace(/土/g, '1')
                .replace(/吉/g, '10'),
        ),
    )
    level = level > 20 ? 20 : level

    /* Main */
    if (!ocrres.main || !ocrres.main.text) {
        throw new Error("Main cant't be empty")
    }
    const [main, maybeError] = recognizeParams(ocrres.main.text.replace(/\s/g, ''), true)
    if (maybeError) {
        potentialErrors.push(maybeError)
    }
    /* Sub */
    if (!ocrres.sub || !ocrres.sub.text) {
        throw new Error("Sub cant't be empty")
    }
    const subTextArray = santizeParamsArray(
        ocrres.sub.text.split('\n').filter((e: string) => {
            return e.trim() !== ''
        }),
    )
    const sub = []
    try {
        for (const i of subTextArray) {
            const [subData, maybeError] = recognizeParams(i)
            sub.push(subData)
            if (maybeError) {
                potentialErrors.push(maybeError)
            }
        }
    } catch (e) {
        console.log(e)
    }

    /* Adverbs low confidence check */
    potentialErrors.push(...findLowConfidence(ocrres.sub, 80, true))

    /* Main title low confidence check */
    potentialErrors.push(...findLowConfidence(ocrres.main, 80, true))

    return [
        {
            id: Date.now(),
            name,
            stars,
            level,
            user: '',
            main,
            sub,
        },
        potentialErrors,
        ocrres,
    ]
}

/**
 * Preprocessing the adverbs array where the plus sign may be missing
 * If this line has a plus sign, this line and all previous lines are legal
 * If the Bank does not have a plus sign, it will not be processed for the time being, waiting for subsequent judgment
 */
function santizeParamsArray(input: string[]): string[] {
    const array = [...input] // clone it
    const result: Set<string> = new Set()
    for (let i = 0; i < array.length; i++) {
        array[i] = array[i].replace(/十/g, '+').replace(/\s/g, '')
        if (array[i].includes('+')) {
            for (let j = 0; j <= i; j++) {
                result.add(array[j])
            }
        }
    }
    return [...result]
}

function recognizeParams(text: string, main = false): [ArtifactParam, string | null] {
    let newtext = text
    for (const i of ocrCorrectionMap) {
        newtext = newtext.replace(i[0], i[1])
    }

    let maybeError = null
    const rawName = textCNEN(newtext)
    let value = textNumber(newtext)
    const toCompare = main ? ArtifactParamTypes : ArtifactSubParamTypes
    const name = textBestmatch(rawName, toCompare)

    /*
    * PaddleOCR will recognize the comma (,) as a dot (.)
    * And may recognize the percent sign as a number
    * Here are the points after the 3 digits and above, remove the points
    * For two digits, remove the last digit
    * */

    value = value.replace(/\.\./g, '.')
    const [, b] = value.split('.')
    if (b && b.length >= 3) {
        value = value.replace(/\./g, '')
    }
    if (b && b.length === 2) {
        value = value.substr(0, value.length - 1)
    }

    /*
      * Simple interval processing of entry attributes
      *
      * According to the analysis, the percentage figure usually does not exceed the main 70% and vice 50%; and should be >1%
      * The fixed number usually does not exceed the main 6000 and 2000 according to the analysis.
      * Data source: https://wiki.biligame.com/ys/圣遗物属性
      *
      * If such a situation occurs, it is generally considered to be an identification error and it is to identify one more digit
      * So directly remove the first digit and add it to the list of suspected errors
     */
    if (value.includes('.')) {
        const uplimit = main ? 70 : 50
        const numval = Number(value)
        value += '%'
        if (numval > uplimit) {
            console.log('Fixed percentage of abnormalities detected', value, 'Has been modified to', value.substr(1))
            value = value.substr(1)
            maybeError = value
        } else if (numval < 1) {
            maybeError = value
        }
    } else {
        const uplimit = main ? 6000 : 2000
        if (Number(value) > uplimit) {
            console.log('Abnormal fixed number detected', value, 'Has been modified to', value.substr(1))
            value = value.substr(1)
            maybeError = value
        }
    }
    return [
        {
            name,
            value,
        },
        maybeError,
    ]
}
