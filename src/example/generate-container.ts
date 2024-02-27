import { ArgumentParser } from 'argparse';

export interface IContainerGenerator {
    render: (inputPath: string) => string;
}
export interface PipeLine {
    getStages(): IPipeLineStage[];
}




function main() {
    const parser = new ArgumentParser({
        description: 'Generated a populated container from a template'
    });

    parser.add_argument('source', { help: 'Source path to consume' });
    parser.add_argument('target', { help: 'Target path to write to' });

    const args: any = parser.parse_args();
}

if (require.main?.filename === __filename) {
    const testRender = main;
    console.log(testRender);
}
