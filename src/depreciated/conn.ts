
    /*wireRefsOnPipelineProps(graphEdges, currentPipeLine, [ 'start', 'next' ], getPipeLine);

    function connectSubGraphs(key: string, subGraph: PipeGraphEdges, parentGraph: PipeGraphEdges) {

        if (getPipeLine) {
            //const currentPipeLine: PipeLine = getPipeLine(key);
            connectPipeLineGraph(key, subGraph, globalConfig);
        }
    
    }
    processSubGraphs(explicitEdgesGraph, connectSubGraphs);

    return currentPipeLine;*/
}
/*const resolvedSubgraph = resolveImplicitEdges(subGraph, parentGraph);
    if (resolvedSubgraph && parentGraph.graph) {
        parentGraph.graph[ key ] = resolvedSubgraph;
    }*/

//pipeLineGraphEdges should stay immutable during wiring
/*export function connectPipeLineGraph(id: string, pipeLineGraphEdges: PipeGraphEdges, globalConfig: GlobalFunctions): PipeLine | null {
    if (!pipeLineGraphEdges) {
        return null;
    }
    if (!id) {
        id = 'default';
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
            connectPipeLineGraph(key, subGraph, globalConfig);
        }
        /const resolvedSubgraph = resolveImplicitEdges(subGraph, parentGraph);
        if (resolvedSubgraph && parentGraph.graph) {
            parentGraph.graph[ key ] = resolvedSubgraph;
        }
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
//}

/*export function connectPipeLines(pipeEntry1: PipeLine, pipeEntry2: PipeLine): PipeLine | null {

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
}*/

/*export function getFlatGraphNodes(pipeLineGraphEdges: PipeGraphEdges): PipeLinesDict {
    const compiledNodes: PipeLinesDict = {};

    function handleNode(currentPipeEdges: PipeGraphEdges) {

        if (!currentPipeEdges.id) {
            currentPipeEdges.id = 'default'
        }

        const convertedPipeLine: PipeLine = {
            isTargetOf: currentPipeEdges
        }

        compiledNodes[ currentPipeEdges.id ] = currentPipeEdges;
    }

    walkGraphEdgesTree(pipeLineGraphEdges, handleNode);

    return compiledNodes;
}*/
