import { IProcessingPipeline } from "./processing-pipeline";


const pipeLineStore = {

};

export function getPipeline(id: string): IProcessingPipeline {

    if (!pipeLineStore[ id ]) {

        pipeLineStore[ id ] = {};
    }

    return pipeLineStore[ id ];
}

export function addPipeline(pipeLine: IProcessingPipeline, id?: string): string {

    if (id) {
        pipeLine.id = id;
    }
    id = pipeLine.id;

    if (!id) {
        throw new Error("No id set on pipeline and no id passed to 'addPipeline', id is required");
    }

    if (pipeLineStore[ id ]) {
        throw new Error(`'${id}' already exists on 'pipeLineStore' -> not allowed, id must be unique
        Otherwise the pipeline graph edges can be ambiguous`);
    }

    pipeLineStore[ id ] = pipeLine;
    return id;
}