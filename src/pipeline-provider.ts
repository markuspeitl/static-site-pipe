import { IoFunction } from './default-pipeline';
import { PipeLine, PipeLinesDict } from './pipeline-processing';



const pipeLineStore: PipeLinesDict = {};

export function getPipeLine(id: string): PipeLine {

    if (!pipeLineStore[ id ]) {
        pipeLineStore[ id ] = getNewPipeLine(id);
    }

    return pipeLineStore[ id ];
}

export function addPipeLine(pipeLine: PipeLine, id?: string): string {

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

export function getNewPipeLine(id: string): PipeLine {
    return {
        id: id,
        isTargetOf: async () => true,
        process: () => Promise.resolve('')
    };
}

export function getPipeLineFromFn(fn: IoFunction): PipeLine {
    return {
        id: fn.name,
        isTargetOf: async () => true,
        process: fn
    };
}

export function getAllPipeLines(): PipeLinesDict {
    return pipeLineStore;
}