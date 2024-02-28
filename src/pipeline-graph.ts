import { PipeLine, PipeLineProcessor } from "./pipeline-processing";
import { getArrayFrom } from "./utils/util";

export interface IGraphNode extends PipeLineProcessor<any> {
    next?: IGraphNode[] | null | undefined;
}

export interface IEndNode extends IGraphNode {
    data: any | any[] | null;
}

export interface IScopedNode extends IGraphNode {
    start: IGraphNode | null;
    end: IGraphNode | null;
}
export abstract class GraphNode implements IGraphNode {
    next?: IGraphNode[] | null | undefined = [];
    async process(input: any): Promise<any> {
        return input;
    }
    async isTargetOf?(input: any): Promise<boolean> {
        return true;
    };
}


export class EndNode extends GraphNode {
    data: any | any[] | null = null;
    constructor (parentNode: IScopedNode) {
        super();
        /*if (parentNode.next) {
            this.next = parentNode.next;
        }*/
        parentNode.end = this;
    }

    process(input: any): Promise<any | any[] | null> {

        if (!this.data) {
            this.data = input;
        } else if (!Array.isArray(this.data)) {
            this.data = [ this.data ];
        } else {
            this.data.push(input);
        }

        return this.data;
    }
}
export class StartNode extends GraphNode {
    //next?: GraphNode | null | undefined;
    constructor (parentNode: IScopedNode) {
        super();
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



function isScopeNode(node: any | IScopedNode): boolean {
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
export async function runThroughNodeChain(pipeLine: GraphNode, inputData: any) {
    let processedInput: any = pipeLine.process(inputData);

    if (isScopeNode(pipeLine)) {
        processedInput = runGraphNode(pipeLine as IScopedNode, processedInput);
    }

    const nextPipeLineTargets: IGraphNode[] | undefined = (getArrayFrom(pipeLine.next) as IGraphNode[]);
    //const nodeOutput: any[] = [];
    if (nextPipeLineTargets) {
        for (const targetNode of nextPipeLineTargets) {
            const branchNextResult = await runGraphNode(targetNode, processedInput);
            /*if (pipeLineResults) {
                addItemMakeArray(pipeLineResults, targetNode.id, branchNextResult);
            }*/
        }
    }
}

export async function runGraphNode(pipeLineNode: GraphNode, inputData: any) {

    /*if (isEndNode(pipeLineNode)) {
        return (pipeLineNode as EndNode).data;
    }*/

    if (!isScopeNode(pipeLineNode)) {
        return runThroughNodeChain(pipeLineNode, inputData);
    }

    if (!canProcess(pipeLineNode, inputData)) {
        return inputData;
    }

    const node = pipeLineNode as IScopedNode;
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
    const nextAfterEndNodes: IGraphNode[] | null | undefined = endNode?.next;

    if (nextAfterEndNodes) {
        endNode.next = null;
        endNode.data = null;
    }

    //Process path starting from start until termination (processedOutput can be from any node, also not of this subgraph -> !== endNode.data)
    const processedOutput = runGraphNode(startNode, processedInput);

    if (!endNode) {
        return processedOutput;
    }

    if (!nextAfterEndNodes) {
        return endNode?.data;
    }

    //Restore path between endnode and the next path
    endNode.next = nextAfterEndNodes;
    //Start processing in next path
    const nextPathOutput = runGraphNode(endNode, endNode.data);
    //return nextPathOutput;
    return endNode?.data;
}