import { PipeLine, PipeLineEntry } from "./processing-pipeline";
import { NullableArray, NullableString } from "./utils/util";

export interface GlobalFunctions {
    getPipeLine: (id: string) => PipeLineEntry;
    getNewPipeLine: (id: string) => PipeLine;
    addPipeLine(pipeLine: PipeLine, id?: string): string;
}

export interface GlobalInstances {
    fsProvider: IResourceProvider;
}

export type GlobalConfig = GlobalFunctions & GlobalInstances;

//Dependency injection as a means to abstract filesystem (for non node environments or if the files are stored remotely)
export interface IResourceProvider {
    getNodeResources(ancestorNodeResourceUri: NullableString): Promise<NullableArray<string>>;
    //readFile(filePath: string): Promise<string>;
    readResource(resourceUri: NullableString): Promise<NullableString>;
    isResourceUri(resourceUri: NullableString): Promise<boolean>;
    exists(resourceUri: NullableString): Promise<boolean>;
    //writeFile(path: string, content: string);
    //watchDirForChanges(dirPath: string);
}