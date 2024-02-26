export interface IPipelineStage {
    render: (input: string) => string;
}
export interface IProcessingPipeline {
    getStages(): IPipelineStage[];
}

export function renderWithPipeline(input: string, processingPipeline: ProcessingPipeline): string {

    const pipelineStages: IPipelineStage[] = processingPipeline.getStages();

    let currentStageInput = input;
    let currentStageOutput = '';

    for (const stage of pipelineStages) {
        currentStageOutput = stage.render(currentStageInput);
        currentStageInput = currentStageOutput;
    }

    return currentStageOutput;
};

//Each Pipeline can be a stage itself (recursive definition / abstraction of stages)

export class ProcessingPipeline implements IProcessingPipeline, IPipelineStage {

    private stages: IPipelineStage[] = [];
    private id?: string;

    constructor (stages: IPipelineStage[], id?: string) {
        this.stages = stages;
        this.id = id;
    }

    public getStages(): IPipelineStage[] {
        return this.stages;
    }

    public render(input: string): string {
        return renderWithPipeline(input, this);
    };
}



