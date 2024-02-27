import { IPipeLineStage, PipeLine, ProcessingPipeLine } from "./processing-pipeline";



function isPath(string: string) {

    if (string.includes('\n')) {
        return false;
    }

    if (string.includes('/')) {
        return true;
    }
}

export class PipeLineGraph extends ProcessingPipeLine implements IPipeLineStage {

    constructor (stages: IPipeLineStage[], id?: string) {
        super(stages, id);
    }

    render(input: string): string {
        for (const stage of this.getStages()) {
            if (stage.)
        }
    }

}