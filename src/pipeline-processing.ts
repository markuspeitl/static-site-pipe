import { addItemMakeArray } from './pipeline-connect';
import { getNewPipeLine } from './pipeline-provider';
import { getArrayFrom, ItemArrayOrNull, mergePropsToArray, multiplyIfArrayAsync, Nullable, SingleOrArray } from './utils/util';

export type ProcessingFunction<InputType> = (input: InputType) => Promise<InputType>;

export interface PipeLineProcessor<InputType> {
    //perform processing operations on data with this stage
    process: ProcessingFunction<InputType>;

    //Basically an entry guard (rejects the input if it does not match)
    isTargetOf?(input: InputType): Promise<boolean>;
}


/*export interface PipeLine<InputType, OutputType> extends PipeLineProcessor<InputType> {
    id?: string;
    start?: SingleOrArray<PipeLine<InputType, any>>;
    next?: SingleOrArray<PipeLine<OutputType, any>>;
}
export type PipeLinesDict<InputType, OutputType> = Record<string, PipeLine<InputType, OutputType>>;*/

export interface PipeLine extends PipeLineProcessor<any> {
    id?: string;
    start?: SingleOrArray<PipeLine>;
    next?: SingleOrArray<PipeLine>;

    //All pipelines contained in this stage, (in no particular order as the 'next' property is used to reach the stages contained)
    pool?: PipeLinesDict;
}
export type PipeLinesDict = Record<string, PipeLine>;


//Maybe wrap .process during execution and keep track of some metadata in the wrapper
//(example: data pipeline history, data source -> how did the data look like before its transformations)

//Maybe make it possible for "start and next" to be functions -> dynamically reorder/rewire graph


//Branching behaviours:
//subchain -> start at 1st element and iterate through chain passing in result of the previous stage -> return result of the subchain

//input state options: input of pipeline / output of subchain

//PipeLine is an abstraction of the processing subgraph of the pipeLine which is executed with .process
//Types of nodes in a graph:
//one to one node (passthrough / chaining node) -> receive input from one other node and output to one other node
//fork/distributer node -> receive input from nodes and distribute to multiple other nodes
//receiver/collector node -> receive input from serveral nodes and output to one node
//skipable nodes -> node processing can be skipped when condition applies (input data of certain, type shape or node disabled, .etc)


//Internal pipeline: no concept of subchain, branches and next.
// Rather: source -> graph -> sink
// Source and sink are vitual elements and required.
// If no elements are in the sub graph then source and sink are connected
// data is passed into the pipeline source and taken out the pipeline sink through the .process function
// Each pipeline represents a node and can be in another graph

//Cicles are allowed, but discouraged (may result in an infinite recursion loop if the 'cicle break' condition is not properly defined)



async function processOutputToInput(input: any, inputProcessors: any[], processInput: (inputProcessor: any, input: any) => any, skipUndefinedOutput: boolean = true): Promise<any> {

    if (!inputProcessors || inputProcessors.length === 0) {
        return input;
    }

    let currentInput: any = input;
    let currentOutput = undefined;

    for (const processor of inputProcessors) {
        currentOutput = await processInput(processor, currentInput);

        if (currentOutput !== undefined || !skipUndefinedOutput) {
            currentInput = currentOutput;
        }
    }

    return currentOutput;
}


async function callPipeLineProcess(input: any, pipeLineEntry: PipeLineEntry): Promise<any> {
    const pipeLine = getPipeLineFromEntry(pipeLineEntry);

    if (!pipeLine.isTargetOf || await pipeLine.isTargetOf(input)) {
        //Not proper yet -> if one of the 'input' elements fails to process this stops processing
        const processingResult = await multiplyIfArrayAsync(pipeLine.process, input);
        return processingResult;
    }

    return undefined;
}

async function processWithPipeLine(input: any, pipeLine: PipeLineEntry): Promise<any> {

    if (!pipeLine) {
        return input;
    }

    const processingFnsStack: PipeLineEntry[] = mergePropsToArray(pipeLine, [ '', 'partialPipeLines', 'nextAfter' ]);

    if (!processingFnsStack) {
        return input;
    }

    if (processingFnsStack.length <= 1) {
        return await callPipeLineProcess(input, pipeLine);
    }

    return await processStages(input, processingFnsStack);
}

//Select sub pipeline to process through isTargetOf (branching)
async function processWithTargeted(input: any, pipeLineOptions: PipeLinesDict): Promise<any> {
    for (const pipeLineId in pipeLineOptions) {
        return processWithPipeLine(input, pipeLineOptions[ pipeLineId ]);
        /*if (result) {
            return result;
        }*/
    }
    return input;
}

//Chain sub pipelines in series to get pipeline result
function processStages(input: any, pipeLineStages: PipeLineEntry[]) {
    return processOutputToInput(input, pipeLineStages, processWithPipeLine);
}

export function getPipeLineFromEntry(pipeLineEntry?: PipeLineEntry, id?: string): PipeLine {
    if (typeof pipeLineEntry === 'object' && pipeLineEntry.process !== undefined) {
        return pipeLineEntry;
    }
    else if (typeof pipeLineEntry === 'function' && id) {

        //If 'isTargetOf' is not defined it is true by default
        return {
            id: id,
            isTargetOf: async () => true,
            process: pipeLineEntry
        };
    }

    throw new Error(`Invalid pipeLine in 'getPipeLine' needs to have .process method or be a function, was: ${pipeLineEntry}`);
}

export async function processWithPipeLineGraph(input: any, pipeLineEntry: Nullable<PipeLineEntry>, options?: any): Promise<any> {
    //let graph = options.graph;
    /*if (!graph) {
        graph = getDefaultBaseGraph(options);
    }*/
    if (!pipeLineEntry) {
        return null;
    }
    const pipeLine: PipeLine = getPipeLineFromEntry(pipeLineEntry);
    return await pipeLine.process(input);
    //return await processWithTargeted(input, pipeLine);
}


//Assume that 'pipeLine' is an explicit graph (no implicit context derived edges -> data at the pipeLines next node can be detected if the last pipelines next references to it)
/*export async function startProcessRun(pipeLine: PipeLine, input: any): Promise<any> {
    const transformedInput = pipeLine.process(input);

    const startTargetNodes: SingleOrArray<PipeLine> | undefined = pipeLine.start;

    //const sendNextNodes: SingleOrArray<PipeLine> | undefined = pipeLine.start;
    const nextNode;

    if (startTargetNodes) {

    }
}*/


/*
function createStartNode(pipeLine: PipeLine) {
    //const startBranchResults: any[] = [];
    const startTargetNodes: PipeLine[] | undefined = getArrayFrom(pipeLine.start);

    const nodeOutput: any[] = [];

    const startNode = {
        feed: (input: any) => {
            if (startTargetNodes) {
                for (const targetNode of startTargetNodes) {
                    const branchResult = await targetNode.process(input);
                    nodeOutput.push(branchResult);
                }
            }
        },
        read: () => {
            return nodeOutput;
        }
    };

    const nextNodes: PipeLine[] | undefined = getArrayFrom(pipeLine.next);
    let nextOutput: any[] = nodeOutput;

    const inputs: any[] = [];
    const nextNode = {
        inputs: inputs,
        set: (input: any) => {
            inputs.push(input);
        },
        run: () => {

            nextOutput = [];

            if (nextNodes) {
                for (const targetNode of nextNodes) {
                    for (const input of inputs) {
                        targetNode.node.set(input);
                    }
                }
                for (const targetNode of nextNodes) {
                    const branchResult = await targetNode.node.run(input);
                    nextOutput.push(branchResult);
                }
            }
        },
        read: () => {
            return nextOutput;
        }
    };

    return startNode;
}

/*interface GraphNode {
    add(input: any): Promise<void>;
    run(): Promise<any>;
    read(): Promise<any>;
}*/

export function getNode(connectedNodes: GraphNode[] | undefined, processingFn: any): GraphNode {
    //const connectedNodes: GraphNode[] | undefined = connectedNodes;

    let output: any[] = [];
    const inputs: any[] = [];
    const node = {
        inputs: inputs,
        add: async (input: any) => {
            inputs.push(input);
        },
        run: async () => {
            output = [];
            //inputs = [];
            if (!connectedNodes) {
                return inputs;
            }

            const processingResults = await processingFn(inputs);

            for (const nextNode of connectedNodes) {
                for (const input of processingResults) {
                    nextNode.add(input);
                }
            }

            for (const nextNode of connectedNodes) {
                const nextNodeResult = await nextNode.run();
                output.push(nextNodeResult);
            }

            return output;
        },
        read: async () => {
            return output;
        }
    };

    return node;
}

function nodeFromPipeline(currentPipeLine: PipeLine, connectedPipeLines: SingleOrArray<PipeLine>) {
    let connected = getArrayFrom(connectedPipeLines);

    return getNode(connected, currentPipeLine.process);
}

function clearOutgoingEdges(targetPipeLine: PipeLine): void {

}* /;;



/*function getCollectionPipeLine() {
    const collectedResults: any[] = [];
    const pipeLine = getNewPipeLine('next');
    pipeLine.process = async (input: any) => {
        collectedResults.push(input);
    };
}*/


function isNextOfPrevious() {
    //If the edge going from the last element originated from the 'next' node -> skip start nodes
    if (previousPipeLine.next === pipeLine) {

    }
}





export interface GraphNode extends PipeLineProcessor<any> {
    next?: GraphNode | null;
}

export interface IEndNode extends GraphNode {
    data: any | any[] | null;
}

export interface ScopedNode extends GraphNode {
    start: GraphNode | null;
    end: GraphNode | null;
}

export class EndNode implements IEndNode {
    data: any | any[] | null = null;
    next?: GraphNode | null | undefined;

    constructor (parentNode: ScopedNode) {
        /*if (parentNode.next) {
            this.next = parentNode.next;
        }*/
        parentNode.end = this;
    }

    async process(input: any): Promise<any | any[] | null> {

        if (!this.data) {
            this.data = input;
        } else if (!Array.isArray(this.data)) {
            this.data = [ this.data ];
        } else {
            this.data.push(input);
        }

        return this.data;
    }

    async isTargetOf?(input: any): Promise<boolean> {
        return true;
    }
}
export class StartNode implements GraphNode {
    next?: GraphNode | null | undefined;

    constructor (parentNode: ScopedNode) {
        if (parentNode.next) {
            this.next = parentNode.next;
        }
        parentNode.end = this;
    }

    async process(input: any): Promise<any | any[] | null> {
        return input;
    }

    async isTargetOf?(input: any): Promise<boolean> {
        return true;
    }
}

/*export class GraphScopedNode implements ScopedNode { 
}*/



function isScopeNode(node: any | ScopedNode): boolean {
    return Boolean(node.start) && Boolean(node.end);
}
function isEndNode(node: any | EndNode): boolean {
    return Boolean(node.data);
}

async function canProcess(node, inputData: any) {
    return node.isTargetOf(inputData);
}


//3 types of node:
//GraphNode: Common node -> can process input data and has a 'next' property pointing to the nodes it is connected to
//EndNode: Acts as a common node, but has a data property in which processed data passing through it is collected
//ScopedNode: Is a node that 'contains' another node path, thise scoping behaviour is simulated by having a special 'start' node at the beginning of the scope
// and an 'end' node at the end of the scope (the result of the subpath can be read through 'end' and new data can be put into it with 'start')

//Nodes that do not have graph items do not need a 'start' or 'end' node
//Though for consistencies sake insert (and optimize later)
async function runThroughNodeChain(pipeLine: PipeLine, inputData: any) {
    let processedInput: any = pipeLine.process(inputData);

    if (isScopeNode(pipeLine)) {
        processedInput = runGraphNode(pipeLine as ScopedNode, processedInput);
    }

    const nextPipeLineTargets: PipeLine[] | undefined = getArrayFrom(pipeLine.next);
    //const nodeOutput: any[] = [];
    if (nextPipeLineTargets) {
        for (const targetNode of nextPipeLineTargets) {
            const branchNextResult = await runWithPipeline(processedInput, targetNode, pipeLine);
            /*if (pipeLineResults) {
                addItemMakeArray(pipeLineResults, targetNode.id, branchNextResult);
            }*/
        }
    }
}

async function runGraphNode(pipeLineNode: GraphNode, inputData: any) {

    /*if (isEndNode(pipeLineNode)) {
        return (pipeLineNode as EndNode).data;
    }*/

    if (!isScopeNode(pipeLineNode)) {
        return runThroughNodeChain(pipeLineNode as PipeLine, inputData);
    }

    if (!canProcess(pipeLineNode, inputData)) {
        return inputData;
    }

    const node = pipeLineNode as ScopedNode;
    const processedInput = await node.process(inputData);

    if (!node.next) {
        return processedInput;
    }

    const startNode = node.start; //or default start node
    const endNode: EndNode = node.end as EndNode; //or default end node

    if (!startNode) {
        return processedInput;
    }

    //Split open path between endNode and the next Node
    const nextAfterEndNode: GraphNode | null | undefined = endNode?.next;

    if (nextAfterEndNode) {
        endNode.next = null;
        endNode.data = null;
    }

    //Process path starting from start until termination (processedOutput can be from any node, also not of this subgraph -> !== endNode.data)
    const processedOutput = runGraphNode(startNode, processedInput);

    if (!endNode) {
        return processedOutput;
    }

    if (!nextAfterEndNode) {
        return endNode?.data;
    }

    //Restore path between endnode and the next path
    endNode.next = nextAfterEndNode;
    //Start processing in next path
    const nextPathOutput = runGraphNode(endNode, endNode.data);
    //return nextPathOutput;
    return endNode?.data;
}


/*
async function runWithPipeline(inputData: any, pipeLine: PipeLine, pipeLineResults: Record<string, any> = {}): Promise<any> {

    //Only clear toplevel pipeLine call
    //const clonedPipeLine = pipeLine.clone();
    //clearOutgoingEdges(clonedPipeLine);

    const graphNodeResults: any[] = [];

    const nextPipeLineTargets: PipeLine[] | undefined = getArrayFrom(pipeLine.next);

    //Insert virtual node before leaving edges (collect results of processing)
    pipeLine.next = getNewPipeLine('next');
    pipeLine.next.process = async (graphNodeResult: any) => {
        graphNodeResults.push(graphNodeResult);
    };


    const preProcessedInput = pipeLine.process(inputData);


    const nextPipeLineTargets: PipeLine[] | undefined = getArrayFrom(pipeLine.next);
    //const nodeOutput: any[] = [];
    if (nextPipeLineTargets) {
        for (const targetNode of nextPipeLineTargets) {
            const branchNextResult = await runWithPipeline(preProcessedInput, targetNode, pipeLine);
        }
    }


    pipeLine.next = nextPipeLineTargets;
    if (pipeLineResults) {
        addItemMakeArray(pipeLineResults, pipeLine.id, graphNodeResults);
    }

    return graphNodeResults;

    //If origin is not next of previous node (as then it would cycle back to start -> infinite loop)
    if (!isNextOfPrevious(pipeLine, previousPipeLine)) {

        const startTargetNodes: PipeLine[] | undefined = getArrayFrom(pipeLine.start);
        //const nodeOutput: any[] = [];
        if (startTargetNodes) {
            for (const targetNode of startTargetNodes) {
                const branchNextResult = await runWithPipeline(preProcessedInput, targetNode, pipeLine, pipeLineResults);
            }
        }
    }

    if (nextPipeLineTargets) {
        for (const targetNode of nextPipeLineTargets) {

            //const previousPipeLine = 
            const nextPipeLineResult = await runWithPipeline(targetNode, pipeLine, pipeLineResults);
        }
    }

    pipeLine.next = nextPipeLineTargets;


    if (pipeLineResults) {
        addItemMakeArray(pipeLineResults, pipeLine.id, graphNodeResults);
    }

    return graphNodeResults;
}*/

function* pipeLinePathCollectionNodes(pipeLine: PipeLine, targetCollectionKey: string) {
    const pipeLines: PipeLine[] | undefined = getArrayFrom(pipeLine[ targetCollectionKey ]);
    if (pipeLines) {
        for (const item of pipeLines) {
            yield* pipeLinePathNodes(item);
            yield item;
        }
    }
}

function* pipeLinePathNodes(pipeLine: PipeLine) {
    if (!pipeLine.start && !pipeLine.next) {
        return;
    }

    yield* pipeLinePathCollectionNodes(pipeLine, 'start');
    yield* pipeLinePathCollectionNodes(pipeLine, 'next');
}

function clearPipelineEscapeEdges(pipeLine: PipeLine) {
    //const pipeLineId: string = pipeLine.id;
    //const allSubPipeLines: PipeLine[] = [];

    const pipeLineNodes: PipeLine[] = Array.from(pipeLinePathNodes(pipeLine));

    for (const node of pipeLinePathNodes(pipeLine)) {

        const nextTarget = node.next;
        if (!pipeLineNodes.includes(nextTarget) && nextTarget !== pipeLine) {
            node.next = null;
        }
    }
}

function runPipeline(pipeLineId: string, pipeLinePool: PipeLinesDict, pipeLineResults: Record<string, any> = {}) {
    const pipeLine = pipeLinePool[ pipeLineId ];

    //Deep clone (not good performance, but should work)
    const clonedPipeLine = structuredClone(pipeLine);

    //Prevent graph from escaping pipeline through a next value pointing to another pipeline (that is not a part of this pipeline)
    clearPipelineEscapeEdges(clonedPipeLine);

    return runWithPipeline(pipeLine, pipeLineResults);
}


/*export async function graphRunner(pipeLine: PipeLine, input: any): Promise<any> {
    const startNode = getNode(getArrayFrom(pipeLine.start), pipeLine.process);
    const endNode = getNode(getArrayFrom(pipeLine.next));

    for await (const result of endNode.read()) {
        yield result;
    }

    await startNode.run();
}

export async function graphRunner(pipeLine: PipeLine, input: any, meta: any, registerResult: any): Promise<any> {
    const transformedInput = pipeLine.process(input);

    //parent stack
    meta.nodeCallStack.push(pipeLine.id);
    //this stack
    const pipeLineStack = [];

    const startTargetNodes: PipeLine[] | undefined = getArrayFrom(pipeLine.start);

    //const sendNextNodes: SingleOrArray<PipeLine> | undefined = pipeLine.start;
    //const nextNode;

    //meta.nodeCallStack.push(pipeLine.id);

    const meta = {
        nodeCallStack: []
    };

    const startBranchResults: any[] = [];
    const collectedNextResults: any[] = [];

    if (startTargetNodes) {
        for (const targetNode of startTargetNodes) {
            const branchResult = await graphRunner(targetNode, transformedInput, meta);

            if (targetNode.next === this) {
                collectedNextResults.push(branchResult);
            }

            startBranchResults.push(branchResult);
        }
    }

    const nextNodes: PipeLine[] | undefined = getArrayFrom(pipeLine.next);

    if (!pipeLine.next && isTargetPipeLine(pipeLine.id)) {
        return startBranchResults;
    }

    const nextBranchResults: any[] = [];
    if (nextNodes) {
        for (const nextNode of nextNodes) {
            const nextResult = await graphRunner(nextNode, transformedInput, meta);
            nextBranchResults.push(nextResult);
        }
    }

    //Next forwards the results of the processing - if next value is not set and
    //pipeLine is not a part of another stage (that was marked to be processed) then
    //return result (this way a pipeline can be called directly)



    return startBranchResults;
}*/



//
/*for await (const result of startProcessRun({} as PipeLine, [ './package.json', './somebigbinary' ])) {

}*/

//Dir processing: return when the full dir has been processed.

//Only return the stuff that makes it to the 'next' node
//Fishish all processing before returning.


/*export async function process(input: any, options: any): Promise<any> {

        let graph = options.graph;
        if (!graph) {
            graph = getDefaultBaseGraph(options);
        }

        return await processWithTargeted(input, graph);
    }*/

//Provides options from where one options is selected
/*export class ForkProcessingPipeLine implements PipeLine {
    pipeLineOptions;
}

//Has several stages through which the data is passed through
export class StagesProcessingPipeLine {
}*/


/*let processingFn: any = null;
    if (typeof pipeLine === 'function') {
        processingFn = pipeLine;
    }
    else if (typeof pipeLine === 'object') {
        //If 'isTargetOf' is not defined it is true by default
        if (!pipeLine.isTargetOf || pipeLine.isTargetOf(input)) {

            processingFn = pipeLine.process;
        }
    }

    //Not proper yet -> if one of the 'input' elements fails to process this stops processing
    const processingResult = await multiplyIfArrayAsync(processingFn, input);

    if (typeof pipeLine === 'object') {

        const ;


        if (pipeLine.partialPipeLines) {
            processStages(processingResult, pipeLine.partialPipeLines);
        }
        if (pipeLine.nextAfter) {
            processStages(processingResult, pipeLine.nextAfter);
        }
    }

    return processingResult;*/

//return undefined;

/*export function processWithPipeLine<Input>(input: Input, processingPipeLine: PipeLine<Input, any>): any {

    //const pipelineStages: PipeLine[] = processingPipeLine.getpartialPipeLines();

    if (!processingPipeLine) {
        return input;
    }

    let currentPipeLineStage: PipeLine<any, any> = processingPipeLine;

    let currentStageInput: any = input;
    let currentStageOutput = '';

    do {
        currentStageOutput = currentPipeLineStage.process(currentStageInput);
        currentStageInput = currentStageOutput;
        currentPipeLineStage = currentPipeLineStage.next;

    } while (processingPipeLine.next);

    return currentStageOutput;
};



//Each PipeLine can be a stage itself (recursive definition / abstraction of stages)

export class ProcessingPipeLine<Input, Output> implements PipeLine<Input, Output> {

    //private stages: IPipeLineStage[] = [];
    private id?: string;
    next: PipeLine<Output, any>;

    constructor (next: PipeLine<any, any>, id?: string) {
        this.id = id;
        this.next = next;
    }
    getpartialPipeLines(): PipeLine<any, any>[] {
        throw new Error("Method not implemented.");
    }
    abstract isTarget(input: string): boolean;

    process(input: Input): Output {
        return processWithPipeLine(input, this);
    }


    public render(input: Input): Output {
        return renderWithPipeLine(input, this);
    };
}*/

//Can be either a complex PipeLine class/dict or simply a processing function mapping input to output;
//export type PipeLineEntry = PipeLine | ProcessingFunction;

//export type PipeLinesDict = Record<string, PipeLineEntry>;

//Javascript @ < ES2015 not supported as object/record key order is no guaranteed (https://stackoverflow.com/questions/5525795/does-javascript-guarantee-object-property-order)
//export type PipeLinesDict = Record<string, PipeLine>;

/*export interface PipeLine {
    id?: string;
    //What pipelines are part of this stage
    subchain?: PipeLinesDict;
    branches?: PipeLinesDict;
    //What is the next step after this conceptual unit has processed the input
    next?: PipeLineEntry | Array<PipeLineEntry>;

    process: ProcessingFunction;
    isTargetOf?(input: any): Promise<boolean>;
}*/
