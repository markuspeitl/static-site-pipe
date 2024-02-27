import { initializeDefaultPipeLines } from "./default-pipeline";
import { GlobalConfig, GlobalFunctions } from "./global-config";
import { PipeLine, PipeLineEntry, getPipeLineFromEntry } from "./processing-pipeline";
import { Nullable } from './util';

export interface GraphEdges {
    subchain?: GraphSubEdgesDict;
    branches?: GraphSubEdgesDict;
    next?: string | string[];
}
export type GraphSubEdgesDict = Record<string, GraphEdges | null>;

export function iterateDictConnect(edgesDict: GraphSubEdgesDict | null | undefined, globalConfig: GlobalFunctions, defaultConnType: string = 'next', currentKey = "default"): void {
    if (!edgesDict) {
        return;
    }
    for (const edgeTargetKey in edgesDict) {
        connectPipeLineGraph(edgesDict[ edgeTargetKey ], globalConfig, edgeTargetKey);
    }
}

export function connectPipeLineGraph(pipeLineGraphEdges: GraphEdges | null, globalConfig: GlobalFunctions, currentKey = "default"): PipeLine | null {

    if (!pipeLineGraphEdges) {
        return null;
    }

    const pipeLineProvider: (id: string) => PipeLineEntry = globalConfig.getPipeLine;
    const currentPipeEdges: GraphEdges = pipeLineGraphEdges;

    iterateDictConnect(currentPipeEdges.subchain, globalConfig, 'next', currentKey);
    iterateDictConnect(currentPipeEdges.branches, globalConfig, 'exitparent', currentKey);

    if (currentPipeEdges.next) {

    }


    /*subchain?: GraphSubEdgesDict;
    branches?: GraphSubEdgesDict;
    next?: string;*/

    //getPipeLine('dir')

    return pipeLineProvider('default') as PipeLine;
}

export function connectPipeLines(pipeEntry1: PipeLineEntry, pipeEntry2: PipeLineEntry): PipeLine | null {

    if (!pipeEntry1 || !pipeEntry2) {
        return null;
    }

    const pipeLine1 = getPipeLineFromEntry(pipeEntry1);

    if (pipeLine1) {

        const pipeLine2 = getPipeLineFromEntry(pipeEntry2);
        pipeLine1.next = pipeLine2;
        return pipeLine2;
    }

    return null;
}

export function chainPipeLines(...pipeLines: PipeLineEntry[]) {
    if (pipeLines.length <= 2) {
        return;
    }

    for (let index = 1; index < pipeLines.length; index++) {
        const currentPipeLine = pipeLines[ index ];
        connectPipeLines(pipeLines[ index - 1 ], currentPipeLine);
    }
}