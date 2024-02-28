import { ChainGraphEdges, ChainItems, GraphMeta, LinkGraphValue, NodeReferences, PipeGraphEdges } from "./default-pipeline";
import { GlobalConfig, GlobalFunctions } from "./global-config";
import { IGraphNode } from "./pipeline-graph";
import { PipeLine, PipeLinesDict } from './pipeline-processing';
import { getAllPipeLines, getNewPipeLine } from "./pipeline-provider";
import { Nullable, addItemMakeArray, getArrayFrom } from './utils/util';

/*export interface GraphEdges {
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
}*/

// dir -> dir.start -> chain -> chain.start -> walkDir -> printDirFiles -> chain.next -> dir.next

//There are 2 options how the graph can be wired:
// 1. Only use nodes and the 'next' property to point towards the next nodes to move the output data to
// Problem with this is that the runtime graph has no knowledge of the nesting of the structure and
// it is necessary to keep track of the previous levels when wiring/building the graph to refer back to the end node 'next' property of a wrapping pipeline

//Parsing and wiring the graph is not so much a problem, but keeping track of the context is a bit difficult


function resolveStartTargetKeys(pipeLineGraphEdges: PipeGraphEdges) {
    if (!pipeLineGraphEdges.graph) {
        pipeLineGraphEdges.graph = {};
    }
    const subGraphKeys: string[] = Object.keys(pipeLineGraphEdges.graph);

    if (!pipeLineGraphEdges.type) {
        pipeLineGraphEdges.type = null;
    }

    switch (pipeLineGraphEdges.type) {
        case 'distribute' || 'branch' || 'dist':
            return subGraphKeys;
        case 'first':
            return [ subGraphKeys[ 0 ] ];
        case 'last':
            return [ subGraphKeys[ subGraphKeys.length - 1 ] ];
    }
    return [];
}

function getGraphPath(node?: { parent?: { id?: string; }; }): string {
    if (!node) {
        return '';
    }

    let currentLevel: any = node;
    const pathParts: string[] = [];
    if (currentLevel.id) {
        pathParts.push(currentLevel.id);
    }
    while (currentLevel.parent) {
        currentLevel = currentLevel.parent;

        if (currentLevel.id) {
            pathParts.push(currentLevel.id);
        }
    }
    return pathParts.reverse().join('.');
}

function resolveEndTargetKey(nextId: string | null | undefined, pipeLineGraphEdges: PipeGraphEdges): string {
    if (nextId === undefined || nextId === 'default') {

        if (!pipeLineGraphEdges.parent) {
            throw new Error('Error: can not link to parent of ${pipeLineGraphEdges.id} in resolveEndTargetKey');
        }

        return getGraphPath(pipeLineGraphEdges.parent) + ".end";
    }

    if (nextId === 'exit') {
        return 'null';
    }

    if (nextId === 'exitparent') {
        return getGraphPath(pipeLineGraphEdges.parent?.parent) + ".end";
    }

    return String(nextId);
}

function resolveEndTargetKeys(pipeLineGraphEdges: PipeGraphEdges): string[] {
    const nextTargets = getArrayFrom(pipeLineGraphEdges.next);
    return nextTargets.map((targetId) => resolveEndTargetKey(targetId, pipeLineGraphEdges));
}

export function createVirtualNode(graphEdges: PipeGraphEdges, graphNodeId: string, connectedNext: string[]) {

    if (graphEdges.graph) {
        if (!graphEdges.graph[ graphNodeId ]) {
            graphEdges.graph[ graphNodeId ] = {
                next: connectedNext
            };
        }
    }
}

export function createResolveStartEndEdgesFor(graphEdges: PipeGraphEdges): void {

    graphEdges.start = resolveStartTargetKeys(graphEdges);
    graphEdges.next = resolveEndTargetKeys(graphEdges);

    if (graphEdges.graph) {


        //Does not happen if already set (-> user responsible for start and end node management then)
        createVirtualNode(graphEdges, 'start', graphEdges.start);
        createVirtualNode(graphEdges, 'end', graphEdges.next);
        delete graphEdges.start;
        //delete graphEdges.next;
        graphEdges.next = graphEdges.id + '.start';
    }
}

export function resolveGraphEdges(pipeLineGraphEdges: PipeGraphEdges, parentGraphInfo: LinkGraphValue | null) {

    if (!pipeLineGraphEdges.graph) {
        pipeLineGraphEdges.graph = {};
    }

    createResolveStartEndEdgesFor(pipeLineGraphEdges);

    //const subGraphKeys: string[] = Object.keys(pipeLineGraphEdges.graph);
    //const startRefs: string[] = resolveStartTargetKeys(pipeLineGraphEdges);
    //const nextRefs: string[] = resolveEndTargetKeys(pipeLineGraphEdges);

    return pipeLineGraphEdges;
}

export function getGraphEdges(pipeLine: LinkGraphValue): PipeGraphEdges {
    if (typeof pipeLine === 'string') {
        return {
            id: pipeLine,
            next: []
        };
    }
    if ((pipeLine as ChainGraphEdges).items) {
        return resolveChainToGraph(pipeLine);
    }

    return pipeLine;
}


export function chainItemsToNodes(items: ChainItems) {
    if (!items) {
        return null;
    }
    return items.map((item: LinkGraphValue) => getGraphEdges(item));
}


export function resolveChainToGraph(graphEdges: ChainGraphEdges): PipeGraphEdges {
    if (graphEdges && graphEdges.items) {

        //Convert items to pipline graph items
        const chainItemsAsGraphEdges: PipeGraphEdges[] | null = chainItemsToNodes(graphEdges.items);
        if (!chainItemsAsGraphEdges) {
            return graphEdges;
        }

        const chainItemsIdPaths = chainItemsAsGraphEdges.map((graphEdges: PipeGraphEdges) => getGraphPath(graphEdges));

        for (let i = 1; i < chainItemsAsGraphEdges.length; i++) {
            const lastGraphItem = chainItemsAsGraphEdges[ i - 1 ];
            const curItemPath = chainItemsIdPaths[ i ];
            addItemMakeArray(lastGraphItem, 'next', curItemPath);
        }
        delete graphEdges.items;

        const pipeGraphEdges = (graphEdges as PipeGraphEdges);

        if (!pipeGraphEdges.graph) {
            pipeGraphEdges.graph = {};
        }

        for (const [ index, graphNodePath ] of chainItemsIdPaths.entries()) {
            pipeGraphEdges.graph[ graphNodePath ] = chainItemsAsGraphEdges[ index ];
        }
    }

    return graphEdges;
}

export function resolveSpecialElements(graphEdges: LinkGraphValue): PipeGraphEdges {
    return resolveChainToGraph(graphEdges as ChainGraphEdges);
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

            subGraph.parent = resolvedGraph;

            processingFn(subGraph, subGraphKey, resolvedGraph);
        }
    }
}

function resolveEdgesOverwrite(key: string, subGraph: PipeGraphEdges, parentGraph: PipeGraphEdges) {
    const resolvedSubgraph = resolveImplicitEdges(subGraph, parentGraph);
    if (resolvedSubgraph && parentGraph.graph) {
        parentGraph.graph[ key ] = resolvedSubgraph;
    }
}

/*function resolveSubgraphs(resolvedGraph: PipeGraphEdges) {
    processSubGraphs(resolvedGraph, resolveEdgesOverwrite);
}*/

export function resolveImplicitEdges(pipeLineGraphEdges: LinkGraphValue, parentGraphInfo: LinkGraphValue | null): PipeGraphEdges | null {
    if (!pipeLineGraphEdges) {
        return null;
    }
    if (typeof pipeLineGraphEdges === 'string') {
        return getGraphEdges(pipeLineGraphEdges);
    }

    resolveSpecialElements(pipeLineGraphEdges as ChainGraphEdges);
    resolveGraphEdges(pipeLineGraphEdges as PipeGraphEdges, parentGraphInfo);

    //resolveSubgraphIds(resolvedGraph, (pipeLineGraphEdges as GraphMeta).id);
    resolveSubgraphIds(pipeLineGraphEdges);
    processSubGraphs(pipeLineGraphEdges, resolveEdgesOverwrite);
    //resolveSubgraphs(pipeLineGraphEdges);

    return pipeLineGraphEdges;
}

//export function createStartEndNodesFromScope(pipeLineGraphEdges: LinkGraphValue)

//chains and implicit edges need to be resolved: resolveImplicitEdges
export function walkGraphEdgesTree(rootPipeLineEdges: PipeGraphEdges, processPipeLineFn: (currentPipeEdges: PipeGraphEdges) => any): any {

    const subResults: any[] = [];

    if (rootPipeLineEdges.graph) {

        for (const key in rootPipeLineEdges) {
            const currentSubGraph = rootPipeLineEdges[ key ];

            const processSubResults = processPipeLineFn(currentSubGraph);
            subResults.push(processSubResults);

            walkGraphEdgesTree(currentSubGraph, processPipeLineFn);
        }
    }

    return subResults;
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
        //pipeLine.start = [];
        pipeLine.next = [];
    }
}


function cvtIdsToPipelineRefs(graphEdges: PipeGraphEdges, targetPipeLine: PipeLine, edgesAndGraphKey: string, pipeLinesPool: PipeLinesDict) {

    const pipeLineTargets: NodeReferences = graphEdges[ edgesAndGraphKey ];
    if (!pipeLineTargets) {
        return;
    }

    for (const pipeRefKey of pipeLineTargets) {
        const pipeReference = pipeLinesPool[ pipeRefKey ];
        addItemMakeArray(targetPipeLine, edgesAndGraphKey, pipeReference);
    }
}

//Replace references to pipelines from edgesGraph in actual pipeline with actual references
function cvtIdsToPipelineRefsOnProps(currentGraphEdges: PipeGraphEdges, currentGraphPipe: PipeLine, edgesAndGraphKeys: string[], pipeLinesPool: PipeLinesDict) {

    for (const key of edgesAndGraphKeys) {
        cvtIdsToPipelineRefs(currentGraphEdges, currentGraphPipe, key, pipeLinesPool);
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

            if (selectedPipeLine.namespace) {
                selectedPipeLine = selectedPipeLine.namespace[ pipeLineId ];
            }
            if (!selectedPipeLine.namespace) {
                return null;
            }
            if (!selectedPipeLine) {
                return null;
            }
        }
        return selectedPipeLine;
    }
    return null;
}

/*export function compilePipeLineGraph(id: string, edgesStructureGraph: PipeGraphEdges, pipeLineImplPool: PipeLinesDict): PipeLine | null {
    if (!edgesStructureGraph || !pipeLineImplPool) {
        return null;
    }

    if (!id) {
        id = 'default';
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
}*/

export interface PipeLineInfo {
    entry: PipeLine,
    pool?: PipeLinesDict,
    config?: GlobalConfig,
    edges?: PipeGraphEdges;
    origEdges?: PipeGraphEdges;
}

export function cvtEdgesToLinkedGraph(id: string, graphEdges: PipeGraphEdges, pipeLinesPool: PipeLinesDict, globalConfig: GlobalConfig): PipeLineInfo | null {

    if (!graphEdges) {
        return null;
    }
    if (!id) {
        id = 'default';
    }

    if (!pipeLinesPool[ id ]) {
        pipeLinesPool[ id ] = getNewPipeLine(id);
    }
    let currentPipeLine: PipeLine = pipeLinesPool[ id ];

    if ((currentPipeLine as any).start) {
        throw new Error(`Pipeline ${id} can not have the 'start' property -> must be resolved PipeGraphEdges, which shouls consist of nodes with next prop only`);
    }

    if (globalConfig.immutablePool) {
        pipeLinesPool = structuredClone(pipeLinesPool);
    }

    /*if (currentPipeLine.graph[ 'start' ]) {
        currentPipeLine.next = currentPipeLine.graph[ 'start' ];
    }
    if (currentPipeLine.graph[ 'end' ]) {
        currentPipeLine.graph[ 'end' ].next = currentPipeLine.next
    }*/
    cvtIdsToPipelineRefs(graphEdges, currentPipeLine, 'next', pipeLinesPool);

    function connectSubGraphs(subGraph: PipeGraphEdges, key: string, parentGraph: PipeGraphEdges) {
        //const currentPipeLine: PipeLine = getPipeLine(key);

        const currentNodePath = getGraphPath(subGraph);
        createPipeLineGraph(currentNodePath, subGraph, pipeLinesPool, globalConfig);
        /*const resolvedSubgraph = resolveImplicitEdges(subGraph, parentGraph);
        if (resolvedSubgraph && parentGraph.graph) {
            parentGraph.graph[ key ] = resolvedSubgraph;
        }*/
    }
    processSubGraphs(graphEdges, connectSubGraphs);

    const pipeLineInfo: PipeLineInfo = {
        entry: currentPipeLine,
        pool: pipeLinesPool,
        config: globalConfig,
        edges: graphEdges
    };

    return pipeLineInfo;
}
export function createPipeLineGraph(id: string, graphEdges: PipeGraphEdges, pipeLinesPool: PipeLinesDict, globalConfig: GlobalConfig): PipeLineInfo | null {
    if (!graphEdges) {
        return null;
    }
    if (!id) {
        id = 'default';
    }
    /*if (!graphEdges.id) {
        return null;
    }*/

    const originalGraphEdges = structuredClone(graphEdges);


    if (!pipeLinesPool[ id ]) {
        let newPipe: PipeLine = getNewPipeLine(id);
        pipeLinesPool[ id ] = newPipe;
    }

    const currentPipeLine: PipeLine = pipeLinesPool[ id ];

    const explicitEdgesGraph: PipeGraphEdges | null = resolveImplicitEdges(graphEdges, null);
    if (!explicitEdgesGraph) {
        return null;
    }

    const pipeLineInfo: PipeLineInfo | null = cvtEdgesToLinkedGraph(id, graphEdges, pipeLinesPool, globalConfig);

    if (pipeLineInfo) {
        pipeLineInfo.origEdges = originalGraphEdges;
    }

    return structuredClone(pipeLineInfo);
}
