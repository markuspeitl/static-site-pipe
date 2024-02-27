import { mergePropsToArray, multiplyIfArrayAsync, Nullable } from './utils/util';

export type ProcessingFunction = (input: any) => any;
//Can be either a complex PipeLine class/dict or simply a processing function mapping input to output;
export type PipeLineEntry = PipeLine | ProcessingFunction;

//export type PipeLinesDict = Record<string, PipeLineEntry>;

//Javascript @ < ES2015 not supported as object/record key order is no guaranteed (https://stackoverflow.com/questions/5525795/does-javascript-guarantee-object-property-order)
export type PipeLinesDict = Record<string, PipeLine>;

export interface PipeLine {
    id?: string;
    //What pipelines are part of this stage
    subchain?: PipeLinesDict;
    branches?: PipeLinesDict;
    //What is the next step after this conceptual unit has processed the input
    next?: PipeLineEntry | Array<PipeLineEntry>;

    process: ProcessingFunction;
    isTargetOf?(input: any): Promise<boolean>;
}
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