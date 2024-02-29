import { getDefaultNodeConfig, getDefaultNodePipeLineGraph } from "../default-node-pipeline";
import { defaultPipeLineGraphEdges, initializeDefaultPipeLines } from "../default-pipeline";
import { GlobalConfig } from "../global-config";
import { PipeGraphEdges, PipeLineInfo, createPipeLineGraph, resolveImplicitEdges } from "../pipeline-connect";
import { runGraphNode } from "../pipeline-graph";
import { PipeLine, PipeLinesDict } from "../pipeline-processing";







const globalConfig: GlobalConfig = getDefaultNodeConfig();
//const defaultPipeLineGraph: PipeLine = getDefaultNodePipeLineGraph(globalConfig);
//const customPipeLineGraph = customizeGraph(defaultPipeLineGraph);
//injectPipeLine(customPipeLineGraph, 'walk', 'directcustomstage');

const pipeLinePool: PipeLinesDict = initializeDefaultPipeLines(globalConfig);

console.log(defaultPipeLineGraphEdges);

const explicitEdgesGraph: PipeGraphEdges | null = resolveImplicitEdges(defaultPipeLineGraphEdges);

if (explicitEdgesGraph) {
    const compiledPipeLineInfo: PipeLineInfo | null = createPipeLineGraph('default', explicitEdgesGraph, pipeLinePool, globalConfig);

    console.log(compiledPipeLineInfo);

    /*if (compiledPipeLineInfo) {
        const myDir = "./inputDir";
        runGraphNode(compiledPipeLineInfo.entry, myDir);
    }

    console.log(compiledPipeLineInfo);*/
}

//const myDir = "./inputDir";
//const processedResults = await processWithPipeLineGraph(myDir, customPipeLineGraph, globalConfig);

