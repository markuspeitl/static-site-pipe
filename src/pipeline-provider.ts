import { PipeLine, PipeLinesDict } from './pipeline-processing';



const pipeLineStore: PipeLinesDict<unknown, unknown> = {};

export function getPipeLine(id: string): PipeLine<unknown, unknown> {

    if (!pipeLineStore[ id ]) {
        pipeLineStore[ id ] = getNewPipeLine(id);
    }

    return pipeLineStore[ id ];
}

export function addPipeLine(pipeLine: PipeLine<unknown, unknown>, id?: string): string {

    if (id) {
        pipeLine.id = id;
    }
    id = pipeLine.id;

    if (!id) {
        throw new Error("No id set on pipeline and no id passed to 'addPipeLine', id is required");
    }

    if (pipeLineStore[ id ]) {
        throw new Error(`'${id}' already exists on 'pipeLineStore' -> not allowed, id must be unique
        Otherwise the pipeline graph edges can be ambiguous`);
    }

    pipeLineStore[ id ] = pipeLine;
    return id;
}

export function getNewPipeLine(id: string): PipeLine<unknown, unknown> {
    return {
        id: id,
        isTargetOf: async () => true,
        process: () => ''
    };
}

export function getAllPipeLines(): PipeLinesDict<unknown, unknown> {
    return pipeLineStore;
}