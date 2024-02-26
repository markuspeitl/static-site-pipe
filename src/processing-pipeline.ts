/*export interface IPipelineStage {
    //render: (input: string) => string;
    render(input: string): string;
}*/
/*export interface IProcessingPipeline<Input, Output> {
    id?: string;
    //getSubPipelines(): IProcessingPipeline<any, any>[];
    isTarget(input: string): boolean;
    process(input: Input): any;
    next: IProcessingPipeline<Output, any>;
}*/

/*export function processWithPipeline<Input>(input: Input, processingPipeline: IProcessingPipeline<Input, any>): any {

    //const pipelineStages: IProcessingPipeline[] = processingPipeline.getSubPipelines();

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
    getSubPipelines(): IProcessingPipeline<any, any>[] {
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


type ProcessingFunction = (input: any) => any;
//Can be either a complex Pipeline class/dict or simply a processing function mapping input to output;
type PipeLineEntry = IProcessingPipeline | ProcessingFunction;
type PipeLineGraph = Record<string, PipeLineEntry>;

export interface IProcessingPipeline {
    id?: string;
    isTargetOf?(input: string): boolean;
    process: ProcessingFunction;

    //What pipelines are part of this stage
    subPipeLines?: PipeLineGraph;
    //What is the next step after this conceptual unit has processed the input
    nextAfter?: PipeLineEntry;
}


function processOutputToInput(input: any, inputProcessors: any[], processInput: (inputProcessor: any, input: any) => any, skipUndefinedOutput: boolean = true): any {

    if (!inputProcessors || inputProcessors.length === 0) {
        return input;
    }

    let currentInput: any = input;
    let currentOutput = undefined;

    for (const processor of inputProcessors) {
        currentOutput = processInput(processor, currentInput);

        if (currentOutput !== undefined || !skipUndefinedOutput) {
            currentInput = currentOutput;
        }
    }

    return currentOutput;
}

function multiplyIfArray(fn, targetArg: any | any[], ...options: any[]) {

    if (!fn) {
        return undefined;
    }

    if (Array.isArray(targetArg)) {
        return targetArg.map((arg: any) => fn(arg, ...options));
    }

    return fn(targetArg, ...options);

    //fn.apply(null, targetArg)
}

//Chain sub pipelines in series to get pipeline result
function processWithPipeline(input: any, pipeLine: PipeLineEntry): any {

    let processingFn: any = null;
    if (typeof pipeLine === 'function') {
        processingFn = pipeLine;
    }
    else if (typeof pipeLine === 'object') {
        //If 'isTargetOf' is not defined it is true by default
        if (!pipeLine.isTargetOf || pipeLine.isTargetOf(input)) {

            processingFn = pipeLine.process;
        }
    }

    return multiplyIfArray(processingFn, input);
    //return undefined;
}

//Select sub pipeline to process through isTargetOf (branching)
function processWithTargeted(input: any, pipeLineOptions: PipeLineGraph) {
    for (const pipeLineId in pipeLineOptions) {
        const result = processWithPipeline(input, pipeLineOptions[ pipeLineId ]);
        if (result) {
            return result;
        }
    }
    return input;
}

function processStages(input: any, pipeLineStages: IProcessingPipeline[]) {
    return processOutputToInput(input, pipeLineStages, processWithPipeline);
}

const basePipelineOptions: PipeLineGraph = {
    dir: {
        id: 'dir',
        isTargetOf: () => true,
        process: () => ''
    },
    file: {
        id: 'file',
        isTargetOf: () => true,
        process: () => ''
    },
    template: {
        id: 'template',
        isTargetOf: () => true,
        process: () => ''
    }
};


//Dependency injection as a means to abstract filesystem (for non node environments or if the files are stored remotely)
interface IFsProvider {
    getFiles(dirPath: string): string[];
}

function getDirToFilesPipeline(fsProvider: any): PipeLineEntry {
    const dirPipeLine = basePipelineOptions.dir;

    if (typeof dirPipeLine === 'object' && dirPipeLine.subPipeLines !== undefined) {
        dirPipeLine.subPipeLines.walk = (input: any) => {
            /*fs.walk();*/
            //const files = [ 'somefile', input ];

            return fsProvider.getFiles(input);

            //return files;
        };
        dirPipeLine.subPipeLines.print = (input: any) => {
            console.log(input);
            return input;
        };
    }

    return dirPipeLine;
}

function buildBaseGraph(options: any): PipeLineGraph {
    const pipeLineGraph = basePipelineOptions;
    const dirPipeLine = getDirToFilesPipeline(options.fsProvider);
    if (typeof dirPipeLine === 'object' && dirPipeLine.nextAfter !== undefined) {
        dirPipeLine.nextAfter = pipeLineGraph.file;
    }

    return pipeLineGraph;
}


export async function process(input: any, options: any): Promise<any> {
    const graph = buildBaseGraph(options);
    return await processWithTargeted(input, graph);
}



//Provides options from where one options is selected
/*export class ForkProcessingPipeline implements IProcessingPipeline {
    pipeLineOptions;
}

//Has several stages through which the data is passed through
export class StagesProcessingPipeline {
}*/
