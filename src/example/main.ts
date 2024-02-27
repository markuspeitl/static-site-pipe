import { getDefaultNodeConfig, getDefaultNodePipeLineGraph } from '../default-node-pipeline';
import { GlobalConfig } from '../global-config';
import { PipeLine, PipeLinesDict, processWithPipeLineGraph } from '../pipeline-processing';
import { getPipeLine } from '../pipeline-provider';



const pipeLineGraphEdges = {
    'dir': [
        'walk'
    ],
    'file': [
        'readFile'
    ],
    'template': [
        'readFile'
    ]
};


function getMyNewPipeLine(id: string = 'mycustomstage'): PipeLine {
    const pipeLine: PipeLine = getPipeLine('mycustomstage');
    pipeLine.process = (input: any) => {

        console.log(`Calling custom stage/mixin ${id} from 'customizeGraph'`);

        return input;
    };
    return pipeLine;
}

//Using the unique property of stages to inject one between them
function injectPipeLine(graph: PipeLine, startPipeId: string, endPipeId: string): PipeLine {
    const startPipeLine: PipeLine = getPipeLine(startPipeId);
    const customPipeLine = getMyNewPipeLine('injectcustomstage');
    const endPipeLine: PipeLine = getPipeLine(endPipeId);

    //Overwrites existing graph edges
    startPipeLine.next = customPipeLine;
    customPipeLine.next = endPipeLine;

    return graph;
}

//Direct graph manipulation
function customizeGraph(graph: PipeLine): PipeLine {
    const customPipeLine = getMyNewPipeLine('directcustomstage');

    const dirSubChain: PipeLinesDict | undefined = graph?.branches?.dir?.subchain;
    if (dirSubChain && customPipeLine.id) {
        dirSubChain[ customPipeLine.id ] = customPipeLine;
    }
    return graph;
}

const globalConfig: GlobalConfig = getDefaultNodeConfig();
const defaultPipeLineGraph: PipeLine = getDefaultNodePipeLineGraph(globalConfig);
const customPipeLineGraph = customizeGraph(defaultPipeLineGraph);
injectPipeLine(customPipeLineGraph, 'walk', 'directcustomstage');


const myDir = "./inputDir";
const processedResults = await processWithPipeLineGraph(myDir, customPipeLineGraph, globalConfig);

