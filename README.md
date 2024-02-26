## IO types:
- In file --> Out Processed file (1/1 relationship)
- In multiple files -> Out processed file  (n/1 relationship)
- One file -> multiple processed files (1/n relationship)

Simplification: Only provide n/1 relationships through hierarchical means
-> there needs to be a parent -> converts it to 1/1 or 1/n relationships

## Processing levels/types:
- Application level 
    (perform all processing operations on a configured input)
- Directory level
    process a directory to output
- File level
    process a file to one or more output files
- Content/Data level
    process input content or data to output content
- Partial level
    process a part of the input content

Every processing type can be considered a pipeline!

## Templating:
typescript templates only.

### Types:
- Standalone: Can be combined with data and rendered as is:
```
<sample-component>
    <h1>My sample content of component</h1>
</sample-component>
```

```
<stack-view>
    <div class="container">
        <img></img>
        <div class="overlay"></div>
    </div>
</stack-view>
```
**stack-view** is a pseudo container that can modify
child contents (reverse elements, add class, permutate contents, add local style)


```
<mark-down>
    
    # This is a heading

    Lorem ipsum color aposf
    spdogp sodgkü

</mark-down>
```

The markdown renderer is not something special but an actual template component
-> can be used with custom tag from <html>

Combination:
Can return template from template:
Resolve/Inflate template until no template is found anymore

```
render(){
    return `
        <mark-down>
            #something
        <mark-down>
    `
}
```

```njk
{{markdown}}

{{/markdown}}
```

```
<tags select="section">
    {{section}}
</tags>
```
Reference to rendered elements (multiple)

```
<tag-section>
    <mark-down>
        # Section title
    <mark-down>
    <tag-section-content />
</tag-section>
```
dynamic keyword renderers
In this case applies the

**Explicitly**
```html
    <each data="getRenderedTagCollection('section')">
        <mark-down>
            # Section title
        <mark-down>
        <section-component content="data" />
    </each>
```

``getRenderedTagCollection('section')`` is passed as data to the
'each' component (the data property should be for special cases only -> what we really want is to pass raw content into the components
can the parse/select the data we want need)

#### Example expandable FAQ list:
```
<listify>
    # What is SSP?
        Static site piplines is a simple site generator that can be adapted to any of your needs
        and follows as use as library, ultilitarian and modular approach, instead of being opinionated.
    # What else?
        Second list item expandable content
</listify>
```

#### The each component
```javascript
render(data, scope, dataProvider){
    const sectionList = []
    for (cont section of scope.data){

        render(data.content, scope = {
            'data': section
        })
    }
    return sectionList.join('\n')
}
```


```javascript
render(data, dataProvider){

    const renderedSections = dataProvider.getRenderedTagCollection('section')

    const sectionList = []
    for (cont renderedSection of renderedSections){
        sectionList.push(
            `
                <mark-down>
                    # Section title
                <mark-down>
                <section-component>
                    {{renderedSection}}
                </section-component>
            `
        )
    }
    return sectionList.join('\n')
}
```

HTML + component centric


``{{tag-content}}`` syntax is irrelevant when using
custom html tags, because writing ``<tag-content />`` is just the same amount of work


Components can have:
- No content (everything is inflated from explicitly passed data, or statically)
- Content that is placed within the component


## Should be isomorphic javascript:
- Static build time render 'nodejs'
- Default render on nodejs server (uses 'fs', 'chokidar', .etc)
- Renderer on client/browser (use cache or http requests to fetch templates/contents)

On demand renderer should be enabled by default, when not debugging (build page on request).
Dynamic rendering -> use it like a template engine with mutable data. (cache n page permutations or disable cache).


## Typescript template rendering should be portable
(move runtime + templates to different project/platform and start inflating)




# Render interface

Option1:
``render(data, scope, dataProvider)``
scope - contains current context:
- content - what is within the tag (if the content contains variables then this data should be passed in scope as well)
- dataProvider - service for side chaining data (example for global data that is not passed)
should this even be in render??

What does a component need in order to render:
- Content - optional what is passed between open and close tags
- Data scope - explicitly passed variables and data
- Sub renderers - renderers of any elements that are passed as content OR used in th render function.

#### Incremental rendering:
The main way to render subcomponents is to add the elements in the
resulting html.
Then the caller detects that there are unresolved components in the result,
finds the corresponding renderer and renders that partial.
Effectively the rendering is flip-flopping between the renderers and the caller and 
elements are incrementally refined.
-> the renderers do not need to know anything about other renderers apart from their tag name.
+ good for dynamic loading

``render(scope, content?)``

## Resolving urls, paths, .etc?

Options:

```html
<img src="{{ url-for /assets/img/testimg.jpg }}">

<img src="<url-for>/assets/img/testimg.jpg</url-for>">

<url-for>/assets/img/testimg.jpg</url-for>
<img src="url-for">

<url-for data-id='imgid'>/assets/img/testimg.jpg</url-for>
<img src="imgid">
```

I like the idea of having pseudo elements in the attributes for processing. (handlebars syntax looks a bit cleaner though)

2nd option is to locally bind the last pseudo element to a local scope variable that can be referenced.


### Even better
define a global attribute transformer function that maps all detected and existing input paths to output urls
that are not escaped in some way.

```
//Might contain components (as soon as it is encountered)
addAttributeTransformer(tag, attribute, (attributeValue, scope) => {
    if(hasRenderable(attributeValue)){
        render(attributeValue, scope)
    }
});

//Fully evaluated attribute (as soon as value is evaluated)
addRenderedAttributeTransformer(tag, attribute, (attributeValue, scope) => {
    return mapInputToOutputPath(attributeValue)
});

//Add pseudo component <url-for> to all
addAttributeTransformer('img,source,href', 'src', (attributeValue, scope) => {
    return wrapContent('url-for', attributeValue)
});
```

### 2. Incremental rendering
Inline data in html.
Each render pass creates a valid html.
- The first pass populates data
- The rest of the passes 




## Inplace site:
Paths to static resources are relative to the input directories
-> we could for development render the site in place with a dev server and not dynamically
resolve the output.
-> then in production map input dirs to output

Advantage: Site can be rendered without requiring global content (input and output dirs)


## Components
are somewhat similar to https://kinsta.com/blog/web-components/ ,
but have less features.
The reason for this is that web-components have quite a bit of boilerplate as they
also support dynamic features on the dom element itself (attribute watching)
Adding (template) content passed from the parent also has a lot of additional information.
(slots, slot names, templates, slotting in of content)

Transpiling nunchucks, liquid, or other templating languages to these component
is possible