import { IProcessingPipeline } from "./processing-pipeline";


const pipeLineStore = {

};

export function getPipeline(id: string): IProcessingPipeline {
    return pipeLineStore[ id ];
}

export function addPipeline(id: string, pipeLine: IProcessingPipeline): IProcessingPipeline {
    return pipeLineStore[ id ] = pipeLine;
}