








function getStyleContent() {
    return `
        h1 {
            background: blue;
            font-size: 20px;
        }
    `;
}

export const data = {
    //Can be inflated by itself (does not need parent)
    standalone: true,
    parent: '',
    inherit: 'abstractcomponent'
};

export const defaults = {
    text: 'My sample text',
    topClass: 'mycls',
};


export function id() {
    return `sample-component`;
}

export function style() {
    return {
        content: getStyleContent(),
        scope: 'local' //local (this/self -> gets prefix), global (eg. head), 'id' collect at selected ancestor layour with id (nextup/next (a parent layout that is marked for style collection))
    };
}

export function render(data: any) {
    return `
        <h1>{{data.text}}</h1>
        <p>{{data.topClass}}</p>
    `;
}



export const sampleData: any = {
    text: 'organization',
    //topClass: undefined,
    //noText: false,
    topClass: 'richlogo'
};
if (require.main?.filename === __filename) {
    const testRender = render(sampleData);
    console.log(testRender);
}