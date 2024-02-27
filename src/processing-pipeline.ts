/*export interface IPipelineStage {
    //render: (input: string) => string;
    render(input: string): string;
}*/
/*export interface IProcessingPipeline<Input, Output> {
    id?: string;
    //getpartialPipelines(): IProcessingPipeline<any, any>[];
    isTarget(input: string): boolean;
    process(input: Input): any;
    next: IProcessingPipeline<Output, any>;
}*/

import { mergePropsToArray, multiplyIfArrayAsync } from "./util";

/*export function processWithPipeline<Input>(input: Input, processingPipeline: IProcessingPipeline<Input, any>): any {

    //const pipelineStages: IProcessingPipeline[] = processingPipeline.getpartialPipelines();

    if (!processingPipeline) {
        return input;
    }

    let currentPipelineStage: IProcessingPipeline<any, any> = processingPipeline;

    let currentStageInput: any = input;
    let currentStageOutput = '';

    do {
        currentStageOutput = currentPipelineStage.process(currentStageInput);
        currentStageInput = currentStageOutput;
        currentPipelineStage = currentPipelineStage.next;

    } while (processingPipeline.next);

    return currentStageOutput;
};



//Each Pipeline can be a stage itself (recursive definition / abstraction of stages)

export class ProcessingPipeline<Input, Output> implements IProcessingPipeline<Input, Output> {

    //private stages: IPipelineStage[] = [];
    private id?: string;
    next: IProcessingPipeline<Output, any>;

    constructor (next: IProcessingPipeline<any, any>, id?: string) {
        this.id = id;
        this.next = next;
    }
    getpartialPipelines(): IProcessingPipeline<any, any>[] {
        throw new Error("Method not implemented.");
    }
    abstract isTarget(input: string): boolean;

    process(input: Input): Output {
        return processWithPipeline(input, this);
    }


    public render(input: Input): Output {
        return renderWithPipeline(input, this);
    };
}*/


export type ProcessingFunction = (input: any) => any;
//Can be either a complex Pipeline class/dict or simply a processing function mapping input to output;
export type PipeLineEntry = IProcessingPipeline | ProcessingFunction;
export type PipeLineGraph = Record<string, PipeLineEntry>;

export interface IProcessingPipeline {
    id?: string;
    isTargetOf?(input: any): Promise<boolean>;
    process: ProcessingFunction;

    //What pipelines are part of this stage
    partialPipelines?: PipeLineGraph;
    //What is the next step after this conceptual unit has processed the input
    nextAfter?: PipeLineEntry;
}


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


async function callPipelineProcess(input: any, pipeLine: PipeLineEntry): Promise<any> {
    let processingFn: any = null;
    if (typeof pipeLine === 'function') {
        processingFn = pipeLine;
    }
    else if (typeof pipeLine === 'object') {
        //If 'isTargetOf' is not defined it is true by default
        if (!pipeLine.isTargetOf || await pipeLine.isTargetOf(input)) {

            processingFn = pipeLine.process;
        }
    }
    //Not proper yet -> if one of the 'input' elements fails to process this stops processing
    const processingResult = await multiplyIfArrayAsync(processingFn, input);
    return processingResult;
}

async function processWithPipeline(input: any, pipeLine: PipeLineEntry): Promise<any> {

    if (!pipeLine) {
        return input;
    }

    const processingFnsStack: PipeLineEntry[] = mergePropsToArray(pipeLine, [ '', 'partialPipelines', 'nextAfter' ]);

    if (!processingFnsStack) {
        return input;
    }

    if (processingFnsStack.length <= 1) {
        return await callPipelineProcess(input, pipeLine);
    }

    return await processStages(input, processingFnsStack);


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


        if (pipeLine.partialPipelines) {
            processStages(processingResult, pipeLine.partialPipelines);
        }
        if (pipeLine.nextAfter) {
            processStages(processingResult, pipeLine.nextAfter);
        }
    }

    return processingResult;*/

    //return undefined;
}

//Select sub pipeline to process through isTargetOf (branching)
async function processWithTargeted(input: any, pipeLineOptions: PipeLineGraph): Promise<any> {
    for (const pipeLineId in pipeLineOptions) {
        return processWithPipeline(input, pipeLineOptions[ pipeLineId ]);
        /*if (result) {
            return result;
        }*/
    }
    return input;
}

//Chain sub pipelines in series to get pipeline result
function processStages(input: any, pipeLineStages: PipeLineEntry[]) {
    return processOutputToInput(input, pipeLineStages, processWithPipeline);
}

export async function processWithPipelineGraph(input: any, graph: PipeLineGraph, options: any): Promise<any> {
    //let graph = options.graph;
    /*if (!graph) {
        graph = getDefaultBaseGraph(options);
    }*/

    return await processWithTargeted(input, graph);
}

/*export async function process(input: any, options: any): Promise<any> {

        let graph = options.graph;
        if (!graph) {
            graph = getDefaultBaseGraph(options);
        }

        return await processWithTargeted(input, graph);
    }*/

//Provides options from where one options is selected
/*export class ForkProcessingPipeline implements IProcessingPipeline {
    pipeLineOptions;
}

//Has several stages through which the data is passed through
export class StagesProcessingPipeline {
}*/
