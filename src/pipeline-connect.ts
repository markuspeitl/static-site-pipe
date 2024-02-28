import { ChainGraphEdges, ChainItems, GraphMeta, NodeReferences, PipeGraphEdges, ValidGraphIdentities, initializeDefaultPipeLines } from "./default-pipeline";
import { GlobalConfig, GlobalFunctions } from "./global-config";
import { PipeLine, PipeLinesDict, getPipeLineFromEntry } from './pipeline-processing';
import { getAllPipeLines } from "./pipeline-provider";
import { Nullable } from './utils/util';

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

// dir -> dir.start -> chain -> chain.start -> walkDir -> printDirFiles -> chain.next -> dir.next

//There are 2 options how the graph can be wired:
// 1. Only use nodes and the 'next' property to point towards the next nodes to move the output data to
// Problem with this is that the runtime graph has no knowledge of the nesting of the structure and
// it is necessary to keep track of the previous levels when wiring/building the graph to refer back to the end node 'next' property of a wrapping pipeline

//Parsing and wiring the graph is not so much a problem, but keeping track of the context is a bit difficult


export function resolveGraphEdges(pipeLineGraphEdges: PipeGraphEdges, parentGraphInfo: ValidGraphIdentities | null) {

    if (!pipeLineGraphEdges.graph) {
        pipeLineGraphEdges.graph = {};
    }

    const subGraphKeys: string[] = Object.keys(pipeLineGraphEdges.graph);

    if (!pipeLineGraphEdges.start) {

        if (!pipeLineGraphEdges.type) {
            pipeLineGraphEdges.type = null;
        }

        switch (pipeLineGraphEdges.type) {
            case 'distribute' || 'branch' || 'dist':
                pipeLineGraphEdges.start = subGraphKeys;
                break;
            case 'first':
                pipeLineGraphEdges.start = [ subGraphKeys[ 0 ] ];
                break;
            case 'last':
                pipeLineGraphEdges.start = [ subGraphKeys[ subGraphKeys.length - 1 ] ];
                break;
            default:
                pipeLineGraphEdges.start = [];
                break;
        }
    }

    return pipeLineGraphEdges;
}

export function getGraphEdges(pipeLineId: ValidGraphIdentities): PipeGraphEdges {
    if (typeof pipeLineId === 'string') {
        return {
            id: pipeLineId,
            start: [],
            next: []
        };
    }
    return pipeLineId;
}


export function resolveChainEdges(pipeLineGraphEdges: ChainGraphEdges, parentGraphInfo: ValidGraphIdentities | null) {
    if (pipeLineGraphEdges && pipeLineGraphEdges.items) {

        //pipeLineGraphEdges.items = pipeLineGraphEdges.items as ChainItems;


        //Convert items to pipline graph items
        for (let i = 0; i < pipeLineGraphEdges.items.length; i++) {
            const currentChainGraphItem = pipeLineGraphEdges.items[ i ];
            pipeLineGraphEdges.items[ i ] = getGraphEdges(currentChainGraphItem);
        }
        //pipeLineGraphEdges.items = pipeLineGraphEdges.items as PipeGraphEdges[];


        const itemsToChain: PipeGraphEdges[] = (pipeLineGraphEdges.items as PipeGraphEdges[]);
        const lastLinkingObj = Object.assign({}, pipeLineGraphEdges, {
            id: `${pipeLineGraphEdges.id}.next`
        });
        itemsToChain.push(lastLinkingObj);

        //Set next values according to position
        for (let i = 1; i < itemsToChain.length; i++) {
            const lastGraphItem = itemsToChain[ i - 1 ];
            const currentGraphItem = itemsToChain[ i ];

            addItemMakeArray(lastGraphItem, 'next', currentGraphItem.id);
        }

        const convertedPipeLineGraphEdges = (pipeLineGraphEdges as PipeGraphEdges);
        if (!convertedPipeLineGraphEdges.graph) {
            convertedPipeLineGraphEdges.graph = {};
        }

        for (let i = 1; i < pipeLineGraphEdges.items.length; i++) {
            const currentGraphItem = itemsToChain[ i ];

            if (!(pipeLineGraphEdges as PipeGraphEdges).graph) {
                convertedPipeLineGraphEdges.graph[ `${pipeLineGraphEdges.id}.${i}` ] = currentGraphItem;
            }
        }

        delete pipeLineGraphEdges.items;

        return convertedPipeLineGraphEdges;
    }

    return pipeLineGraphEdges;
}

function resolveSubgraphIds(resolvedGraph: PipeGraphEdges, namespace: string = "") {
    if (resolvedGraph.graph) {

        let namespacePrefix = "";
        if (namespace) {
            namespacePrefix = namespace + '.';
        }


        for (const subGraphKey in resolvedGraph.graph) {
            const subGraph = resolvedGraph.graph[ subGraphKey ] as GraphMeta;
            if (!subGraph.id) {
                subGraph.id = namespacePrefix + subGraphKey;
            }
        }
    }
}


function processSubGraphs(resolvedGraph: PipeGraphEdges, processingFn: any): void {
    if (resolvedGraph.graph) {
        for (const subGraphKey in resolvedGraph.graph) {
            const subGraph = resolvedGraph.graph[ subGraphKey ] as GraphMeta;

            processingFn(subGraphKey, subGraph, resolvedGraph);
        }
    }
}

function resolveEdgesOverwrite(key: string, subGraph: PipeGraphEdges, parentGraph: PipeGraphEdges) {
    const resolvedSubgraph = resolveImplicitEdges(subGraph, parentGraph);
    if (resolvedSubgraph && parentGraph.graph) {
        parentGraph.graph[ key ] = resolvedSubgraph;
    }
}

function resolveSubgraphs(resolvedGraph: PipeGraphEdges) {
    processSubGraphs(resolvedGraph, resolveEdgesOverwrite);
}




export function resolveImplicitEdges(pipeLineGraphEdges: ValidGraphIdentities, parentGraphInfo: ValidGraphIdentities | null): PipeGraphEdges | null {
    if (!pipeLineGraphEdges) {
        return null;
    }
    if (typeof pipeLineGraphEdges === 'string') {
        return getGraphEdges(pipeLineGraphEdges);
    }

    resolveChainEdges(pipeLineGraphEdges as ChainGraphEdges, parentGraphInfo);
    resolveGraphEdges(pipeLineGraphEdges as PipeGraphEdges, parentGraphInfo);

    //resolveSubgraphIds(resolvedGraph, (pipeLineGraphEdges as GraphMeta).id);
    resolveSubgraphIds(pipeLineGraphEdges);
    resolveSubgraphs(pipeLineGraphEdges);

    return pipeLineGraphEdges;
}

function stripGraphTargetsArray(pipeLine: PipeLine, targetKey: string) {

    if (pipeLine[ targetKey ] && pipeLine[ targetKey ].length > 0) {
        for (const pipeLineLinkedGraph of pipeLine[ targetKey ]) {
            stripAllGraphEdges(pipeLineLinkedGraph);
        }
    }

    pipeLine[ targetKey ] = [];
}

export function stripAllGraphEdges<Input, Output>(pipeLine: PipeLine): PipeLine {
    stripGraphTargetsArray(pipeLine, 'start');
    stripGraphTargetsArray(pipeLine, 'next');
    return pipeLine;
}

export function stripAllGraphEdgesOfProvider() {
    const allPipeLines = getAllPipeLines();
    for (const key in allPipeLines) {
        const pipeLine: PipeLine = allPipeLines[ key ];
        pipeLine.start = [];
        pipeLine.next = [];
    }
}


function wireRefsToPipelineTargets(currentGraphEdges: PipeGraphEdges, currentGraphPipe: PipeLine, edgesAndGraphKey: string, getPipeLineFn: any) {

    const pipeLineTargets: NodeReferences = currentGraphEdges[ edgesAndGraphKey ];

    currentGraphPipe.start = getArrayFrom(currentGraphPipe.start);
    if (pipeLineTargets) {
        for (const targetKey of pipeLineTargets) {
            const selectedTarget = getPipeLineFn(targetKey);

            currentGraphPipe.start.push(selectedTarget);
        }
    }
}

//Replace references to pipelines from edgesGraph in actual pipeline with actual references
function wireRefsOnPipelineProps(currentGraphEdges: PipeGraphEdges, currentGraphPipe: PipeLine, edgesAndGraphKeys: string[], getPipeLineFn: any) {

    for (const key of edgesAndGraphKeys) {
        wireRefsToPipelineTargets(currentGraphEdges, currentGraphPipe, key, getPipeLineFn);
    }
}

export function resolvePipeLineId(pipeLineId: string, pipeLinePool: PipeLinesDict): PipeLine | null {

    if (!pipeLineId || pipeLineId === 'root' || pipeLineId === 'default' || pipeLineId === 'top') {
        return pipeLinePool[ 'default' ];
    }

    if (pipeLinePool[ pipeLineId ]) {
        return pipeLinePool[ pipeLineId ];
    }

    if (pipeLineId.includes('.')) {
        const pathIdParts = pipeLineId.split('.');

        //const parentContext = pipeLinePool;
        let selectedPipeLine: PipeLine | null = pipeLinePool[ pathIdParts[ 0 ] ];
        for (const pipeLineId of pathIdParts) {
            selectedPipeLine = selectedPipeLine.graph[ pipeLineId ];
            if (!selectedPipeLine) {
                break;
            }
        }
        return selectedPipeLine;
    }
}

export function wireUpPipeLineGraph(edgesStructureGraph: PipeGraphEdges, pipeLinePool: PipeLinesDict): PipeLine | null {
    if (!edgesStructureGraph || !pipeLinePool) {
        return null;
    }

    const wiredPipeLine: PipeLine = {
        id: 'default',
        start: [],
        next: [],
        process: async () => {

        },
        isTargetOf: async () => {
            return true;
        }

    };

    const resolvedEdgesGraph: PipeGraphEdges | null = resolveImplicitEdges(edgesStructureGraph, null);



    return wiredPipeLine;
}

//pipeLineGraphEdges should stay immutable during wiring
export function connectPipeLineGraph(pipeLineGraphEdges: PipeGraphEdges, globalConfig: GlobalFunctions, currentKey = "default"): PipeLine | null {
    if (!pipeLineGraphEdges) {
        return null;
    }

    const getPipeLine: ((id: string) => PipeLine) | undefined = globalConfig.getPipeLine;
    if (!getPipeLine || getPipeLine === undefined) {
        return null;
    }

    if (!pipeLineGraphEdges.id) {
        return null;
    }

    const currentPipeLine: PipeLine = getPipeLine(pipeLineGraphEdges.id);
    //const pipeLineTargets: NodeReferences = pipeLineGraphEdges.start;

    const explicitEdgesGraph: PipeGraphEdges | null = resolveImplicitEdges(pipeLineGraphEdges, null);
    if (!explicitEdgesGraph) {
        return null;
    }

    wireRefsOnPipelineProps(pipeLineGraphEdges, currentPipeLine, [ 'start', 'next' ], getPipeLine);

    function connectSubGraphs(key: string, subGraph: PipeGraphEdges, parentGraph: PipeGraphEdges) {

        if (getPipeLine) {
            //const currentPipeLine: PipeLine = getPipeLine(key);
            connectPipeLineGraph(subGraph, globalConfig, currentPipeLine.id);
        }
        /*const resolvedSubgraph = resolveImplicitEdges(subGraph, parentGraph);
        if (resolvedSubgraph && parentGraph.graph) {
            parentGraph.graph[ key ] = resolvedSubgraph;
        }*/
    }
    processSubGraphs(explicitEdgesGraph, connectSubGraphs);



    return currentPipeLine;

    /*if ((pipeLineGraphEdges as ChainGraphEdges).items) {
        
    }*/


    /*for (const subGraph of currentPipeLine.graph.) {

    }*/



    /*const pipeLineProvider: (id: string) => PipeLineEntry = globalConfig.getPipeLine;
    const currentPipeEdges: NodeReferences = pipeLineGraphEdges;

    iterateDictConnect(currentPipeEdges.subchain, globalConfig, 'next', currentKey);
    iterateDictConnect(currentPipeEdges.branches, globalConfig, 'exitparent', currentKey);

    if (currentPipeEdges.next) {

    }*/


    /*subchain?: GraphSubEdgesDict;
    branches?: GraphSubEdgesDict;
    next?: string;*/

    //getPipeLine('dir')

    //return pipeLineProvider('default') as PipeLine;
}

export function connectPipeLines(pipeEntry1: PipeLine, pipeEntry2: PipeLine): PipeLine | null {

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

export function chainPipeLines(...pipeLines: PipeLine[]) {
    if (pipeLines.length <= 2) {
        return;
    }

    for (let index = 1; index < pipeLines.length; index++) {
        const currentPipeLine = pipeLines[ index ];
        connectPipeLines(pipeLines[ index - 1 ], currentPipeLine);
    }
}