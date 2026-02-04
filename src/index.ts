function splitCommentSections(block: string[]): string[][] {
    // Only split if there's a multi-line comment block (pure comments) surrounded by code
    // Single comment lines mixed in code should NOT be split
    
    const result: string[][] = [];
    let current: string[] = [];
    let lastWasCode = false;
    
    let commentBlockStart = -1;
    let inCommentBlock = false;
    let commentLineCount = 0;
    
    for (let i = 0; i < block.length; i++) {
        const line = block[i];
        const isComment = line.trim().startsWith("#");
        const isEmpty = line.trim() === "";
        
        if (isEmpty) {
            current.push(line);
            if (inCommentBlock && !isComment) {
                // Comment block might be ending
            }
            continue;
        }
        
        if (isComment) {
            if (!inCommentBlock && lastWasCode) {
                commentBlockStart = i;
                inCommentBlock = true;
                commentLineCount = 0;
            }
            if (inCommentBlock) {
                commentLineCount++;
            }
            current.push(line);
        } else {
            // This is code
            if (inCommentBlock && commentLineCount >= 2) {
                // We have a multi-line comment block - split it out
                const commentEnd = current.findLastIndex(l => l.trim().startsWith("#"));
                const beforeComments = current.slice(0, commentBlockStart);
                const commentLines = current.slice(commentBlockStart, commentEnd + 1);
                
                if (beforeComments.some(l => l.trim() !== "")) {
                    result.push(beforeComments);
                }
                if (commentLines.some(l => l.trim() !== "")) {
                    result.push(commentLines);
                }
                current = [line];
            } else {
                // Single comment line or no comment - keep with code
                current.push(line);
            }
            inCommentBlock = false;
            commentBlockStart = -1;
            commentLineCount = 0;
            lastWasCode = true;
        }
    }
    
    if (current.length > 0 && current.some(l => l.trim() !== "")) {
        result.push(current);
    }
    
    return result.length > 0 ? result : [block];
}

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








    const lines = source.replace(/\r\n/g, "\n").split("\n");

    const blocks: string[][] = [];
    let current: string[] = [];

    for (const line of lines) {
        if (line.startsWith("# %%")) {
            if (current.length) blocks.push(current);
            current = [];
        } else {
            current.push(line);
        }
    }
    if (current.length) blocks.push(current);

    // Further split blocks that have comment sections surrounded by code
    const refinedBlocks: string[][] = [];
    for (const block of blocks) {
        const subBlocks = splitCommentSections(block);
        refinedBlocks.push(...subBlocks);
    }

    cells.push(...refinedBlocks.map(block => {
        const isMarkdown = block.every(
        l => l.trim().startsWith("#") || l.trim() === ""
        );

        if (isMarkdown) {
        return {
            cell_type: "markdown",
            metadata: {},
            source: block.map(l => {
                // Remove leading "# " or "#"
                const stripped = l.replace(/^#+ ?/, "");
                // Skip lines that were only "#" symbols
                if (stripped === l && l.trim() !== "" && !l.trim().startsWith("#")) {
                    return l + "\n";
                }
                // If line was only "#" symbols, skip it
                if (l.trim() !== "" && /^#+$/.test(l.trim())) {
                    return "";
                }
                return stripped + "\n";
            })
        };
        }

        return {
        cell_type: "code",
        metadata: {},
        source: block.map(l => l + "\n"),
        execution_count: null,
        outputs: []
        };
    }));
    

    return {
        nbformat: 4,
        nbformat_minor: 5,
        metadata: {
        kernelspec: {
            name: "python3",
            display_name: "Python 3"
        }
        },
        cells
    };
}