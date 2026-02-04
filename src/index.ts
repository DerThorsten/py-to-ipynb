function extractTopDocstring(source: string) {
    const trimmed = source.trimStart();

    const match = trimmed.match(
        /^(?:'''|""")([\s\S]*?)(?:'''|""")/
    );

    if (!match) {
        return null;
    }

    const fullMatch = match[0];
    const content = match[1];

    console.log("Extracted docstring content:", content,"end of content");

    // Convert underline-style headers to markdown headers
    let markdown = content
        .replace(/^\n|\n$/g, "");
    
    // Handle symmetric underlines (above and below)
    markdown = markdown.replace(/^([=\-]+)\n(.+)\n([=\-]+)\n/g, (_, underline1, text, underline2) => {
        if (underline1[0] === underline2[0]) {
            const char = underline1[0];
            const level = char === "=" ? "#" : "##";
            return `${level} ${text}\n`;
        }
        return `${text}\n`;
    });
    
    // Handle single underline (below)
    markdown = markdown.replace(/\n(.+)\n([=\-]+)\n/g, (_, text, underline) => {
        const char = underline[0];
        const level = char === "=" ? "#" : "##";
        return `\n${level} ${text}\n`;
    });
    
    // Convert reStructuredText inline links to markdown links
    // Format: `text <url>`_ -> [text](url)
    markdown = markdown.replace(/`([^<]+)\s+<([^>]+)>`_/g, (_, text, url) => {
        return `[${text}](${url})`;
    });

    return {
        markdown,
        rest: source.slice(
            source.indexOf(fullMatch) + fullMatch.length
        )
    };
}




function isMarkdownCellStart(line: string): boolean {
    // check if the trimmed line only contains # characters, at least 20
    const trimmed = line.trim();
    if(/^#{20,}$/.test(trimmed)){
        return true;
    }
    // check if the trimmed line starts with #%% or # %%
    if(trimmed.startsWith("# %%") || trimmed.startsWith("#%%")){
        return true;
    }
    return false;
}

function splitInBlocks(source: string): {lines: string[], type: string}[] {
    
    // split into lines 
    const lines = source.replace(/\r\n/g, "\n").split("\n");
    let isCurrentMarkdown = false;

    let blocks : {lines: string[], type: string}[] = [];
    let currentBlock: {lines: string[], type: string} = {lines: [], type: isCurrentMarkdown ? "markdown" : "code"};


    for(let i=0; i<lines.length; i++) {
        if(!isCurrentMarkdown){
            // check if this line indicates start of markdown cell
            if(isMarkdownCellStart(lines[i])){
                isCurrentMarkdown = true;
                // start new block
                if(currentBlock.lines.length > 0){
                    blocks.push(currentBlock);
                }
                currentBlock = {lines: [], type: "markdown"};
            }
            else{
                currentBlock.lines.push(lines[i]);
            }
        }
        else{
            // check if this line indicates end of markdown cell
            if(lines[i].trim() === ""){
                isCurrentMarkdown = false;
                // start new block
                if(currentBlock.lines.length > 0){
                    blocks.push(currentBlock);
                }
                currentBlock = {lines: [], type: "code"};
            }
            else{
                currentBlock.lines.push(lines[i]);
            }
        }
    }
    // push last block
    if(currentBlock.lines.length > 0){
        blocks.push(currentBlock);
    }
    return blocks;
}

function rstToMarkdown(lines: string[]): string[] {
    const markdownLines: string[] = [];
    let i = 0;

    while (i < lines.length) {
        let line = lines[i];

        // Check for underline-style headers
        if (i + 1 < lines.length) {
            const nextLine = lines[i + 1];
            if (/^=+$/.test(nextLine.trim())) {
                // Level 1 header
                markdownLines.push(`# ${line.trim()}`);
                i += 2;
                continue;
            } else if (/^-+$/.test(nextLine.trim())) {
                // Level 2 header
                markdownLines.push(`## ${line.trim()}`);
                i += 2;
                continue;
            }
        }

        // Convert reStructuredText inline links to markdown links
        // Format: `text <url>`_ -> [text](url)
        line = line.replace(/`([^<]+)\s+<([^>]+)>`_/g, (_, text, url) => {
            return `[${text}](${url})`;
        });

        markdownLines.push(line);
        i++;
    }

    return markdownLines;
}

export function pyToIpynb(source: string) {
    const cells: any[] = [];
    const doc = extractTopDocstring(source);

    if (doc) {
        cells.push({
        cell_type: "markdown",
        metadata: {},
        source: doc.markdown
            .split("\n")
            .map(l => l + "\n")
        });

        source = doc.rest;
    }

    const blocks = splitInBlocks(source);

    for (const block of blocks) {
        if (block.type === "markdown") {
            cells.push({
                cell_type: "markdown",
                metadata: {},
                source: block.lines
                    .map(l => l.replace(/^#\s?/, "") + "\n")
            });
        } else {
            // process code block
            // convert any rst in comments to markdown
            const processedLines = rstToMarkdown(block.lines);
            cells.push({
                cell_type: "code",
                execution_count: null,
                metadata: {},
                outputs: [],
                source: processedLines
                    .map(l => l + "\n")
            });
        }
    }

    return {
        nbformat: 4,
        nbformat_minor: 0,
        metadata: {
            kernelspec: {
                name: "python3",
                display_name: "Python 3"
            },
            language_info: {
                name: "python",
                version: "3.x"
            }
        },
        cells
    };  
}