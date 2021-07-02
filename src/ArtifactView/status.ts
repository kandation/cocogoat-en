import { Artifact } from '@/typings/Artifact'
import { IOptions } from '@/typings/config'
import { reactive } from 'vue'
export enum STATUS {
    'INTRO',
    'LOADING',
    'SUCCESS',
    'ERROR',
    'MODIFIED',
    'DELETED',
}
interface WrongReportData {
    ocrResult: Record<string, any>
    artifact: Artifact
    screenshot: string
    splitImages: Record<string, string>
    message: string
    screen: any
    devicePixelRatio: typeof window.devicePixelRatio
    windowWidth: number
    windowHeight: number
    version: string
    build: any
}
interface statusType {
    version: string
    build: any
    options: IOptions | null
    status: STATUS
    artifact: Artifact
    artifactBackup: Artifact | null
    potentialErrors: string[]
    runtimeDebug: boolean
    auto: boolean
    hotkey: number
    wrongReportData: WrongReportData | null
}
export const status = reactive(<statusType>{
    version: '',
    build: {},
    options: null,
    status: STATUS.INTRO,
    runtimeDebug: false,
    auto: false,
    hotkey: 41,
    potentialErrors: [],
    artifactBackup: null,
    artifact: {
        id: 0,
        name: 'Witch\'s Heart Flames',
        stars: 5,
        level: 20,
        user: 'Noelle',
        main: {
            name: 'DEF',
            value: '20%',
        },
        sub: [
            {
                name: 'DEF',
                value: '666',
            },
            {
                name: 'HP',
                value: '1919',
            },
            {
                name: 'ENERGY RECHARGE',
                value: '8.10%',
            },
            {
                name: 'DEF',
                value: '5.2%',
            },
        ],
    },
    wrongReportData: null,
})
