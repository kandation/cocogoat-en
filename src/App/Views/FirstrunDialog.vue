<script lang="ts">
import { bus } from '@/App/bus'
import { defineComponent, PropType } from 'vue'
export default defineComponent({
    props: {
        show: {
            type: Boolean as PropType<boolean>,
            default: false,
        },
    },
    data() {
        return {
            sendErrorReports: true,
            sendWrongOCRReports: false,
        }
    },
    methods: {
        doSave() {
            bus.config.options.sendErrorReports = this.sendErrorReports
            bus.config.options.sendWrongOCRReports = this.sendWrongOCRReports
            bus.config.options.firstRun = false
        },
    },
})
</script>
<template>
    <el-dialog
        custom-class="fullscreen-dialog firstrun-dialog"
        :title="__('LANG_TITLE_WELCOME')"
        width="440px"
        :model-value="show"
        :close-on-click-modal="false"
        :close-on-press-escape="false"
        :show-close="false"
        destroy-on-close
    >
        <div class="firstrun-box">
            <h4>
                {{ __('LANG_TITLE_DESCRIPTION') }}
                <br />
                {{ __('LANG_TITLE_DESCRIPTION_MORE') }}
            </h4>

            <div class="opt">
                <el-switch v-model="sendErrorReports" :active-text="__('LANG_REPORT_ERROR')"> </el-switch>
            </div>
            <div class="opt">
                <el-switch v-model="sendWrongOCRReports" :active-text="__('LANG_REPORT_OCR')"> </el-switch>
            </div>
            <div class="opt small-txt">
                {{
                    __(
                        'LANG_EDITOR_ARTIFACTS_CHANG_TEXT',
                    )
                }}
            </div>
        </div>
        <template #footer>
            <span class="dialog-footer">
                <el-button style="width: 100%" size="small" type="primary" @click="doSave">
                    {{ __('LANG_SAVE_AND_START') }}
                </el-button>
            </span>
        </template>
    </el-dialog>
</template>

<style lang="scss" scoped>
.firstrun-box {
    h4 {
        margin-top: -25px;
        font-weight: normal;
        margin-bottom: 20px;
    }
    .opt {
        margin-bottom: 10px;
    }
    .small-txt {
        font-size: 13px;
        padding: 10px 0;
        padding-top: 15px;
    }
}
</style>
<style lang="scss">
.firstrun-dialog .el-dialog__body {
    padding-bottom: 0;
}
</style>
