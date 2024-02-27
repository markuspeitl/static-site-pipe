import { getDefaultNodePipeLineGraph } from '../default-node-pipeline';
import { getDefaultPipeLineGraph } from '../default-pipeline';
import { PipeLineGraph, processWithPipeLineGraph } from '../processing-pipeline';



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


function customizeGraph(graph: PipeLineGraph): PipeLineGraph {

    graph;

    return graph;
}


const defaultPipeLineGraph = getDefaultNodePipeLineGraph({});
const graph = customizeGraph(graph);


const myDir = "./inputDir";
const processedResults = await processWithPipeLineGraph(myDir, defaultPipeLineGraph, {});

