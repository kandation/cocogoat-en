/**
 * Artifact data structure.
 * In order to ensure versatility, we all store the most primitive data.
 */
/**
 * Artifacts List
 */
export interface ArtifactParam {
    /**
     * name
     */
    name: string
    /**
     * Attributes
     */
    value: string
}
/**
 * 圣遗物数据结构
 */
export interface Artifact {
    /**
     * ID
     */
    id: number
    /**
     * 名称
     */
    name: string
    /**
     * 星数
     */
    stars: number
    /**
     * 等级
     */
    level: number
    /**
     * 使用者
     */
    user: string
    /**
     * 主词条
     */
    main: ArtifactParam
    /**
     * 副词条
     */
    sub: ArtifactParam[]
}
export function createEmptyArtifact() {
    return {
        id: Date.now(),
        name: '',
        stars: 0,
        level: 0,
        main: {
            name: '',
            value: '',
        },
        sub: [],
        user: '',
    } as Artifact
}
